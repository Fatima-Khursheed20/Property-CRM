import mongoose from "mongoose";
import ActivityLog, {
  ACTIVITY_TYPES,
  type ActivityLogDocument,
} from "@/models/ActivityLog";

export async function logActivity(params: {
  leadId: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId | null;
  action: (typeof ACTIVITY_TYPES)[number];
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<ActivityLogDocument> {
  const doc = await ActivityLog.create({
    leadId: params.leadId,
    actorId: params.actorId ?? null,
    action: params.action,
    summary: params.summary,
    meta: params.meta ?? {},
  });

  return doc;
}
