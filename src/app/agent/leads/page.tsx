"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatBudgetPKR } from "@/lib/format";
import { isFollowUpOverdue, isStale } from "@/lib/followup";

type LeadRow = {
  _id: string;
  name: string;
  email: string;
  budget: number;
  status: string;
  priority: string;
  followUpDate?: string | null;
  lastActivityAt?: string | null;
};

export default function AgentLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.status) p.set("status", filters.status);
    if (filters.priority) p.set("priority", filters.priority);
    if (filters.search.trim()) p.set("search", filters.search.trim());
    return p.toString();
  }, [filters]);

  const load = useCallback(async () => {
    const url = qs ? `/api/leads?${qs}` : "/api/leads";
    const r = await fetch(url, { credentials: "include" });
    if (r.ok) {
      const j = (await r.json()) as { leads: LeadRow[] };
      setLeads(j.leads);
    }
  }, [qs]);

  useEffect(() => {
    void load();
    window.addEventListener("crm:refresh", load);
    return () => window.removeEventListener("crm:refresh", load);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My leads</h1>
        <p className="mt-1 text-slate-400">
          Only assignments visible to your account (RBAC).
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <input
          placeholder="Search…"
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
          className="min-w-[160px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Status</option>
          {[
            "NEW",
            "CONTACTED",
            "ASSIGNED",
            "IN_PROGRESS",
            "CLOSED",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) =>
            setFilters((f) => ({ ...f, priority: e.target.value }))
          }
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Priority</option>
          {["HIGH", "MEDIUM", "LOW"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {leads.map((l) => {
              const overdue =
                l.followUpDate &&
                isFollowUpOverdue(new Date(l.followUpDate));
              const staleLead = isStale(
                l.lastActivityAt ? new Date(l.lastActivityAt) : null
              );
              return (
                <tr key={l._id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{l.name}</div>
                    <div className="text-xs text-slate-500">{l.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {formatBudgetPKR(l.budget)}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={l.priority} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {overdue ? (
                      <span className="mr-2 text-rose-400">Overdue</span>
                    ) : null}
                    {staleLead ? (
                      <span className="text-amber-400">Stale</span>
                    ) : null}
                    {!overdue && !staleLead ? (
                      <span className="text-slate-600">—</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/agent/leads/${l._id}`}
                      className="text-emerald-400 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
