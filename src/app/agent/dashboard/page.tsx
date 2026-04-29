"use client";

import Link from "next/link";
import { differenceInDays } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatBudgetPKR } from "@/lib/format";
import { isFollowUpOverdue, isStale } from "@/lib/followup";
import { suggestFollowUpAction } from "@/lib/suggestions";

type LeadRow = {
  _id: string;
  name: string;
  email: string;
  status: string;
  priority: string;
  budget: number;
  followUpDate?: string | null;
  lastActivityAt?: string | null;
};

export default function AgentDashboardPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/leads", { credentials: "include" });
    if (r.ok) {
      const j = (await r.json()) as { leads: LeadRow[] };
      setLeads(j.leads);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("crm:refresh", load);
    return () => window.removeEventListener("crm:refresh", load);
  }, [load]);

  const metrics = useMemo(() => {
    let overdue = 0;
    let stale = 0;
    const now = new Date();

    for (const l of leads) {
      const fu = l.followUpDate ? new Date(l.followUpDate) : null;
      if (fu && isFollowUpOverdue(fu)) overdue += 1;

      const la = l.lastActivityAt ? new Date(l.lastActivityAt) : null;
      if (isStale(la)) stale += 1;
    }

    const focus =
      leads.find(
        (l) =>
          l.followUpDate && isFollowUpOverdue(new Date(l.followUpDate))
      ) ??
      [...leads].sort((a, b) => b.budget - a.budget)[0];

    const hint =
      focus &&
      suggestFollowUpAction({
        status: focus.status,
        priority: focus.priority,
        daysSinceActivity: focus.lastActivityAt
          ? differenceInDays(now, new Date(focus.lastActivityAt))
          : 999,
        hasFollowUp: Boolean(focus.followUpDate),
      });

    return {
      total: leads.length,
      overdue,
      stale,
      hint,
    };
  }, [leads]);

  const topPriority = [...leads].sort((a, b) => b.budget - a.budget).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Agent workspace</h1>
        <p className="mt-1 text-slate-400">
          Assigned leads only · highlighted follow-ups and stale pipelines.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase text-slate-500">Assigned</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">
            {metrics.total}
          </p>
        </div>
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5">
          <p className="text-xs uppercase text-rose-400">Overdue follow-up</p>
          <p className="mt-2 text-3xl font-semibold text-rose-300">
            {metrics.overdue}
          </p>
        </div>
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-5">
          <p className="text-xs uppercase text-amber-400">Stale (7d no activity)</p>
          <p className="mt-2 text-3xl font-semibold text-amber-200">
            {metrics.stale}
          </p>
        </div>
      </div>

      {metrics.hint ? (
        <div className="rounded-xl border border-sky-900/40 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
          <span className="font-medium text-sky-400">Suggested next step · </span>
          {metrics.hint}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-white">Hot leads</h2>
          <Link
            href="/agent/leads"
            className="text-sm text-emerald-400 hover:underline"
          >
            View all
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-slate-800">
          {topPriority.map((l) => {
            const overdue =
              l.followUpDate &&
              isFollowUpOverdue(new Date(l.followUpDate));
            const staleLead = isStale(
              l.lastActivityAt ? new Date(l.lastActivityAt) : null
            );
            return (
              <li
                key={l._id}
                className={`flex flex-wrap items-center justify-between gap-2 py-3 ${
                  l.priority === "HIGH" ? "border-l-2 border-l-rose-500 pl-3" : ""
                }`}
              >
                <div>
                  <Link
                    href={`/agent/leads/${l._id}`}
                    className="font-medium text-white hover:underline"
                  >
                    {l.name}
                  </Link>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <PriorityBadge priority={l.priority} />
                    <span>{formatBudgetPKR(l.budget)}</span>
                    {overdue ? (
                      <span className="text-rose-400">Follow-up overdue</span>
                    ) : null}
                    {staleLead ? (
                      <span className="text-amber-400">Stale</span>
                    ) : null}
                  </div>
                </div>
                <span className="text-xs text-slate-500">{l.status}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
