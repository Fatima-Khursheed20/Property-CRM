import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "CLOSED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type LeadPriority = (typeof PRIORITIES)[number];

const LeadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    propertyInterest: { type: String, required: true, trim: true },
    budget: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "NEW",
    },
    notes: { type: String, default: "" },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    score: { type: Number, required: true },
    priority: {
      type: String,
      enum: PRIORITIES,
      required: true,
    },
    followUpDate: { type: Date, default: null },
    lastActivityAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["FACEBOOK", "WALK_IN", "WEBSITE", "OTHER"],
      default: "OTHER",
    },
  },
  { timestamps: true }
);

LeadSchema.index({ assignedTo: 1, status: 1 });
LeadSchema.index({ priority: 1 });
LeadSchema.index({ createdAt: -1 });

export type LeadDocument = InferSchemaType<typeof LeadSchema> & {
  _id: mongoose.Types.ObjectId;
};

export default mongoose.models.Lead ||
  mongoose.model("Lead", LeadSchema);
