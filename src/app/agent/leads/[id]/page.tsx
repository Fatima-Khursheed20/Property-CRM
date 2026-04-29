"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatBudgetPKR } from "@/lib/format";
import { normalizeWhatsAppHref } from "@/lib/whatsapp";
import { suggestFollowUpAction } from "@/lib/suggestions";
import { differenceInDays } from "date-fns";

const STATUSES = [
  "NEW",
  "CONTACTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "CLOSED",
] as const;

type LeadDetail = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  propertyInterest: string;
  budget: number;
  status: string;
  priority: string;
  notes?: string;
  followUpDate?: string | null;
  lastActivityAt?: string | null;
};

type Activity = {
  _id: string;
  action: string;
  summary: string;
  createdAt?: string;
  actorId?: { name?: string } | null;
};

export default function AgentLeadDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [lr, ar] = await Promise.all([
      fetch(`/api/leads/${id}`, { credentials: "include" }),
      fetch(`/api/leads/${id}/activities`, { credentials: "include" }),
    ]);
    if (!lr.ok) {
      setErr("Lead not found");
      return;
    }
    const lj = (await lr.json()) as { lead: LeadDetail };
    setLead(lj.lead);
    if (ar.ok) {
      const aj = (await ar.json()) as { activities: Activity[] };
      setActivities(aj.activities);
    }
    setErr(null);
  }, [id]);

  useEffect(() => {
    void load();
    window.addEventListener("crm:refresh", load);
    return () => window.removeEventListener("crm:refresh", load);
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    const r = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const j = await r.json();
      setErr(typeof j.error === "string" ? j.error : "Update failed");
      return;
    }
    await load();
  }

  if (err || !lead) {
    return (
      <p className="text-rose-400">
        {err ?? "Loading…"}{" "}
        <Link href="/agent/leads" className="text-emerald-400 underline">
          Back
        </Link>
      </p>
    );
  }

  const wa = normalizeWhatsAppHref(lead.phone);
  const daysSince = lead.lastActivityAt
    ? differenceInDays(new Date(), new Date(lead.lastActivityAt))
    : 999;

  const suggestion = suggestFollowUpAction({
    status: lead.status,
    priority: lead.priority,
    daysSinceActivity: daysSince,
    hasFollowUp: Boolean(lead.followUpDate),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/agent/leads"
            className="text-sm text-emerald-400 hover:underline"
          >
            ← My leads
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">{lead.name}</h1>
          <p className="text-slate-400">{lead.email}</p>
        </div>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          WhatsApp
        </a>
      </div>

      <div className="rounded-xl border border-sky-900/40 bg-sky-950/25 px-4 py-3 text-sm text-sky-100">
        <span className="font-medium text-sky-400">Follow-up suggestion · </span>
        {suggestion}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 lg:col-span-2 space-y-4">
          <h2 className="font-medium text-white">Update lead</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Budget (PKR)
              <input
                type="number"
                defaultValue={lead.budget}
                key={lead.budget}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v !== lead.budget)
                    void save({ budget: v });
                }}
              />
            </label>
            <label className="text-xs text-slate-500">
              Status
              <select
                defaultValue={lead.status}
                key={lead.status}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                onChange={(e) => void save({ status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs text-slate-500">
            Notes
            <textarea
              defaultValue={lead.notes ?? ""}
              key={(lead.notes ?? "") + lead._id}
              rows={5}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== (lead.notes ?? "")) void save({ notes: v });
              }}
            />
          </label>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-xs uppercase text-slate-500">Pipeline</p>
            <div className="mt-2">
              <PriorityBadge priority={lead.priority} />
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Interest:{" "}
              <span className="text-slate-300">{lead.propertyInterest}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Budget {formatBudgetPKR(lead.budget)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-xs uppercase text-slate-500">Follow-up reminder</p>
            <input
              type="datetime-local"
              defaultValue={
                lead.followUpDate ? lead.followUpDate.slice(0, 16) : ""
              }
              key={lead.followUpDate ?? ""}
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
              onBlur={(e) => {
                const v = e.target.value;
                void save({
                  followUpDate: v ? new Date(v).toISOString() : null,
                });
              }}
            />
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="font-medium text-white">Activity timeline</h2>
        <ul className="mt-4 space-y-4 border-l border-slate-700 pl-4">
          {activities.map((a) => (
            <li key={a._id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-sky-500" />
              <p className="text-sm text-white">{a.summary}</p>
              <p className="text-xs text-slate-500">
                {a.actorId?.name ?? "System"} ·{" "}
                {a.createdAt
                  ? new Date(a.createdAt).toLocaleString()
                  : ""}{" "}
                · <span className="text-slate-600">{a.action}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
