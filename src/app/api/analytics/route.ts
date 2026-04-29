import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import { jsonOk, requireAdmin } from "@/lib/api-response";

export async function GET() {
  const session = await getSession();
  const auth = requireAdmin(session);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const total = await Lead.countDocuments();

  const byStatus = await Lead.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const byPriority = await Lead.aggregate([
    { $group: { _id: "$priority", count: { $sum: 1 } } },
  ]);

  const agents = await User.find({ role: "agent" }).select("_id name email");

  const agentRows = await Promise.all(
    agents.map(async (agent) => {
      const oid = agent._id as mongoose.Types.ObjectId;
      const assigned = await Lead.countDocuments({ assignedTo: oid });
      const closed = await Lead.countDocuments({
        assignedTo: oid,
        status: "CLOSED",
      });
      const inProgress = await Lead.countDocuments({
        assignedTo: oid,
        status: "IN_PROGRESS",
      });
      return {
        agentId: oid.toString(),
        name: agent.name,
        email: agent.email,
        assignedLeads: assigned,
        closedLeads: closed,
        inProgressLeads: inProgress,
      };
    })
  );

  return jsonOk({
    total,
    byStatus: Object.fromEntries(
      byStatus.map((x) => [x._id, x.count])
    ),
    byPriority: Object.fromEntries(
      byPriority.map((x) => [x._id, x.count])
    ),
    agents: agentRows,
  });
}
