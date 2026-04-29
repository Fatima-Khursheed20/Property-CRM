/** Rule-based follow-up hints (bonus “AI-like” suggestions). */

export function suggestFollowUpAction(params: {
  status: string;
  priority: string;
  daysSinceActivity: number;
  hasFollowUp: boolean;
}): string {
  if (params.status === "CLOSED") {
    return "Lead closed — archive or reopen only if client returns.";
  }
  if (!params.hasFollowUp && params.daysSinceActivity >= 2) {
    return "Schedule a follow-up date so this lead stays on your radar.";
  }
  if (params.priority === "HIGH" && params.daysSinceActivity >= 1) {
    return "High priority — reach out today with property options.";
  }
  if (params.daysSinceActivity >= 7) {
    return "No activity for a week — send a WhatsApp check-in.";
  }
  return "Keep momentum: confirm budget and preferred locality.";
}
