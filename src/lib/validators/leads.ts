import { z } from "zod";
import { LEAD_STATUSES } from "@/models/Lead";

export const leadCreateSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  propertyInterest: z.string().min(1).max(200),
  budget: z.number().positive(),
  notes: z.string().max(5000).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  assignedTo: z.string().optional().nullable(),
  source: z.enum(["FACEBOOK", "WALK_IN", "WEBSITE", "OTHER"]).optional(),
  followUpDate: z.coerce.date().optional().nullable(),
});

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  budget: z.number().positive().optional(),
});

export const leadQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().optional(),
});
