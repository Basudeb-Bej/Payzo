// frontend/src/components/sidebar/activity.jsx
import { useMemo } from "react";
import { inr } from "./Formatters.js";

const STATUS_STYLE = {
  SUCCESS: {
    pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Completed",
  },
  PENDING: {
    pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-500",
    label: "Pending",
  },
  FAILED: {
    pill: "bg-red-50 text-red-700 ring-1 ring-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
    dot: "bg-red-500",
    label: "Failed",
  },
};

function TxIcon({ isTopup, isOut }) {
  if (isTopup) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    );
  }
  if (isOut) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <line x1="17" y1="7" x2="7" y2="17" />
        <polyline points="17 17 7 17 7 7" />
      </svg>
    </div>
  );
}

export default function Activity({
  title = "Recent Transactions",
  loading,
  txs = [],
  visibleTxs = [],
  filteredTxsCount = 0,
  txFilter,
  onFilterChange,
  showAllTxs,
  onToggleShowAll,
  isFullPage = false,
  onSelectTx,
  onExportCsv,
}) {
  const totals = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const t of visibleTxs) {
      if (t.status === "FAILED") continue;
      const amt = Number(t.amount || 0);
      if (t.direction === "out") outflow += amt;
      else inflow += amt;
    }
    return { inflow, outflow };
  }, [visibleTxs]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
            {!loading && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {filteredTxsCount}
              </span>
            )}
          </div>
          {!loading && visibleTxs.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Inflow:{" "}
                <strong className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{inr(totals.inflow)}
                </strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Outflow:{" "}
                <strong className="font-semibold tabular-nums text-rose-600">
                  −{inr(totals.outflow)}
                </strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
            {[
              { id: "all", label: "All" },
              { id: "in", label: "Received" },
              { id: "out", label: "Sent" },
              { id: "topup", label: "Top-ups" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  txFilter === f.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredTxsCount > 0 && (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
            >
              <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-3 border-t border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-800">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="h-3.5 w-36 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-2.5 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : visibleTxs.length === 0 ? (
        <div className="border-t border-slate-100 px-6 py-14 text-center dark:border-slate-800">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {txs.length === 0 ? "No transactions yet" : "No matching transactions"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {txs.length === 0
              ? "Add money to your wallet or send a transfer to see your ledger."
              : "Try clearing or changing your active filter."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Ledger Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                  <th className="py-2.5 pl-6 pr-3">Transaction</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="py-2.5 pl-3 pr-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleTxs.map((t) => {
                  const isOut = t.direction === "out";
                  const isTopup = t.type === "TOPUP";
                  const rowTitle = isTopup
                    ? "Wallet top-up"
                    : isOut
                    ? `To ${t.counterparty}`
                    : `From ${t.counterparty}`;
                  const statusCfg = STATUS_STYLE[t.status] || STATUS_STYLE.SUCCESS;
                  const dt = new Date(t.created_at + "Z");

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTx(t)}
                      className="group cursor-pointer transition hover:bg-blue-50/30 dark:hover:bg-blue-500/10"
                    >
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <TxIcon isTopup={isTopup} isOut={isOut} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-300">
                              {rowTitle}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-mono text-[11px] text-slate-400">#{t.id}</span>
                              {t.note ? ` · ${t.note}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {isTopup ? "Top-up" : isOut ? "Transfer out" : "Transfer in"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="block font-medium text-slate-700 dark:text-slate-300">
                          {dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.pill}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="whitespace-nowrap py-3.5 pl-3 pr-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              isOut ? "text-slate-900 dark:text-slate-100" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isOut ? "−" : "+"}
                            {inr(t.amount)}
                          </span>
                          <svg
                            className="h-4 w-4 text-slate-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:text-blue-600 group-hover:opacity-100 dark:group-hover:text-blue-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden dark:divide-slate-800 dark:border-slate-800">
            {visibleTxs.map((t) => {
              const isOut = t.direction === "out";
              const isTopup = t.type === "TOPUP";
              const rowTitle = isTopup
                ? "Wallet top-up"
                : isOut
                ? `To ${t.counterparty}`
                : `From ${t.counterparty}`;
              const statusCfg = STATUS_STYLE[t.status] || STATUS_STYLE.SUCCESS;

              return (
                <li
                  key={t.id}
                  onClick={() => onSelectTx(t)}
                  className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 transition active:bg-slate-50 dark:active:bg-slate-800/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <TxIcon isTopup={isTopup} isOut={isOut} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{rowTitle}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {new Date(t.created_at + "Z").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`whitespace-nowrap text-sm font-bold tabular-nums ${
                        isOut ? "text-slate-900 dark:text-slate-100" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isOut ? "−" : "+"}
                      {inr(t.amount)}
                    </p>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.pill}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Footer View All Bar */}
          {!isFullPage && filteredTxsCount > 5 && (
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-center dark:border-slate-800 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={onToggleShowAll}
                className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showAllTxs ? "Show fewer transactions ↑" : `View all ${filteredTxsCount} transactions →`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}