import { differenceInDays } from "date-fns";

/** Days without touching the lead → stale highlight */
export const STALE_ACTIVITY_DAYS = 7;

export function isFollowUpOverdue(followUpDate: Date | null): boolean {
  if (!followUpDate) return false;
  return followUpDate.getTime() < Date.now();
}

export function isStale(lastActivityAt: Date | null): boolean {
  if (!lastActivityAt) return true;
  return differenceInDays(new Date(), lastActivityAt) >= STALE_ACTIVITY_DAYS;
}
