// frontend/src/App.jsx
import { useEffect, useState } from "react";
import { api, getToken, setToken, clearToken } from "./api.js";

import { ToastProvider, useToast } from "./components/toast/ToastProvider.jsx";
import { ThemeProvider } from "./components/theme/ThemeProvider.jsx";

import LandingPage from "./pages/LandingPage.jsx";
import AuthForm from "./components/AuthForm.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { notify } = useToast();

  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  // Show a notice left behind by a page reload
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("payzo_flash");

      if (!raw) return;

      sessionStorage.removeItem("payzo_flash");

      const f = JSON.parse(raw);
      notify(f.type, f.text);
    } catch {
      // Ignore invalid flash messages
    }
  }, [notify]);

  // Check existing login session
  useEffect(() => {
    if (!getToken()) return;

    api.me()
      .then(setUser)
      .catch((e) => {
        clearToken();

        notify(
          "err",
          e.message || "Couldn't load your account. Please sign in again."
        );
      })
      .finally(() => setLoading(false));
  }, [notify]);

  // Handle successful authentication
  async function onAuthed(token) {
    setToken(token);

    const currentUser = await api.me();

    setUser(currentUser);
    setAuthMode(null);

    notify(
      "ok",
      `Welcome, ${(currentUser.name || "").split(" ")[0] || "back"}`
    );
  }

  async function logout({ skipServer = false, silent = false } = {}) {
    if (!skipServer) {
      try {
        await api.logout();
      } catch {
        // Token may already be invalid
      }
    }

    clearToken();
    setUser(null);
    setAuthMode(null);

    if (!silent) {
      notify("ok", "You've been signed out");
    }
  }

  // Loading screen
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071225] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-500" />

          <p className="text-sm text-slate-400">
            Connecting to Payzo...
          </p>
        </div>
      </div>
    );
  }

  // Dashboard
  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={logout}
        onUserChange={setUser}
      />
    );
  }

  // Login / Registration
  if (authMode) {
    return (
      <AuthForm
        initialMode={authMode}
        onAuthed={onAuthed}
        onBack={() => setAuthMode(null)}
      />
    );
  }

  // Landing page
  return (
    <LandingPage
      onLogin={() => setAuthMode("login")}
      onRegister={() => setAuthMode("register")}
    />
  );
}