// frontend/src/components/toast/ToastProvider.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

// accepts the old flash() types ("ok" / "err") plus "success" / "error" / "info"
const KINDS = { ok: "ok", success: "ok", err: "err", error: "err", info: "info" };
const DURATION = { ok: 4000, info: 4500, err: 6500 };
const MAX_VISIBLE = 4;
let seq = 0;

const STYLES = {
  ok: { border: "border-emerald-500", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  err: { border: "border-red-500", icon: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  info: { border: "border-blue-500", icon: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
};

function Icon({ kind }) {
  const common = { className: "h-3.5 w-3.5", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" };
  if (kind === "ok") return <svg {...common}><polyline points="20 6 9 17 4 12" /></svg>;
  if (kind === "err") return <svg {...common}><line x1="12" y1="7" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
  return <svg {...common}><line x1="12" y1="11" x2="12" y2="17" /><line x1="12" y1="7" x2="12.01" y2="7" /></svg>;
}

function Toast({ toast, onClose }) {
  const s = STYLES[toast.kind];
  return (
    <div
      role={toast.kind === "err" ? "alert" : "status"}
      style={{ animation: "payzo-toast-in 180ms ease-out" }}
      className={`payzo-toast pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 bg-white p-3.5 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 ${s.border}`}
    >
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.icon}`}>
        <Icon kind={toast.kind} />
      </span>
      <p className="min-w-0 flex-1 break-words text-sm font-medium text-slate-800 dark:text-slate-200">{toast.text}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  // notify("ok" | "err" | "info", "text")  — same shape as the old flash()
  const notify = useCallback(
    (type, text) => {
      if (!text) return;
      const kind = KINDS[type] || "info";
      const id = ++seq;
      setToasts((list) =>
        list.some((t) => t.kind === kind && t.text === text) // don't stack identical toasts
          ? list
          : [...list.slice(-(MAX_VISIBLE - 1)), { id, kind, text }]
      );
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION[kind]));
    },
    [dismiss]
  );

  useEffect(() => {
    const all = timers.current;
    return () => all.forEach(clearTimeout);
  }, []);

  const value = useMemo(
    () => ({
      notify,
      success: (text) => notify("ok", text),
      error: (text) => notify("err", text),
      info: (text) => notify("info", text),
    }),
    [notify]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <style>{`
        @keyframes payzo-toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .payzo-toast { animation: none !important; } }
      `}</style>
      <div className="pointer-events-none fixed inset-x-4 top-[4.5rem] z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:w-96">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}