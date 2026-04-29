import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const ACTIVITY_TYPES = [
  "CREATED",
  "STATUS_CHANGED",
  "ASSIGNED",
  "REASSIGNED",
  "NOTES_UPDATED",
  "FOLLOW_UP_SET",
  "PRIORITY_CHANGED",
  "UPDATED",
] as const;

const ActivityLogSchema = new Schema(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
    },
    summary: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ leadId: 1, createdAt: -1 });

export type ActivityLogDocument = InferSchemaType<typeof ActivityLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
