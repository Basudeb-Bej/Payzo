// frontend/src/components/sidebar/Wallet.jsx
import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { getInitials, inr, newKey } from "./Formatters.js";

export default function WalletPanel({
  user,
  wallet,
  loading,
  refreshing,
  hideBalance,
  onToggleHideBalance,
  actionMode,
  onActionModeChange,
  recentContacts,
  prefillRecipient,
  onClearPrefill,
  onOpenHistory,
  onRefresh,
  onFlash,
  isWide = false,
}) {
  const [copiedId, setCopiedId] = useState(false);

  async function copyWalletNo() {
    if (!user?.wallet_no) return;
    try {
      await navigator.clipboard.writeText(user.wallet_no);
      setCopiedId(true);
      onFlash?.("ok", "Wallet ID copied");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      onFlash?.("err", "Couldn't copy Wallet ID");
    }
  }

  function CopyIcon({ className = "h-4 w-4" }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  function CopyIconDone({ className = "h-4 w-4" }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }

  return (
    <div className={`space-y-6 ${isWide ? "lg:col-span-5" : "lg:col-span-4"}`}>
      {/* My Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">My Card</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleHideBalance}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={hideBalance ? "Show balance" : "Hide balance"}
              title={hideBalance ? "Show balance" : "Hide balance"}
            >
              {hideBalance ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              Active
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1246] via-[#122B88] to-[#2563EB] p-6 text-white shadow-lg">
          <svg
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 text-white/10"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <circle cx="100" cy="100" r="100" />
          </svg>
          <svg
            className="pointer-events-none absolute -bottom-12 right-8 h-36 w-36 text-blue-400/20"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <circle cx="100" cy="100" r="100" />
          </svg>

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-blue-200">
                Available Balance
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-36 animate-pulse rounded-lg bg-white/20" />
              ) : (
                <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">
                  {hideBalance ? "₹ ••••••" : wallet ? inr(wallet.balance) : "—"}
                </p>
              )}
            </div>
            <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold tracking-wider backdrop-blur-sm">
              INR
            </span>
          </div>

          <div className="relative mt-8 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-blue-200">Card Holder</p>
              <p className="truncate text-sm font-semibold">{user?.name}</p>
            </div>
            <div className="text-right shrink-0">
              {user?.wallet_no ? (
                <button
                  type="button"
                  onClick={copyWalletNo}
                  title="Copy Wallet ID to receive money"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 font-mono text-xs tracking-wider text-blue-100 transition hover:bg-white/20"
                >
                  <span>{user.wallet_no}</span>
                  <span className="text-[10px] font-sans font-semibold text-blue-200">
                    {copiedId ? <CopyIconDone /> : <CopyIcon />}
                  </span>
                </button>
              ) : (
                <p className="font-mono text-xs tracking-widest text-blue-100">
                  •••• •••• •••• 4028
                </p>
              )}
              <p className="mt-1 text-xs font-bold tracking-wider text-white">
                PAYZO
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Send Money / Add Money Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 grid grid-cols-4 gap-2">
          <QuickActionButton
            label="Send"
            active={actionMode === "send"}
            onClick={() => onActionModeChange("send")}
            icon="send"
          />
          <QuickActionButton
            label="Add"
            active={actionMode === "topup"}
            onClick={() => onActionModeChange("topup")}
            icon="plus"
          />
          <QuickActionButton
            label="History"
            active={false}
            onClick={onOpenHistory}
            icon="history"
          />
          <QuickActionButton
            label={refreshing ? "Syncing" : "Refresh"}
            active={false}
            spinning={refreshing}
            onClick={() => onRefresh(true)}
            icon="refresh"
          />
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => onActionModeChange("send")}
            className={`rounded-lg py-2 text-xs font-semibold transition ${actionMode === "send"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
          >
            Send Money
          </button>
          <button
            type="button"
            onClick={() => onActionModeChange("topup")}
            className={`rounded-lg py-2 text-xs font-semibold transition ${actionMode === "topup"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
          >
            Add Money
          </button>
        </div>

        {actionMode === "send" ? (
          <SendForm
            balance={wallet?.balance}
            recentContacts={recentContacts}
            prefillTo={prefillRecipient}
            onDone={async (a, to) => {
              onClearPrefill();
              await onRefresh();
              onFlash("ok", `Sent ${inr(a)} to ${to}`);
            }}
            onError={(e) => onFlash("err", e)}
          />
        ) : (
          <TopUpForm
            onDone={async (a) => {
              await onRefresh();
              onFlash("ok", `Added ${inr(a)} to your wallet`);
            }}
            onError={(e) => onFlash("err", e)}
          />
        )}
      </section>
    </div>
  );
}

function QuickActionButton({ label, active, spinning, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-[11px] font-semibold transition ${active
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        }`}
    >
      {icon === "send" && (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      )}
      {icon === "plus" && (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
      {icon === "history" && (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )}
      {icon === "refresh" && (
        <svg
          className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}

function TopUpForm({ onDone, onError }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);

    try {
      await api.topup(amount);
      onDone(amount);
      setAmount("");
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Amount (₹)
        </label>
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-lg font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
          type="number"
          min="1"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[500, 1000, 2500, 5000].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(String(preset))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:text-blue-300"
          >
            +₹{preset.toLocaleString("en-IN")}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-[#0B1246] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14206E] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        {busy ? "Adding…" : "Add Money"}
      </button>
    </form>
  );
}

function SendForm({ balance, recentContacts, prefillTo, onDone, onError }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(newKey);
  const [match, setMatch] = useState(null);
  const [checking, setChecking] = useState(false);
  const [lookupErr, setLookupErr] = useState("");

  useEffect(() => {
    if (prefillTo) setTo(prefillTo);
  }, [prefillTo]);

  // Debounced lookup: shows who will be paid before any money moves
  useEffect(() => {
    setMatch(null);
    setLookupErr("");
    const q = to.trim();
    if (q.length < 6) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(() => {
      api
        .lookupWallet(q)
        .then((m) => !cancelled && setMatch(m))
        .catch((e) => !cancelled && setLookupErr(e.message))
        .finally(() => !cancelled && setChecking(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [to]);

  const insufficient =
    balance !== undefined && balance !== null && Number(amount) > Number(balance);

  async function submit(e) {
    e.preventDefault();
    if (!match) {
      onError("Enter a valid Wallet ID or phone number first.");
      return;
    }
    if (insufficient) {
      onError("Insufficient wallet balance for this transfer.");
      return;
    }
    setBusy(true);

    try {
      await api.transfer({
        to: match.wallet_no, // money is addressed by Wallet ID only
        amount,
        note: note || null,
        pin: pin || null,
        idempotency_key: key,
      });

      onDone(amount, match.display_name);

      setTo("");
      setAmount("");
      setNote("");
      setPin("");
      setKey(newKey());
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const fieldCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800";
  const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300";

  return (
    <form onSubmit={submit} className="space-y-3.5">
      {recentContacts.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Recent Recipients
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recentContacts.map((c) => (
              <button
                key={c.ref}
                type="button"
                onClick={() => setTo(c.ref)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${to === c.ref
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-600"
                  }`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-white">
                  {getInitials(c.name)}
                </span>
                <span className="max-w-[120px] truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Wallet ID or phone number</label>
        <input
          className={fieldCls}
          placeholder="PZ0123456789 or +91 98765 43210"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          autoComplete="off"
          required
        />
        {checking && <p className="mt-1.5 text-xs text-slate-400">Checking…</p>}
        {match && (
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-emerald-50 p-2.5 text-sm dark:bg-emerald-500/10">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {getInitials(match.display_name)}
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{match.display_name}</p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{match.wallet_no}</p>
            </div>
          </div>
        )}
        {lookupErr && !checking && (
          <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{lookupErr}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>Enter the amount (₹)</label>
        <input
          className={`${fieldCls} text-lg font-bold ${insufficient ? "!border-red-400" : ""}`}
          type="number"
          min="1"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {insufficient && (
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            Exceeds available balance ({inr(balance)})
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[500, 1000, 2500, 5000].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(String(preset))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:text-blue-300"
          >
            ₹{preset.toLocaleString("en-IN")}
          </button>
        ))}
      </div>

      <div>
        <label className={labelCls}>Note (optional)</label>
        <input
          className={fieldCls}
          placeholder="Dinner, rent, etc."
          value={note}
          maxLength={140}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Transaction PIN</label>
        <input
          className={`${fieldCls} font-mono tracking-widest`}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder="••••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>

      <button
        type="submit"
        disabled={busy || insufficient || !match}
        className="w-full rounded-xl bg-[#0B1246] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14206E] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        {busy ? "Sending…" : "Send Money"}
      </button>
    </form>
  );
}