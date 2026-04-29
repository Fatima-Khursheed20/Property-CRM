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
import { leadUpdateSchema } from "@/lib/validators/leads";
import { logActivity } from "@/lib/activity";
import { sendMail, templateAssignment } from "@/lib/email";
import { emitLeadEvent } from "@/lib/socket-emit";
import { rateLimit } from "@/lib/rate-limit";

function agentLimiter(auth: { role: string; sub: string }) {
  if (auth.role === "agent") {
    const rl = rateLimit({
      key: `api:agent:${auth.sub}`,
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

async function loadLeadForUser(
  id: string,
  auth: { role: string; sub: string }
) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const lead = await Lead.findById(id).populate("assignedTo", "name email role");
  if (!lead) return null;
  if (auth.role === "agent") {
    const assigned = lead.assignedTo as unknown as { _id: mongoose.Types.ObjectId } | null;
    const aid = assigned?._id?.toString();
    if (!aid || aid !== auth.sub) {
      return "forbidden" as const;
    }
  }
  return lead;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const auth = requireAuth(session);
  if (auth instanceof NextResponse) return auth;
  const lim = agentLimiter(auth);
  if (lim) return lim;

  const { id } = await ctx.params;
  await connectDB();
  const result = await loadLeadForUser(id, auth);
  if (result === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!result) return jsonError("Not found", 404);
  return jsonOk({ lead: result });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const auth = requireAuth(session);
  if (auth instanceof NextResponse) return auth;
  const lim = agentLimiter(auth);
  if (lim) return lim;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  await connectDB();
  const lead = await Lead.findById(id);
  if (!lead) return jsonError("Not found", 404);

  if (auth.role === "agent") {
    const assigned = lead.assignedTo?.toString();
    if (!assigned || assigned !== auth.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const prevAssigned = lead.assignedTo?.toString() ?? null;
  const prevPriority = lead.priority;
  const prevStatus = lead.status;
  const prevNotes = lead.notes;

  const patch = { ...parsed.data };
  if (auth.role === "agent") {
    delete patch.assignedTo;
  }

  const actorId = new mongoose.Types.ObjectId(auth.sub);

  if (patch.name !== undefined) lead.name = patch.name;
  if (patch.email !== undefined) lead.email = patch.email;
  if (patch.phone !== undefined) lead.phone = patch.phone;
  if (patch.propertyInterest !== undefined)
    lead.propertyInterest = patch.propertyInterest;
  if (patch.notes !== undefined) lead.notes = patch.notes ?? "";

  if (patch.budget !== undefined) {
    const sc = computeLeadScore(patch.budget);
    lead.budget = patch.budget;
    lead.score = sc.score;
    lead.priority = sc.priority;
  }

  if (patch.status !== undefined) lead.status = patch.status;

  if (patch.source !== undefined) lead.source = patch.source;

  if (patch.followUpDate !== undefined) {
    lead.followUpDate = patch.followUpDate;
    await logActivity({
      leadId: lead._id,
      actorId,
      action: "FOLLOW_UP_SET",
      summary: patch.followUpDate
        ? "Follow-up date set"
        : "Follow-up cleared",
      meta: { followUpDate: patch.followUpDate },
    });
  }

  if (patch.assignedTo !== undefined && auth.role === "admin") {
    if (!patch.assignedTo) {
      lead.assignedTo = null;
    } else if (mongoose.Types.ObjectId.isValid(patch.assignedTo)) {
      const oid = new mongoose.Types.ObjectId(patch.assignedTo);
      const agent = await User.findOne({ _id: oid, role: "agent" });
      if (!agent) return jsonError("Assigned user must be an agent");
      lead.assignedTo = oid;
      if (!patch.status) lead.status = "ASSIGNED";
    }
  }

  lead.lastActivityAt = new Date();
  await lead.save();

  const populated = await Lead.findById(lead._id)
    .populate("assignedTo", "name email role")
    .lean();

  if (patch.status !== undefined && prevStatus !== lead.status) {
    await logActivity({
      leadId: lead._id,
      actorId,
      action: "STATUS_CHANGED",
      summary: `Status ${prevStatus} → ${lead.status}`,
      meta: { from: prevStatus, to: lead.status },
    });
  }

  if (patch.notes !== undefined && prevNotes !== lead.notes) {
    await logActivity({
      leadId: lead._id,
      actorId,
      action: "NOTES_UPDATED",
      summary: "Notes updated",
    });
  }

  const priChanged =
    patch.budget !== undefined && lead.priority !== prevPriority;
  if (priChanged) {
    await logActivity({
      leadId: lead._id,
      actorId,
      action: "PRIORITY_CHANGED",
      summary: `Priority → ${lead.priority}`,
      meta: { score: lead.score },
    });
  }

  const newAssigned = lead.assignedTo?.toString() ?? null;
  if (
    auth.role === "admin" &&
    patch.assignedTo !== undefined &&
    newAssigned !== prevAssigned
  ) {
    await logActivity({
      leadId: lead._id,
      actorId,
      action: prevAssigned ? "REASSIGNED" : "ASSIGNED",
      summary: prevAssigned
        ? `Reassigned from ${prevAssigned} to ${newAssigned}`
        : `Assigned to agent ${newAssigned}`,
      meta: { from: prevAssigned, to: newAssigned },
    });

    if (newAssigned && newAssigned !== prevAssigned) {
      const agentUser = await User.findById(newAssigned);
      if (agentUser) {
        await sendMail({
          to: agentUser.email,
          subject: `[Property CRM] Lead assigned: ${lead.name}`,
          html: templateAssignment({
            agentName: agentUser.name,
            leadName: lead.name,
            leadUrl: `${getBaseUrl(req)}/agent/leads/${lead._id.toString()}`,
          }),
        });
      }
    }
  }

  emitLeadEvent("lead:updated", {
    leadId: lead._id.toString(),
    priority: lead.priority,
    assignedTo: newAssigned,
  });

  return jsonOk({ lead: populated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const auth = requireAdmin(session);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  await connectDB();

  const deleted = await Lead.findByIdAndDelete(id);
  if (!deleted) return jsonError("Not found", 404);

  emitLeadEvent("lead:deleted", { leadId: id });

  return jsonOk({ ok: true });
}

function getBaseUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}
