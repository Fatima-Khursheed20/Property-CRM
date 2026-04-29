/** Budget in PKR (same numeric unit as assignment: millions threshold). */

export type PriorityBand = "HIGH" | "MEDIUM" | "LOW";

export interface ScoreResult {
  score: number;
  priority: PriorityBand;
}

/** Rules: >20M PKR → High; 10M–20M → Medium; <10M → Low */
export function computeLeadScore(budgetPkr: number): ScoreResult {
  if (!Number.isFinite(budgetPkr) || budgetPkr < 0) {
    return { score: 0, priority: "LOW" };
  }
  if (budgetPkr > 20_000_000) {
    return { score: 95, priority: "HIGH" };
  }
  if (budgetPkr >= 10_000_000) {
    return { score: 65, priority: "MEDIUM" };
  }
  return { score: 35, priority: "LOW" };
}
