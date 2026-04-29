import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import Lead from "@/models/Lead";
import { getSession } from "@/lib/session";
import { jsonError, jsonOk, requireAuth } from "@/lib/api-response";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const auth = requireAuth(session);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid id");
  }

  await connectDB();

  const lead = await Lead.findById(id).select("_id assignedTo").lean();
  if (!lead) return jsonError("Not found", 404);

  if (auth.role === "agent") {
    const aid = lead.assignedTo?.toString();
    if (!aid || aid !== auth.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const activities = await ActivityLog.find({ leadId: id })
    .populate("actorId", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  return jsonOk({ activities });
}
