export function formatBudgetPKR(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 100 ? Math.round(m) : m.toFixed(1)}M PKR`;
  }
  return `${n.toLocaleString("en-PK")} PKR`;
}
