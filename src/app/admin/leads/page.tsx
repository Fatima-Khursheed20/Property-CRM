"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatBudgetPKR } from "@/lib/format";

const STATUSES = [
  "NEW",
  "CONTACTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "CLOSED",
] as const;
const PRIOS = ["HIGH", "MEDIUM", "LOW"] as const;
const SOURCES = ["FACEBOOK", "WALK_IN", "WEBSITE", "OTHER"] as const;

type LeadRow = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  propertyInterest: string;
  budget: number;
  status: string;
  priority: string;
  score: number;
  assignedTo?: { _id: string; name: string } | null;
  createdAt?: string;
};

type AgentOpt = { _id: string; name: string; email: string };

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [agents, setAgents] = useState<AgentOpt[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });
  const [showNew, setShowNew] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

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

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/agents", { credentials: "include" });
      if (r.ok) {
        const j = (await r.json()) as { agents: AgentOpt[] };
        setAgents(j.agents);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Leads</h1>
          <p className="mt-1 text-slate-400">
            Central registry · scoring applied on create · filters apply instantly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/leads/export"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Export Excel
          </a>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            New lead
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <input
          placeholder="Search name, email, phone…"
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
          className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
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
          <option value="">All priorities</option>
          {PRIOS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {leads.map((l) => (
              <tr
                key={l._id}
                className={
                  l.priority === "HIGH"
                    ? "bg-rose-950/20 border-l-4 border-l-rose-500"
                    : ""
                }
              >
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
                <td className="px-4 py-3 text-slate-300">{l.status}</td>
                <td className="px-4 py-3 text-slate-400">
                  {l.assignedTo?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/leads/${l._id}`}
                    className="text-emerald-400 hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew ? (
        <NewLeadModal
          agents={agents}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            void load();
          }}
          onError={setSubmitErr}
          error={submitErr}
        />
      ) : null}
    </div>
  );
}

function NewLeadModal({
  agents,
  onClose,
  onCreated,
  onError,
  error,
}: {
  agents: AgentOpt[];
  onClose: () => void;
  onCreated: () => void;
  onError: (s: string | null) => void;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyInterest, setPropertyInterest] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<(typeof SOURCES)[number]>("OTHER");
  const [assignedTo, setAssignedTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    const budgetNum = Number(budget.replace(/,/g, ""));
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      onError("Enter a valid budget (PKR).");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name,
        email,
        phone,
        propertyInterest,
        budget: budgetNum,
        notes,
        source,
      };
      if (assignedTo) body.assignedTo = assignedTo;

      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        onError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">Create lead</h2>
        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <Field label="Name" value={name} onChange={setName} required />
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field
            label="Phone (WhatsApp)"
            value={phone}
            onChange={setPhone}
            required
            hint="Local mobile; formatted for wa.me automatically."
          />
          <Field
            label="Property interest"
            value={propertyInterest}
            onChange={setPropertyInterest}
            required
          />
          <Field
            label="Budget (PKR)"
            value={budget}
            onChange={setBudget}
            required
            hint="Rules: &gt;20M High · 10–20M Medium · &lt;10M Low."
          />
          <div>
            <label className="block text-xs text-slate-400">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as (typeof SOURCES)[number])}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">
              Assign to agent (optional)
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          {error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : null}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-600 py-2 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
      />
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}
