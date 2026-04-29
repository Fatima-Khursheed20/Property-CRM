"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatBudgetPKR } from "@/lib/format";
import { normalizeWhatsAppHref } from "@/lib/whatsapp";

const STATUSES = [
  "NEW",
  "CONTACTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "CLOSED",
] as const;

type AgentOpt = { _id: string; name: string; email: string };

type LeadDetail = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  propertyInterest: string;
  budget: number;
  score: number;
  status: string;
  priority: string;
  notes?: string;
  followUpDate?: string | null;
  assignedTo?: { _id: string; name: string; email: string } | null;
};

type Activity = {
  _id: string;
  action: string;
  summary: string;
  createdAt?: string;
  actorId?: { name?: string; email?: string } | null;
};

export default function AdminLeadDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [agents, setAgents] = useState<AgentOpt[]>([]);
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

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/agents", { credentials: "include" });
      if (r.ok) {
        const j = (await r.json()) as { agents: AgentOpt[] };
        setAgents(j.agents);
      }
    })();
  }, []);

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

  async function remove() {
    if (!confirm("Delete this lead permanently?")) return;
    const r = await fetch(`/api/leads/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (r.ok) router.push("/admin/leads");
  }

  if (err || !lead) {
    return (
      <p className="text-rose-400">
        {err ?? "Loading…"}{" "}
        <Link href="/admin/leads" className="text-emerald-400 underline">
          Back
        </Link>
      </p>
    );
  }

  const wa = normalizeWhatsAppHref(lead.phone);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/leads"
            className="text-sm text-emerald-400 hover:underline"
          >
            ← All leads
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">{lead.name}</h1>
          <p className="text-slate-400">{lead.email}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void remove()}
            className="rounded-lg border border-rose-700 px-4 py-2 text-sm text-rose-400 hover:bg-rose-950/40"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 lg:col-span-2 space-y-4">
          <h2 className="font-medium text-white">Details</h2>
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
            <label className="text-xs text-slate-500 sm:col-span-2">
              Assigned agent
              <select
                defaultValue={lead.assignedTo?._id ?? ""}
                key={lead.assignedTo?._id ?? "none"}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                onChange={(e) =>
                  void save({
                    assignedTo: e.target.value || null,
                  })
                }
              >
                <option value="">— None —</option>
                {agents.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
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
            <p className="text-xs uppercase text-slate-500">Priority</p>
            <div className="mt-2">
              <PriorityBadge priority={lead.priority} />
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Score <span className="font-mono text-slate-300">{lead.score}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Budget display{" "}
              <span className="text-slate-300">{formatBudgetPKR(lead.budget)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-xs uppercase text-slate-500">Follow-up</p>
            <input
              type="datetime-local"
              defaultValue={
                lead.followUpDate
                  ? lead.followUpDate.slice(0, 16)
                  : ""
              }
              key={lead.followUpDate ?? ""}
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
              onChange={(e) => {
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
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
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
