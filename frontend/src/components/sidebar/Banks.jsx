// frontend/src/components/sidebar/Banks.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api.js";
import BankDetails from "./BankDetails.jsx";

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Tap a bank to start the IFSC with its 4-letter code (the 5th character is always 0)
const POPULAR = [
  ["SBI", "SBIN"],
  ["HDFC", "HDFC"],
  ["ICICI", "ICIC"],
  ["Axis", "UTIB"],
  ["PNB", "PUNB"],
  ["Bank of Baroda", "BARB"],
  ["Kotak", "KKBK"],
  ["Canara", "CNRB"],
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/50";
const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400";

const STATUS_STYLE = {
  VERIFIED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  FAILED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

export default function Banks({ onFlash }) {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [ifsc, setIfsc] = useState("");
  const [lookup, setLookup] = useState({ state: "idle", info: null, error: "" }); // idle | loading | ok | error
  const [bankName, setBankName] = useState("");
  const [holder, setHolder] = useState("");
  const [acct, setAcct] = useState("");
  const [acct2, setAcct2] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [openId, setOpenId] = useState(null); // which linked bank is showing its details

  const reqId = useRef(0); // ignore out-of-date lookup responses

  const load = useCallback(async () => {
    try {
      const list = await api.banks();
      setBanks(Array.isArray(list) ? list : []);
    } catch (err) {
      onFlash?.("err", err.message || "Couldn't load your bank accounts");
    } finally {
      setLoading(false);
    }
  }, [onFlash]);

  useEffect(() => {
    load();
  }, [load]);

  // Look the IFSC up as soon as all 11 characters are typed
  useEffect(() => {
    const code = ifsc.trim().toUpperCase();
    reqId.current += 1;
    const mine = reqId.current;

    if (!IFSC_RE.test(code)) {
      setLookup({
        state: "idle",
        info: null,
        error: code.length === 11 ? "That doesn't look like a valid IFSC (4 letters, then 0, then 6 letters/digits)" : "",
      });
      return;
    }

    setLookup({ state: "loading", info: null, error: "" });
    api
      .ifsc(code)
      .then((info) => {
        if (mine !== reqId.current) return;
        setLookup({ state: "ok", info, error: "" });
        setBankName(info.bank || "");
      })
      .catch((err) => {
        if (mine !== reqId.current) return;
        setLookup({ state: "error", info: null, error: err.message || "Couldn't check this IFSC" });
      });
  }, [ifsc]);

  const info = lookup.info;
  // Bank name is locked once the IFSC has been confirmed against the directory; otherwise the user types it
  const nameLocked = lookup.state === "ok" && info?.exact;
  const mismatch = acct2.length > 0 && acct !== acct2;
  const canSubmit =
    lookup.state !== "loading" &&
    lookup.state !== "idle" &&
    IFSC_RE.test(ifsc) &&
    !(lookup.state === "error" && lookup.error.includes("No bank branch")) &&
    bankName.trim().length >= 2 &&
    holder.trim().length >= 2 &&
    /^\d{9,18}$/.test(acct) &&
    acct === acct2 &&
    !saving;

  function pickBank(prefix) {
    setIfsc(prefix + "0");
  }

  function reset() {
    setIfsc("");
    setBankName("");
    setHolder("");
    setAcct("");
    setAcct2("");
    setLookup({ state: "idle", info: null, error: "" });
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const b = await api.linkBank({
        holder_name: holder.trim(),
        bank_name: bankName.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        account_no: acct,
      });
      onFlash?.("ok", `${b.bank_name} account ••${b.last4} linked`);
      if (b.status === "VERIFIED") setOpenId(b.id); // show its details straight away
      reset();
      load();
    } catch (err) {
      onFlash?.("err", err.message || "Couldn't link this bank account");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(b) {
    setRemovingId(b.id);
    try {
      await api.removeBank(b.id);
      onFlash?.("ok", `${b.bank_name} ••${b.last4} removed`);
      setConfirmId(null);
      load();
    } catch (err) {
      onFlash?.("err", err.message || "Couldn't remove this bank account");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* ---------- Link a bank ---------- */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Link a bank account</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Works with any Indian bank. Enter the IFSC and we'll fill in the bank and branch for you.
        </p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <b>Demo mode.</b> No real money moves and nothing is sent to your bank. Please don't enter real account
          details. Use any 9 to 18 digit test number (ending 0000 fails verification).
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" autoComplete="off">
          <div>
            <span className={labelCls}>Pick your bank (optional)</span>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map(([label, prefix]) => {
                const active = ifsc.toUpperCase().startsWith(prefix);
                return (
                  <button
                    key={prefix}
                    type="button"
                    onClick={() => pickBank(prefix)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-blue-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="ifsc" className={labelCls}>IFSC code</label>
            <input
              id="ifsc"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
              spellCheck={false}
              autoCapitalize="characters"
              className={`${inputCls} font-mono tracking-wider`}
            />

            {lookup.state === "loading" && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Checking IFSC…</p>
            )}
            {lookup.state === "error" && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{lookup.error}</p>}
            {lookup.state === "idle" && lookup.error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{lookup.error}</p>
            )}

            {lookup.state === "ok" && info && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{info.bank}</p>
                {info.exact ? (
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {[info.branch, info.city, info.state].filter(Boolean).join(", ")}
                    </p>
                    {info.address && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{info.address}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        ["UPI", info.upi],
                        ["IMPS", info.imps],
                        ["NEFT", info.neft],
                        ["RTGS", info.rtgs],
                      ]
                        .filter(([, on]) => on)
                        .map(([k]) => (
                          <span
                            key={k}
                            className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-slate-900 dark:text-emerald-300 dark:ring-emerald-500/30"
                          >
                            {k}
                          </span>
                        ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Branch details are unavailable right now, but the bank was recognised from the code.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bank_name" className={labelCls}>Bank name</label>
              <input
                id="bank_name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                disabled={nameLocked}
                placeholder="Filled in from the IFSC"
                maxLength={100}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="holder" className={labelCls}>Account holder name</label>
              <input
                id="holder"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                placeholder="As printed on the passbook"
                maxLength={100}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="acct" className={labelCls}>Account number</label>
              <input
                id="acct"
                value={acct}
                onChange={(e) => setAcct(e.target.value.replace(/\D/g, "").slice(0, 18))}
                inputMode="numeric"
                placeholder="9 to 18 digits"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="acct2" className={labelCls}>Confirm account number</label>
              <input
                id="acct2"
                value={acct2}
                onChange={(e) => setAcct2(e.target.value.replace(/\D/g, "").slice(0, 18))}
                onPaste={(e) => e.preventDefault()}
                inputMode="numeric"
                placeholder="Type it again"
                className={`${inputCls} font-mono`}
              />
              {mismatch && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Account numbers don't match</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Linking…" : "Link bank account"}
          </button>
        </form>
      </section>

      {/* ---------- Linked banks ---------- */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Linked accounts</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">{banks.length} of 5</span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : banks.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No bank accounts yet. Link one using the form.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {banks.map((b) => (
              <li key={b.id} className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{b.bank_name}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      ••••{b.last4} · {b.ifsc}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{b.holder_name}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      STATUS_STYLE[b.status] || STATUS_STYLE.PENDING
                    }`}
                  >
                    {b.status === "VERIFIED" ? "Verified" : b.status === "PENDING" ? "Pending" : "Failed"}
                  </span>
                </div>

                {openId === b.id && b.status === "VERIFIED" && <BankDetails bank={b} />}

                <div className="mt-3 flex items-center justify-end gap-2">
                  {confirmId !== b.id && b.status === "VERIFIED" && (
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === b.id ? null : b.id)}
                      className="mr-auto rounded-lg px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                    >
                      {openId === b.id ? "Hide details" : "View details"}
                    </button>
                  )}
                  {confirmId === b.id ? (
                    <>
                      <span className="mr-auto text-xs text-slate-500 dark:text-slate-400">Remove this account?</span>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        disabled={removingId === b.id}
                        onClick={() => remove(b)}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {removingId === b.id ? "Removing…" : "Remove"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(b.id)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Account numbers are encrypted and only the last 4 digits are ever shown.
        </p>
      </section>
    </div>
  );
}
