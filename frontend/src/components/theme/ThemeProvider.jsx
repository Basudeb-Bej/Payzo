// frontend/src/components/theme/ThemeProvider.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "payzo_theme"; // "light" | "dark" | "system"  (index.html reads the same key)
const MODES = ["light", "dark", "system"];
const ThemeContext = createContext(null);

function readMode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

const prefersDark = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);

// Puts the `dark` class on <html> and tells the browser to draw scrollbars / date pickers to match.
function apply(mode) {
  const dark = mode === "dark" || (mode === "system" && prefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  return dark;
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readMode);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    setIsDark(apply(mode));
    if (mode !== "system") return undefined;

    // follow the device while "System" is selected
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setIsDark(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  // keep several open tabs in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setModeState(readMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked: the choice still applies for this session */
    }
    setModeState(next);
  }, []);

  const toggle = useCallback(() => setMode(isDark ? "light" : "dark"), [isDark, setMode]);

  const value = useMemo(() => ({ mode, isDark, setMode, toggle }), [mode, isDark, setMode, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}