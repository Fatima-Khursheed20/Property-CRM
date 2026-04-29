export function priorityClass(p: string) {
  switch (p) {
    case "HIGH":
      return "bg-rose-500/20 text-rose-300 border border-rose-500/40";
    case "MEDIUM":
      return "bg-amber-500/20 text-amber-200 border border-amber-500/40";
    default:
      return "bg-slate-600/40 text-slate-300 border border-slate-600";
  }
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityClass(priority)}`}
    >
      {priority}
    </span>
  );
}
