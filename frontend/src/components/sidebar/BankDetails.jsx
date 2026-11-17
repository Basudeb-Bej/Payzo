// frontend/src/components/sidebar/BankDetails.jsx
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { inr } from "./Formatters.js";

const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function BankDetails({ bank }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api.bankDetails(bank.id));
    } catch (err) {
      setError(err.message || "Couldn't load bank details");
    } finally {
      setLoading(false);
    }
  }, [bank.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Loading bank details…</p>;
  }
  if (error) {
    return (
      <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
        {error}{" "}
        <button type="button" onClick={load} className="font-semibold underline">
          Try again
        </button>
      </div>
    );
  }
  if (!data) return null;

  const b = data.branch_info;
  const txs = showAll ? data.transactions : data.transactions.slice(0, 6);
  const rows = [
    ["Account holder", data.holder_name],
    ["Account number", `••••${data.last4}`],
    ["IFSC", data.ifsc],
    ["Branch", b?.exact ? [b.branch, b.city].filter(Boolean).join(", ") : "Not available"],
    ["State", b?.exact ? b.state || "-" : "-"],
  ];

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      {data.demo && (
        <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Demo data: this balance and statement are simulated. Your real bank is not connected.
        </p>
      )}

      {/* balance */}
      <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white">
        <p className="text-[11px] uppercase tracking-wider text-blue-100">Available balance</p>
        <p className="mt-1 text-2xl font-bold">{inr(data.balance)}</p>
        <div className="mt-3 flex gap-6 text-xs">
          <div>
            <p className="text-blue-100">Money in ({data.days}d)</p>
            <p className="font-semibold">{inr(data.total_in)}</p>
          </div>
          <div>
            <p className="text-blue-100">Money out ({data.days}d)</p>
            <p className="font-semibold">{inr(data.total_out)}</p>
          </div>
        </div>
      </div>

      {/* account info */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-slate-400 dark:text-slate-500">{k}</dt>
            <dd className="truncate font-medium text-slate-800 dark:text-slate-100">{v}</dd>
          </div>
        ))}
      </dl>
      {b?.exact && (
        <div className="flex flex-wrap gap-1.5">
          {[["UPI", b.upi], ["IMPS", b.imps], ["NEFT", b.neft], ["RTGS", b.rtgs]]
            .filter(([, on]) => on)
            .map(([k]) => (
              <span key={k} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {k}
              </span>
            ))}
        </div>
      )}

      {/* statement */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Recent transactions</h3>
          <button type="button" onClick={load} className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {txs.map((t, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {fmtDate(t.date)} · {t.mode}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-xs font-semibold ${t.type === "CR" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"}`}>
                  {t.type === "CR" ? "+" : "-"}
                  {inr(t.amount)}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Bal {inr(t.balance_after)}</p>
              </div>
            </li>
          ))}
        </ul>
        {data.transactions.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
          >
            {showAll ? "Show fewer" : `Show all ${data.transactions.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
