"use client";

import { useCallback, useEffect, useState } from "react";

type Analytics = {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  agents: Array<{
    agentId: string;
    name: string;
    email: string;
    assignedLeads: number;
    closedLeads: number;
    inProgressLeads: number;
  }>;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/analytics", { credentials: "include" });
    if (r.ok) setData(await r.json());
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("crm:refresh", load);
    return () => window.removeEventListener("crm:refresh", load);
  }, [load]);

  const maxStatus = Math.max(
    1,
    ...Object.values(data?.byStatus ?? {}).map((n) => Number(n))
  );
  const maxPri = Math.max(
    1,
    ...Object.values(data?.byPriority ?? {}).map((n) => Number(n))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-slate-400">
          Visual breakdown of statuses, priorities, and agent throughput.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-sm font-medium text-slate-300">Leads by status</h2>
          <div className="mt-6 space-y-3">
            {Object.entries(data?.byStatus ?? {}).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500/80 transition-all"
                    style={{
                      width: `${Math.round((Number(v) / maxStatus) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-sm font-medium text-slate-300">
            Leads by priority
          </h2>
          <div className="mt-6 space-y-3">
            {Object.entries(data?.byPriority ?? {}).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      k === "HIGH"
                        ? "bg-rose-500"
                        : k === "MEDIUM"
                          ? "bg-amber-500"
                          : "bg-slate-500"
                    }`}
                    style={{
                      width: `${Math.round((Number(v) / maxPri) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-sm font-medium text-slate-300">
          Agent performance
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                <th className="pb-3">Agent</th>
                <th className="pb-3">Assigned</th>
                <th className="pb-3">In progress</th>
                <th className="pb-3">Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(data?.agents ?? []).map((a) => (
                <tr key={a.agentId}>
                  <td className="py-3">
                    <div className="font-medium text-white">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.email}</div>
                  </td>
                  <td className="py-3 font-mono">{a.assignedLeads}</td>
                  <td className="py-3 font-mono">{a.inProgressLeads}</td>
                  <td className="py-3 font-mono text-emerald-400">
                    {a.closedLeads}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
