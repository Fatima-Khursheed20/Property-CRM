import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import {
  jsonError,
  jsonOk,
  requireAdmin,
  requireAuth,
} from "@/lib/api-response";
import { computeLeadScore } from "@/lib/scoring";
import { leadCreateSchema, leadQuerySchema } from "@/lib/validators/leads";
import { logActivity } from "@/lib/activity";
import { sendMail, templateAssignment, templateNewLead } from "@/lib/email";
import { emitLeadEvent } from "@/lib/socket-emit";
import { rateLimit } from "@/lib/rate-limit";

function applyAgentRateLimit(user: { role: string; sub: string }) {
  if (user.role === "agent") {
    const rl = rateLimit({
      key: `api:agent:${user.sub}`,
      limit: 50,
      windowMs: 60_000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded (agents: 50 requests/minute).",
          retryAfterSec: rl.retryAfterSec,
        },
        { status: 429 }
      );
    }
  }
  return null;
}

export async function GET(req: Request) {
  const session = await getSession();
  const auth = requireAuth(session);
  if (auth instanceof NextResponse) return auth;
  const blocked = applyAgentRateLimit(auth);
  if (blocked) return blocked;

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = leadQuerySchema.safeParse({
    status: raw.status || undefined,
    priority: raw.priority || undefined,
    from: raw.from || undefined,
    to: raw.to || undefined,
    search: raw.search || undefined,
  });
  if (!parsed.success) {
    return jsonError("Invalid query parameters", 422);
  }

  await connectDB();

  const filter: Record<string, unknown> = {};

  if (auth.role === "agent") {
    filter.assignedTo = new mongoose.Types.ObjectId(auth.sub);
  }

  if (parsed.data.status) filter.status = parsed.data.status;
  if (parsed.data.priority) filter.priority = parsed.data.priority;
  if (parsed.data.from || parsed.data.to) {
    filter.createdAt = {};
    if (parsed.data.from)
      (filter.createdAt as Record<string, Date>).$gte = parsed.data.from;
    if (parsed.data.to)
      (filter.createdAt as Record<string, Date>).$lte = parsed.data.to;
  }
  if (parsed.data.search) {
    const q = parsed.data.search.trim();
    filter.$or = [
      { name: new RegExp(q, "i") },
      { email: new RegExp(q, "i") },
      { phone: new RegExp(q.replace(/\D/g, ""), "i") },
    ];
  }

  const leads = await Lead.find(filter)
    .populate("assignedTo", "name email role")
    .sort({ score: -1, createdAt: -1 })
    .lean();

  return jsonOk({ leads });
}

export async function POST(req: Request) {
  const session = await getSession();
  const auth = requireAdmin(session);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  await connectDB();

  const { score, priority } = computeLeadScore(parsed.data.budget);

  let assignedId: mongoose.Types.ObjectId | null = null;
  if (parsed.data.assignedTo) {
    if (!mongoose.Types.ObjectId.isValid(parsed.data.assignedTo)) {
      return jsonError("Invalid assignedTo id");
    }
    assignedId = new mongoose.Types.ObjectId(parsed.data.assignedTo);
    const agent = await User.findOne({
      _id: assignedId,
      role: "agent",
    });
    if (!agent) {
      return jsonError("Assigned user must be an agent");
    }
  }

  let status = parsed.data.status ?? "NEW";
  if (assignedId && !parsed.data.status) {
    status = "ASSIGNED";
  }

  const lead = await Lead.create({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    propertyInterest: parsed.data.propertyInterest,
    budget: parsed.data.budget,
    notes: parsed.data.notes ?? "",
    status,
    assignedTo: assignedId,
    score,
    priority,
    source: parsed.data.source ?? "OTHER",
    followUpDate: parsed.data.followUpDate ?? null,
    lastActivityAt: new Date(),
  });

  await logActivity({
    leadId: lead._id,
    actorId: new mongoose.Types.ObjectId(auth.sub),
    action: "CREATED",
    summary: `Lead created (${priority} priority)`,
    meta: { initialStatus: status },
  });

  await notifyNewLeadEmail({
    leadName: lead.name,
    priority,
    baseUrl: getBaseUrl(req),
  });

  if (assignedId) {
    await notifyAssignmentEmail({
      assignedUserId: assignedId.toString(),
      leadId: lead._id.toString(),
      leadName: lead.name,
      baseUrl: getBaseUrl(req),
    });
  }

  emitLeadEvent("lead:created", {
    leadId: lead._id.toString(),
    priority,
    assignedTo: assignedId?.toString() ?? null,
  });

  const populated = await Lead.findById(lead._id)
    .populate("assignedTo", "name email role")
    .lean();

  return jsonOk({ lead: populated });
}

function getBaseUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

async function notifyNewLeadEmail(opts: {
  leadName: string;
  priority: string;
  baseUrl: string;
}) {
  await connectDB();
  const admins = await User.find({ role: "admin" }).select("email name");
  const extra =
    process.env.ADMIN_NOTIFY_EMAIL?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const emails = new Set<string>([
    ...admins.map((a) => a.email),
    ...extra,
  ]);

  for (const to of emails) {
    await sendMail({
      to,
      subject: `[Property CRM] New lead: ${opts.leadName}`,
      html: templateNewLead({
        leadName: opts.leadName,
        priority: opts.priority,
        dashboardUrl: `${opts.baseUrl}/admin/dashboard`,
      }),
    });
  }
}

async function notifyAssignmentEmail(opts: {
  assignedUserId: string;
  leadId: string;
  leadName: string;
  baseUrl: string;
}) {
  const user = await User.findById(opts.assignedUserId);
  if (!user) return;

  await sendMail({
    to: user.email,
    subject: `[Property CRM] Lead assigned: ${opts.leadName}`,
    html: templateAssignment({
      agentName: user.name,
      leadName: opts.leadName,
      leadUrl: `${opts.baseUrl}/agent/leads/${opts.leadId}`,
    }),
  });
}
