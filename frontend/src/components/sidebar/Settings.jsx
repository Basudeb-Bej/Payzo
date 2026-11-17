// frontend/src/components/sidebar/Settings.jsx
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../../api.js";
import { AppearanceCard } from "../theme/ThemeControls.jsx";
import ProfileDetailsSection from "./profile.jsx";

const PRIMARY_TABS = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "security", label: "Security", icon: "shield" },
  { id: "sessions", label: "Devices", icon: "devices" },
];

const DANGER_TAB = { id: "danger", label: "Delete account", icon: "trash" };

/* ------------------------------------------------------------------ styles */
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800 dark:disabled:bg-slate-800/70 dark:disabled:text-slate-400";
const invalidCls = "!border-red-400 focus:!ring-red-500/10";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1246] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#14206E] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:border-slate-600";
const dangerBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";
const dangerGhostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-500/10";

/* ------------------------------------------------------------------ icons */
const ICONS = {
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  shieldcheck: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  devices: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeoff: (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  ),
  key: <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />,
  hash: (
    <>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </>
  ),
  alert: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
};

function Ico({ name, className = "h-4 w-4 shrink-0" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ helpers */
function useAction(onFlash) {
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try {
      return Boolean(await fn());
    } catch (e) {
      onFlash("err", e.message || "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const setErr = (text) => {
    if (text) onFlash("err", text);
  };

  return { busy, setErr, run };
}

const digitsOnly = (v) => v.replace(/\D/g, "").slice(0, 6);
const weakPin = (p) => p.length === 6 && (new Set(p).size === 1 || "0123456789".includes(p) || "9876543210".includes(p));

function strength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (pw.length >= 14 || /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];

function describeAgent(ua = "") {
  if (!ua) return "Unknown device";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  const br = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${br} on ${os}`;
}

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso + "Z").getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function stamp(iso) {
  const d = new Date(iso + "Z");
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase(),
  };
}

/* ------------------------------------------------------------------ shared pieces */
function Card({ icon, title, badge, tone = "default", children }) {
  const danger = tone === "danger";
  return (
    <section
      className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 dark:bg-slate-900 ${
        danger ? "border-red-200/90 dark:border-red-500/30" : "border-slate-200/80 dark:border-slate-800"
      }`}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className={`flex items-center gap-2.5 text-sm font-bold ${danger ? "text-red-700 dark:text-red-300" : "text-slate-900 dark:text-slate-100"}`}>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              danger ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
            }`}
          >
            <Ico name={icon} />
          </span>
          {title}
        </h3>
        {badge}
      </div>
      {children}
    </section>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

function Badge({ ok, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        ok
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
          : "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      {children}
    </span>
  );
}

function PasswordInput({ value, onChange, autoComplete = "current-password", invalid, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className={`${inputCls} pr-11 ${invalid ? invalidCls : ""}`}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
      >
        <Ico name={show ? "eyeoff" : "eye"} />
      </button>
    </div>
  );
}

/** Icon + title + status line + action, used for the idle state of a setting. */
function Row({ icon, title, sub, ok, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            ok ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          <Ico name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Steps({ current, labels }) {
  return (
    <ol className="mb-5 flex items-center gap-3">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                {done ? <Ico name="check" className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={`text-xs font-semibold ${active ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>{label}</span>
            </span>
            {n < labels.length && <span className="h-px w-8 bg-slate-200 dark:bg-slate-700" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ main */
function NavTab({ label, icon, active, danger, attention, onClick }) {
  const tone = danger
    ? {
        row: active
          ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
          : "text-red-600/80 hover:bg-red-50/60 hover:text-red-700 dark:text-red-400/80 dark:hover:bg-red-500/10 dark:hover:text-red-300",
        chip: active
          ? "bg-red-600 text-white shadow-sm"
          : "bg-red-50 text-red-500 group-hover:bg-red-100 dark:bg-red-500/10 dark:group-hover:bg-red-500/15",
      }
    : {
        row: active
          ? "bg-blue-50/90 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
        chip: active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700/70 dark:group-hover:text-slate-300",
      };

  return (
    <button
      role="tab"
      aria-selected={active}
      type="button"
      onClick={onClick}
      className={`group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition md:w-full ${tone.row}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${tone.chip}`}>
        <Ico name={icon} className="h-4 w-4" />
      </span>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {label}
        {attention && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Setup incomplete" />}
      </span>
    </button>
  );
}

export default function Settings({
  user,
  profile,
  onProfileChange,
  onUserChange,
  onLogout,
  onFlash,
  initialTab = "profile",
}) {
  const [tab, setTab] = useState(initialTab);

  const reloadUser = useCallback(async () => {
    const fresh = await api.me();
    onUserChange?.(fresh);
  }, [onUserChange]);

  const securityNeedsAttention = !user?.has_pin || !user?.totp_enabled;

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start lg:gap-8">
      <aside aria-label="Settings navigation" className="md:sticky md:top-24 md:w-60 md:shrink-0">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div role="tablist" aria-orientation="vertical" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {PRIMARY_TABS.map((t) => (
              <NavTab
                key={t.id}
                label={t.label}
                icon={t.icon}
                active={tab === t.id}
                attention={t.id === "security" && securityNeedsAttention}
                onClick={() => setTab(t.id)}
              />
            ))}
            <div className="my-1.5 hidden border-t border-slate-100 md:block dark:border-slate-800" />
            <NavTab
              label={DANGER_TAB.label}
              icon={DANGER_TAB.icon}
              danger
              active={tab === DANGER_TAB.id}
              onClick={() => setTab(DANGER_TAB.id)}
            />
          </div>
        </div>
      </aside>

      <div className="min-w-0 max-w-3xl flex-1 space-y-5">
        {tab === "profile" && (
          <>
            <ProfileDetailsSection
              user={user}
              profile={profile}
              onProfileChange={onProfileChange}
              reloadUser={reloadUser}
              onFlash={onFlash}
            />
            <AppearanceCard />
          </>
        )}

        {tab === "security" && (
          <>
            <SecurityOverview user={user} />
            <PasswordSection onFlash={onFlash} />
            <TwoFactorSection user={user} reloadUser={reloadUser} onFlash={onFlash} />
            <PinSection user={user} reloadUser={reloadUser} onFlash={onFlash} />
          </>
        )}
        {tab === "sessions" && <SessionsSection onLogout={onLogout} onFlash={onFlash} />}
        {tab === "danger" && <DeleteSection user={user} onLogout={onLogout} onFlash={onFlash} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ security overview */
function SecurityOverview({ user }) {
  const items = [
    { label: "Password", ok: true },
    { label: "2FA", ok: Boolean(user?.totp_enabled) },
    { label: "PIN", ok: Boolean(user?.has_pin) },
  ];
  const done = items.filter((i) => i.ok).length;
  const pct = Math.round((done / items.length) * 100);
  const full = done === items.length;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              full ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
            }`}
          >
            <Ico name={full ? "shieldcheck" : "shield"} className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{full ? "Fully protected" : "Protection"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {done}/{items.length} enabled
            </p>
          </div>
        </div>
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{pct}%</span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${full ? "bg-emerald-500" : "bg-blue-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((i) => (
          <Badge key={i.label} ok={i.ok}>
            {i.label}
          </Badge>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ password */
function PasswordSection({ onFlash }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const { busy, run } = useAction(onFlash);

  const rules = [
    ["10+ characters", next.length >= 10],
    ["Upper & lower case", /[a-z]/.test(next) && /[A-Z]/.test(next)],
    ["Number", /\d/.test(next)],
  ];
  const level = strength(next);
  const mismatch = again.length > 0 && again !== next;
  const valid = cur && rules.every(([, ok]) => ok) && again === next;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await run(async () => {
      await api.changePassword({ current_password: cur, new_password: next });
      return true;
    });
    if (ok) {
      setCur("");
      setNext("");
      setAgain("");
      onFlash("ok", "Password updated");
    }
  };

  return (
    <Card icon="key" title="Password">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password">
          <PasswordInput value={cur} onChange={setCur} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password">
            <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
          </Field>
          <Field label="Confirm" error={mismatch ? "Doesn't match" : ""}>
            <PasswordInput value={again} onChange={setAgain} autoComplete="new-password" invalid={mismatch} />
          </Field>
        </div>

        <div>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${level >= n ? STRENGTH_COLOR[level] : "bg-slate-100 dark:bg-slate-800"}`}
              />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {rules.map(([label, ok]) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {ok ? <Ico name="check" className="h-3 w-3" /> : <span>•</span>}
                {label}
              </span>
            ))}
            {level > 0 && <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">{STRENGTH_LABEL[level]}</span>}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={busy || !valid} className={primaryBtn}>
            {busy ? "Updating…" : "Update"}
          </button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ 2FA */
function TwoFactorSection({ user, reloadUser, onFlash }) {
  const enabled = Boolean(user?.totp_enabled);
  const [stage, setStage] = useState("idle"); // idle | password | verify | disable
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(null);
  const [copied, setCopied] = useState(false);
  const { busy, run } = useAction(onFlash);

  const reset = () => {
    setStage("idle");
    setPassword("");
    setCode("");
    setSetup(null);
  };

  const startSetup = async (e) => {
    e.preventDefault();
    const ok = await run(async () => {
      setSetup(await api.totpSetup(password));
      return true;
    });
    if (ok) {
      setPassword("");
      setStage("verify");
    }
  };

  const confirmEnable = async (e) => {
    e.preventDefault();
    const ok = await run(async () => {
      await api.totpEnable(code);
      await reloadUser();
      return true;
    });
    if (ok) {
      reset();
      onFlash("ok", "2FA is on");
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    const ok = await run(async () => {
      await api.totpDisable({ password, code });
      await reloadUser();
      return true;
    });
    if (ok) {
      reset();
      onFlash("ok", "2FA is off");
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(setup?.secret || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onFlash("err", "Couldn't copy");
    }
  };

  return (
    <Card icon="shieldcheck" title="Two-factor authentication" badge={<Badge ok={enabled}>{enabled ? "On" : "Off"}</Badge>}>
      {stage === "idle" && (
        <Row icon="phone" title="Authenticator app" sub={enabled ? "Code required at sign-in" : "Not set up"} ok={enabled}>
          <button type="button" className={enabled ? ghostBtn : primaryBtn} onClick={() => setStage(enabled ? "disable" : "password")}>
            {enabled ? "Turn off" : "Set up"}
          </button>
        </Row>
      )}

      {(stage === "password" || stage === "verify") && <Steps current={stage === "password" ? 1 : 2} labels={["Confirm", "Scan & verify"]} />}

      {stage === "password" && (
        <form onSubmit={startSetup} className="max-w-sm space-y-4">
          <Field label="Password">
            <PasswordInput value={password} onChange={setPassword} autoFocus />
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? "Checking…" : "Continue"}
            </button>
            <button type="button" className={ghostBtn} onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {stage === "verify" && setup && (
        <form onSubmit={confirmEnable} className="space-y-5">
          <div className="flex flex-col items-center gap-5 rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-200/60 sm:flex-row dark:bg-slate-800/60 dark:ring-slate-700/60">
            <div className="shrink-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <QRCodeSVG value={setup.uri} size={176} level="M" bgColor="#ffffff" fgColor="#000000" />
            </div>
            <div className="min-w-0 flex-1 self-stretch">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Scan with your app</p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Or enter the key</p>
              <div className="mt-1.5 flex items-stretch gap-2">
                <p className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-semibold tracking-wider text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {setup.secret}
                </p>
                <button type="button" onClick={copyKey} aria-label="Copy key" className={`${ghostBtn} !px-3`}>
                  <Ico name={copied ? "check" : "copy"} className={copied ? "h-4 w-4 text-emerald-500" : "h-4 w-4"} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-xs">
            <Field label="6-digit code">
              <input
                className={`${inputCls} text-center font-mono text-lg tracking-[0.4em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(digitsOnly(e.target.value))}
                required
                autoFocus
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
              {busy ? "Verifying…" : "Turn on"}
            </button>
            <button type="button" className={ghostBtn} onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {stage === "disable" && (
        <form onSubmit={disable} className="max-w-sm space-y-4">
          <Field label="Password">
            <PasswordInput value={password} onChange={setPassword} autoFocus />
          </Field>
          <Field label="Authenticator code">
            <input
              className={`${inputCls} font-mono tracking-widest`}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(digitsOnly(e.target.value))}
              required
            />
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.length !== 6} className={dangerBtn}>
              {busy ? "Turning off…" : "Turn off"}
            </button>
            <button type="button" className={ghostBtn} onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ PIN */
function PinSection({ user, reloadUser, onFlash }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const { busy, run } = useAction(onFlash);
  const hasPin = Boolean(user?.has_pin);

  const weak = weakPin(pin);
  const mismatch = pin2.length === 6 && pin !== pin2;
  const valid = password && pin.length === 6 && !weak && pin === pin2;

  const close = () => {
    setOpen(false);
    setPassword("");
    setPin("");
    setPin2("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await run(async () => {
      await api.setPin({ pin, password });
      await reloadUser();
      return true;
    });
    if (ok) {
      close();
      onFlash("ok", "PIN saved");
    }
  };

  return (
    <Card icon="hash" title="Transaction PIN" badge={<Badge ok={hasPin}>{hasPin ? "Set" : "Not set"}</Badge>}>
      {!open ? (
        <Row icon="hash" title="6-digit PIN" sub={hasPin ? "Required to send money" : "Not set"} ok={hasPin}>
          <button type="button" className={hasPin ? ghostBtn : primaryBtn} onClick={() => setOpen(true)}>
            {hasPin ? "Change" : "Set PIN"}
          </button>
        </Row>
      ) : (
        <form onSubmit={submit} className="max-w-sm space-y-4">
          <Field label="Password">
            <PasswordInput value={password} onChange={setPassword} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="New PIN" error={weak ? "Too easy to guess" : ""}>
              <input
                className={`${inputCls} font-mono tracking-widest ${weak ? invalidCls : ""}`}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(digitsOnly(e.target.value))}
                required
              />
            </Field>
            <Field label="Confirm" error={mismatch ? "Doesn't match" : ""}>
              <input
                className={`${inputCls} font-mono tracking-widest ${mismatch ? invalidCls : ""}`}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••••"
                value={pin2}
                onChange={(e) => setPin2(digitsOnly(e.target.value))}
                required
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !valid} className={primaryBtn}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className={ghostBtn} onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ devices */
function SessionsSection({ onLogout, onFlash }) {
  const [sessions, setSessions] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const { busy, run } = useAction(onFlash);

  const load = useCallback(async () => {
    try {
      const list = await api.sessions();
      setSessions([...list].sort((a, b) => Number(b.current) - Number(a.current)));
    } catch (e) {
      setSessions([]);
      onFlash("err", e.message || "Couldn't load devices");
    }
  }, [onFlash]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id) => {
    setRevoking(id);
    try {
      await api.revokeSession(id);
      await load();
      onFlash("ok", "Signed out");
    } catch (e) {
      onFlash("err", e.message || "Couldn't sign out");
    } finally {
      setRevoking(null);
    }
  };

  const signOutAll = async () => {
    const ok = await run(async () => {
      await api.logoutAll();
      return true;
    });
    if (ok) {
      onFlash("ok", "Signed out everywhere");
      onLogout({ skipServer: true, silent: true });
    }
  };

  const others = sessions ? sessions.filter((s) => !s.current).length : 0;

  return (
    <Card
      icon="devices"
      title="Devices"
      badge={
        sessions !== null && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {sessions.length}
          </span>
        )
      }
    >
      {sessions === null ? (
        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No active sessions</p>
      ) : (
        <ul className="space-y-2.5">
          {sessions.map((s) => {
            const mobile = /Android|iPhone|iPad/.test(s.user_agent || "");
            const { date, time } = stamp(s.created_at);
            return (
              <li
                key={s.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                  s.current
                    ? "border-blue-200 bg-blue-50/40 dark:border-blue-500/30 dark:bg-blue-500/5"
                    : "border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      s.current ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <Ico name={mobile ? "phone" : "devices"} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {describeAgent(s.user_agent)}
                      {s.current && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                          This device
                        </span>
                      )}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono">{s.ip || "Unknown IP"}</span>
                      <span aria-hidden="true">·</span>
                      <span>{date}</span>
                      <span aria-hidden="true">·</span>
                      <span>{time}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium dark:bg-slate-800">{ago(s.created_at)}</span>
                    </div>
                  </div>
                </div>

                {!s.current && (
                  <button type="button" disabled={revoking === s.id || busy} onClick={() => revoke(s.id)} className={`${ghostBtn} !py-2`}>
                    {revoking === s.id ? "Signing out…" : "Sign out"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sessions !== null && sessions.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {!confirmAll ? (
            <button type="button" disabled={busy} onClick={() => setConfirmAll(true)} className={ghostBtn}>
              Sign out everywhere
            </button>
          ) : (
            <>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Sign out {others > 0 ? `${others + 1} devices` : "this device"}?
              </span>
              <button type="button" disabled={busy} onClick={signOutAll} className={dangerBtn}>
                {busy ? "Signing out…" : "Confirm"}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmAll(false)} className={ghostBtn}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ delete account */
function DeleteSection({ user, onLogout, onFlash }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [confirm, setConfirm] = useState("");
  const { busy, run } = useAction(onFlash);

  const typed = confirm.trim().toUpperCase() === "DELETE";
  const ready = password && typed && (!user?.totp_enabled || otp.length === 6);

  const close = () => {
    setOpen(false);
    setPassword("");
    setOtp("");
    setConfirm("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    const ok = await run(async () => {
      await api.deleteAccount({ password, otp: user?.totp_enabled ? otp : null, confirm });
      return true;
    });
    if (ok) {
      onFlash("ok", "Account deleted");
      onLogout({ skipServer: true, silent: true });
    }
  };

  const terms = ["Balance must be ₹0", "Bank accounts are removed", "History is kept, anonymised"];

  return (
    <Card icon="trash" title="Delete account" tone="danger">
      <ul className="mb-5 space-y-2 rounded-xl border border-red-100 bg-red-50/60 p-4 dark:border-red-500/20 dark:bg-red-500/10">
        {terms.map((t) => (
          <li key={t} className="flex items-center gap-2.5 text-sm text-red-900/90 dark:text-red-200/90">
            <Ico name="alert" className="h-4 w-4 shrink-0 text-red-500" />
            {t}
          </li>
        ))}
      </ul>

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={dangerGhostBtn}>
          Delete account
        </button>
      ) : (
        <form onSubmit={submit} className="max-w-sm space-y-4">
          <Field label="Password">
            <PasswordInput value={password} onChange={setPassword} autoFocus />
          </Field>
          {user?.totp_enabled && (
            <Field label="Authenticator code">
              <input
                className={`${inputCls} font-mono tracking-widest`}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(digitsOnly(e.target.value))}
                required
              />
            </Field>
          )}
          <Field label='Type "DELETE"'>
            <div className="relative">
              <input
                className={`${inputCls} pr-10 font-mono tracking-wider`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                required
              />
              {typed && <Ico name="check" className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />}
            </div>
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !ready} className={dangerBtn}>
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button type="button" className={ghostBtn} onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}