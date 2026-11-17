// frontend/src/components/theme/ThemeControls.jsx
import { useTheme } from "./ThemeProvider.jsx";

const iconProps = {
  className: "h-5 w-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/** Icon button for the top bar: flips between light and dark. */
export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/* ------------------------------------------------------------------ Settings card */
const OPTIONS = [
  { id: "light", label: "Light", hint: "Always light" },
  { id: "dark", label: "Dark", hint: "Easier on the eyes at night" },
  { id: "system", label: "System", hint: "Match your device" },
];

// Fixed colours on purpose: the previews must look the same in either theme.
const SWATCH = {
  light: { page: "bg-[#f1f5f9]", card: "bg-[#ffffff]", line: "bg-[#cbd5e1]" },
  dark: { page: "bg-[#020617]", card: "bg-[#0f172a]", line: "bg-[#334155]" },
};

function Mini({ t }) {
  return (
    <div className={`flex-1 space-y-1.5 p-2 ${t.page}`}>
      <div className={`h-1.5 w-8 rounded ${t.line}`} />
      <div className={`h-6 rounded ${t.card}`} />
    </div>
  );
}

function Preview({ kind }) {
  return (
    <div className="flex h-16 overflow-hidden rounded-lg border border-[#cbd5e1]" aria-hidden="true">
      {kind === "system" ? (
        <>
          <Mini t={SWATCH.light} />
          <Mini t={SWATCH.dark} />
        </>
      ) : (
        <Mini t={SWATCH[kind]} />
      )}
    </div>
  );
}

/** Light / Dark / System picker for Settings. */
export function AppearanceCard() {
  const { mode, setMode } = useTheme();
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Appearance</h2>
      <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">Choose how Payzo looks on this device.</p>

      <div role="radiogroup" aria-label="Theme" className="mt-4 grid max-w-xl gap-3 sm:grid-cols-3">
        {OPTIONS.map((o) => {
          const selected = mode === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(o.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
            >
              <Preview kind={o.id} />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{o.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{o.hint}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}