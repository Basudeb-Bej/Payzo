// frontend/src/components/sidebar/invoices.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api.js";
import { inr } from "./Formatters.js";

/* ------------------------------------------------------------------ helpers */
const LABEL = {
  PENDING: "Pending",
  OVERDUE: "Overdue",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
};

const BADGE = {
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  OVERDUE: "bg-red-50 text-red-700 ring-1 ring-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  PAID: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  CANCELLED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/70",
  DECLINED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/70",
};

const DOT = {
  PENDING: "bg-amber-500",
  OVERDUE: "bg-red-500",
  PAID: "bg-emerald-500",
  CANCELLED: "bg-slate-400",
  DECLINED: "bg-slate-400",
};

const effective = (i) => (i.status === "PENDING" && i.overdue ? "OVERDUE" : i.status);
const created = (i) => new Date(i.created_at + "Z");
const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No due date";
const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const plusDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800";

function StatusBadge({ inv }) {
  const s = effective(inv);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE[s]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[s]}`} />
      {LABEL[s]}
    </span>
  );
}

function Modal({ onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-full w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ main */
export default function Invoices({ user, wallet, invoices, loading, onRefreshInvoices, onRefresh, onFlash }) {
  const [role, setRole] = useState("received"); // received = bills sent to me, issued = bills I sent
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const summary = useMemo(() => {
    const s = { toPay: 0, toPayN: 0, awaiting: 0, awaitingN: 0, overdueN: 0 };
    for (const i of invoices) {
      if (i.status !== "PENDING") continue;
      const amt = Number(i.amount);
      if (i.direction === "received") {
        s.toPay += amt;
        s.toPayN++;
      } else {
        s.awaiting += amt;
        s.awaitingN++;
      }
      if (i.overdue) s.overdueN++;
    }
    return s;
  }, [invoices]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices
      .filter((i) => i.direction === role)
      .filter((i) => {
        const s = effective(i);
        if (status === "pending" && i.status !== "PENDING") return false;
        if (status === "overdue" && s !== "OVERDUE") return false;
        if (status === "paid" && s !== "PAID") return false;
        if (status === "closed" && s !== "CANCELLED" && s !== "DECLINED") return false;
        if (!q) return true;
        return (
          i.number.toLowerCase().includes(q) ||
          (i.counterparty || "").toLowerCase().includes(q) ||
          (i.note || "").toLowerCase().includes(q) ||
          i.items.some((it) => it.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => created(b) - created(a));
  }, [invoices, role, status, query]);

  const selected = invoices.find((i) => i.id === selectedId) || null;
  const countFor = (r) => invoices.filter((i) => i.direction === r && i.status === "PENDING").length;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="You need to pay"
          value={inr(summary.toPay)}
          sub={`${summary.toPayN} unpaid invoice${summary.toPayN === 1 ? "" : "s"}`}
          tone="amber"
          icon="pay"
        />
        <SummaryCard
          label="Awaiting payment"
          value={inr(summary.awaiting)}
          sub={`${summary.awaitingN} unpaid invoice${summary.awaitingN === 1 ? "" : "s"}`}
          tone="blue"
          icon="clock"
        />
        <SummaryCard
          label="Overdue"
          value={String(summary.overdueN)}
          sub={summary.overdueN ? "Past due date" : "All up to date"}
          tone={summary.overdueN ? "red" : "emerald"}
          icon={summary.overdueN ? "alert" : "check"}
        />
      </div>

      {/* Main Invoices Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {[
              { id: "received", label: "To pay" },
              { id: "issued", label: "Sent by me" },
            ].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={role === t.id}
                type="button"
                onClick={() => setRole(t.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  role === t.id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {t.label}
                {countFor(t.id) > 0 && (
                  <span className="rounded-full bg-[#0B1246] px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-blue-600">
                    {countFor(t.id)}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B1246] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#14206E] dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New invoice</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 basis-56">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search number, person or item…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              ["all", "All"],
              ["pending", "Pending"],
              ["overdue", "Overdue"],
              ["paid", "Paid"],
              ["closed", "Closed"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatus(id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  status === id ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {invoices.some((i) => i.direction === role)
                ? "No invoices match your filters"
                : role === "received"
                ? "No invoices to pay"
                : "You haven't sent any invoices yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {role === "received"
                ? "When someone bills you through Payzo, it shows up here and you can pay it directly from your wallet."
                : "Create an invoice and the recipient can pay it straight from their Payzo wallet."}
            </p>
            {role === "issued" && !invoices.some((i) => i.direction === "issued") && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Create your first invoice
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((i) => (
              <li
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {i.number}
                    </span>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {role === "received" ? "From" : "To"} {i.counterparty}
                    </p>
                  </div>
                  <p className={`mt-1 truncate text-xs ${i.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                    {i.status === "PAID"
                      ? `Paid ${new Date(i.paid_at + "Z").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                      : `Due ${fmtDate(i.due_date)}`}
                    {i.items[0]
                      ? ` · ${i.items[0].description}${i.items.length > 1 ? ` +${i.items.length - 1} more` : ""}`
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {inr(i.amount)}
                  </span>
                  <StatusBadge inv={i} />
                  {role === "received" && i.status === "PENDING" && (
                    <span className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      Pay →
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creating && (
        <CreateInvoice
          onClose={() => setCreating(false)}
          onFlash={onFlash}
          onCreated={async (inv) => {
            setCreating(false);
            setRole("issued");
            setStatus("all");
            await onRefreshInvoices();
            onFlash("ok", `Invoice ${inv.number} sent to ${inv.counterparty}`);
          }}
        />
      )}

      {selected && (
        <InvoiceDetail
          key={selected.id}
          inv={selected}
          user={user}
          wallet={wallet}
          onClose={() => setSelectedId(null)}
          onChanged={async (alsoWallet) => {
            await Promise.all([onRefreshInvoices(), alsoWallet ? onRefresh() : Promise.resolve()]);
          }}
          onFlash={onFlash}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, tone, icon }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    red: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon === "pay" && (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          )}
          {icon === "clock" && (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )}
          {icon === "alert" && (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {icon === "check" && (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
      <span className={`mt-2.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
        {sub}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ create */
function CreateInvoice({ onClose, onCreated, onFlash }) {
  const nextId = useRef(2);
  const [to, setTo] = useState("");
  const [dueDate, setDueDate] = useState(plusDaysISO(15));
  const [note, setNote] = useState("");
  const [items, setItems] = useState([{ id: 1, description: "", qty: "1", unit: "" }]);
  const [busy, setBusy] = useState(false);

  const setItem = (id, patch) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const total = items.reduce((n, it) => n + (Number(it.qty) || 0) * (Number(it.unit) || 0), 0);
  const valid =
    to.trim().length >= 3 &&
    total > 0 &&
    items.every((it) => it.description.trim() && Number(it.qty) >= 1 && Number(it.unit) > 0);

  async function submit(e) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const inv = await api.createInvoice({
        to: to.trim(),
        due_date: dueDate || null,
        note: note.trim() || null,
        items: items.map((it) => ({ description: it.description.trim(), qty: Number(it.qty), unit_price: it.unit })),
      });
      await onCreated(inv);
    } catch (err) {
      onFlash("err", err.message || "Couldn't create the invoice");
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">New invoice</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">The recipient can pay it directly from their Payzo wallet.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Bill to (Wallet ID or phone number)</span>
          <input
            className={inputCls}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="PZ0123456789 or +91 98765 43210"
            required
            autoFocus
          />
        </label>

        <div>
          <div className="mb-1.5 hidden grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:grid">
            <span className="col-span-6">Description</span>
            <span className="col-span-2">Qty</span>
            <span className="col-span-3">Price (₹)</span>
          </div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-700 sm:hidden dark:text-slate-300">Items</span>

          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-2">
                <input
                  className={`${inputCls} col-span-12 sm:col-span-6`}
                  placeholder="Service or item description"
                  maxLength={100}
                  value={it.description}
                  onChange={(e) => setItem(it.id, { description: e.target.value })}
                  aria-label="Item description"
                />
                <input
                  className={`${inputCls} col-span-4 sm:col-span-2`}
                  type="number"
                  min="1"
                  max="9999"
                  step="1"
                  placeholder="Qty"
                  value={it.qty}
                  onChange={(e) => setItem(it.id, { qty: e.target.value })}
                  aria-label="Quantity"
                />
                <input
                  className={`${inputCls} col-span-6 sm:col-span-3`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={it.unit}
                  onChange={(e) => setItem(it.id, { unit: e.target.value })}
                  aria-label="Unit price"
                />
                <button
                  type="button"
                  aria-label="Remove item"
                  disabled={items.length === 1}
                  onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}
                  className="col-span-2 rounded-xl border border-slate-200 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 sm:col-span-1 dark:border-slate-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {items.length < 20 && (
            <button
              type="button"
              onClick={() => setItems((l) => [...l, { id: nextId.current++, description: "", qty: "1", unit: "" }])}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <span>+ Add another item</span>
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Due date</span>
              <input
                className={inputCls}
                type="date"
                min={todayISO()}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[7, 15, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDueDate(plusDaysISO(n))}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {n} days
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                None
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Note (optional)</span>
            <input
              className={inputCls}
              value={note}
              maxLength={255}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thanks for your business"
            />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800/60">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total amount</span>
          <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{inr(total)}</span>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !valid}
            className="rounded-xl bg-[#0B1246] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#14206E] disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {busy ? "Sending…" : "Send invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ detail + actions */
function InvoiceDetail({ inv, user, wallet, onClose, onChanged, onFlash }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // "decline" | "cancel"

  const received = inv.direction === "received";
  const pending = inv.status === "PENDING";
  const needsPin = Boolean(user?.has_pin);
  const insufficient = wallet && Number(inv.amount) > Number(wallet.balance);

  async function act(fn, successText, alsoWallet = false) {
    setBusy(true);
    try {
      await fn();
      await onChanged(alsoWallet);
      onFlash("ok", successText);
      setConfirming(null);
      setPin("");
    } catch (err) {
      onFlash("err", err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const pay = () =>
    act(
      () => api.payInvoice(inv.id, needsPin ? pin : null),
      `Paid ${inr(inv.amount)} to ${inv.counterparty}`,
      true
    );
  const decline = () => act(() => api.declineInvoice(inv.id), `Invoice ${inv.number} declined`);
  const cancel = () => act(() => api.cancelInvoice(inv.id), `Invoice ${inv.number} cancelled`);

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between">
        <StatusBadge inv={inv} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{inv.number}</span> ·{" "}
          {received ? "From" : "To"} {inv.counterparty}
        </p>
        <p className="mt-1.5 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{inr(inv.amount)}</p>
      </div>

      <div className="mt-5 divide-y divide-slate-200/70 rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 text-sm dark:border-slate-800 dark:bg-slate-800/60">
        {inv.items.map((it, idx) => (
          <div key={idx} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="break-words font-medium text-slate-800 dark:text-slate-200">{it.description}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {it.qty} × {inr(it.unit_price)}
              </p>
            </div>
            <p className="whitespace-nowrap font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {inr(Number(it.qty) * Number(it.unit_price))}
            </p>
          </div>
        ))}
      </div>

      <dl className="mt-5 space-y-2.5 text-xs">
        <Row
          label="Issued"
          value={created(inv).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        />
        <Row label="Due" value={fmtDate(inv.due_date)} danger={inv.overdue} />
        {inv.paid_at && <Row label="Paid on" value={new Date(inv.paid_at + "Z").toLocaleString("en-IN")} />}
        {inv.transaction_ref && <Row label="Payment reference" value={`#${inv.transaction_ref}`} mono />}
        {inv.counterparty_ref && <Row label="Wallet ID" value={inv.counterparty_ref} mono />}
        {inv.note && <Row label="Note" value={inv.note} />}
      </dl>

      {pending && received && (
        <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          {insufficient && (
            <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
              Your balance ({inr(wallet.balance)}) is lower than this invoice. Add money first.
            </p>
          )}
          {needsPin && (
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit PIN"
              aria-label="Transaction PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputCls} text-center font-mono tracking-widest`}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={pay}
              disabled={busy || insufficient || (needsPin && pin.length !== 6)}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy && confirming === null ? "Paying…" : `Pay ${inr(inv.amount)}`}
            </button>
            {confirming === "decline" ? (
              <button
                type="button"
                onClick={decline}
                disabled={busy}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm decline
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming("decline")}
                disabled={busy}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
              >
                Decline
              </button>
            )}
          </div>
        </div>
      )}

      {pending && !received && (
        <div className="mt-6 flex gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
          {confirming === "cancel" ? (
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Cancelling…" : "Yes, cancel this invoice"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming("cancel")}
              className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Cancel invoice
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
          >
            Close
          </button>
        </div>
      )}

      {!pending && (
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
        >
          Close
        </button>
      )}
    </Modal>
  );
}

function Row({ label, value, mono = false, danger = false }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right font-medium ${danger ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"} ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}