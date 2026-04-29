"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Analytics = {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/analytics", { credentials: "include" });
      const raw = await r.text();
      let j: Analytics;
      try {
        j = JSON.parse(raw) as Analytics;
      } catch {
        setErr("Invalid response from server");
        return;
      }
      if (!r.ok) {
        setErr((j as unknown as { error?: string }).error ?? "Could not load analytics");
        return;
      }
      setData(j);
      setErr(null);
    } catch {
      setErr("Network error");
    }
  }, []);

  useEffect(() => {
    void load();
    function onRefresh() {
      void load();
    }
    window.addEventListener("crm:refresh", onRefresh);
    return () => window.removeEventListener("crm:refresh", onRefresh);
  }, [load]);

  if (err && !data) {
    return (
      <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-4 py-3 text-rose-300">
        {err}
      </p>
    );
  }

  if (!data && !err) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-800/80" />
          ))}
        </div>
        <p className="text-sm text-slate-500">Loading analytics…</p>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const statuses = ["NEW", "CONTACTED", "ASSIGNED", "IN_PROGRESS", "CLOSED"];
  const priorities = ["HIGH", "MEDIUM", "LOW"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin overview</h1>
        <p className="mt-1 text-slate-400">
          Snapshot of pipeline health and workload distribution.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total leads
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            High priority
          </p>
          <p className="mt-2 text-3xl font-semibold text-rose-400">
            {data?.byPriority?.HIGH ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            In progress
          </p>
          <p className="mt-2 text-3xl font-semibold text-amber-400">
            {data?.byStatus?.IN_PROGRESS ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Closed</p>
          <p className="mt-2 text-3xl font-semibold text-slate-200">
            {data?.byStatus?.CLOSED ?? 0}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="font-medium text-white">Status distribution</h2>
          <ul className="mt-4 space-y-2">
            {statuses.map((s) => (
              <li key={s} className="flex justify-between text-sm">
                <span className="text-slate-400">{s.replace("_", " ")}</span>
                <span className="font-mono text-slate-200">
                  {data?.byStatus?.[s] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="font-medium text-white">Priority distribution</h2>
          <ul className="mt-4 space-y-2">
            {priorities.map((p) => (
              <li key={p} className="flex justify-between text-sm">
                <span className="text-slate-400">{p}</span>
                <span className="font-mono text-slate-200">
                  {data?.byPriority?.[p] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-sm text-slate-500">
        Manage leads on{" "}
        <Link href="/admin/leads" className="text-emerald-400 hover:underline">
          Leads
        </Link>{" "}
        · Detailed charts on{" "}
        <Link
          href="/admin/analytics"
          className="text-emerald-400 hover:underline"
        >
          Analytics
        </Link>
      </p>
    </div>
  );
}
