// frontend/src/components/AuthForm.jsx
import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import logo from "../assets/image2.png";

const OTP_LENGTH = 6;

/** Six single-digit boxes. Supports typing, backspace, arrow keys, paste and SMS/app autofill. */
function OtpInput({ value, onChange, disabled, containerRef }) {
  const refs = useRef([]);
  const focusAt = (i) => refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))]?.focus();

  const handleChange = (i, e) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) return;
    const next = (value.slice(0, i) + digits).slice(0, OTP_LENGTH);
    onChange(next);
    focusAt(next.length);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focusAt(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  };

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    e.preventDefault();
    onChange(digits);
    focusAt(digits.length);
  };

  return (
    <div ref={containerRef} className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          maxLength={OTP_LENGTH}
          disabled={disabled}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 sm:h-14"
        />
      ))}
    </div>
  );
}

export default function AuthForm({
  onAuthed,
  initialMode = "login",
  onBack,
}) {
  const [mode, setMode] = useState(initialMode);
  // "credentials" = email + password, "otp" = two-step verification (slides in after the password is accepted)
  const [step, setStep] = useState("credentials");
  const [otp, setOtp] = useState("");
  const otpRef = useRef(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    remember: true,
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (key) => (e) => {
    const value =
      e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const focusOtp = (delay = 0) =>
    setTimeout(() => otpRef.current?.querySelector("input")?.focus(), delay);

  async function submit(e) {
    e?.preventDefault();
    if (busy) return;

    if (mode === "login" && step === "otp" && otp.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from your authenticator app.`);
      return;
    }

    setError("");
    setBusy(true);

    try {
      const payload =
        mode === "login"
          ? {
            email: form.email,
            password: form.password,
            ...(step === "otp" ? { otp } : {}),
          }
          : {
            name: `${form.firstName} ${form.lastName}`.trim(),
            email: form.email,
            password: form.password,
          };

      const res =
        mode === "login"
          ? await api.login(payload)
          : await api.register(payload);

      await onAuthed(res.access_token);
    } catch (err) {
      if (mode === "login" && step === "credentials" && err.message === "otp_required") {
        // Password was correct and this account has 2FA: slide in the verification step
        setOtp("");
        setStep("otp");
        focusOtp(400);
      } else {
        setError(err.message || "Something went wrong.");
        if (step === "otp") {
          setOtp("");
          focusOtp(0);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  // Verify automatically as soon as the last digit is entered
  useEffect(() => {
    if (step === "otp" && otp.length === OTP_LENGTH) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  function switchMode() {
    setMode((prev) =>
      prev === "login" ? "register" : "login"
    );
    setStep("credentials");
    setOtp("");
    setError("");
  }

  function backToCredentials() {
    setStep("credentials");
    setOtp("");
    setError("");
  }

  const otpActive = step === "otp";
  const slide = "col-start-1 row-start-1 transition-all duration-500 ease-in-out";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">

      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl md:grid md:grid-cols-2">

        {/* LEFT SIDE - AUTHENTICATION */}

        <section className="flex flex-col justify-center px-6 py-8 sm:px-10 md:px-12 lg:px-14">

          {/* One back button, always in the same spot:
              login / sign-up  -> "Back to Home"
              2FA step         -> "Back" (returns to email + password) */}
          {(onBack || otpActive) && (
            <button
              type="button"
              onClick={otpActive ? backToCredentials : onBack}
              className="mb-7 flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
            >
              <span className="text-lg">←</span>
              {otpActive ? "Back" : "Back to Home"}
            </button>
          )}

          {/* Sliding area: only this column animates, the right-hand panel is never touched */}
          <div className="-mx-1 grid overflow-hidden px-1 py-1">

            {/* STEP 1 - EMAIL + PASSWORD */}
            <div
              className={`${slide} ${otpActive ? "pointer-events-none -translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}
              aria-hidden={otpActive}
              inert={otpActive ? "" : undefined}
            >
              {/* Heading */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {mode === "login"
                    ? "Welcome back!"
                    : "Create an account"}
                </h1>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  {mode === "login"
                    ? "Sign in to access your wallet and manage your money."
                    : "Join Payzo and experience a simpler way to manage your digital wallet."}
                </p>
              </div>

              {/* Authentication Form */}
              <form onSubmit={submit} className="space-y-5">

                {/* Name Fields */}
                {mode === "register" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    <label className="field">
                      First Name

                      <input
                        type="text"
                        value={form.firstName}
                        onChange={set("firstName")}
                        placeholder="First name"
                        autoComplete="given-name"
                        required
                        className="input"
                      />
                    </label>

                    <label className="field">
                      Last Name

                      <input
                        type="text"
                        value={form.lastName}
                        onChange={set("lastName")}
                        placeholder="Last name"
                        autoComplete="family-name"
                        required
                        className="input"
                      />
                    </label>

                  </div>
                )}

                {/* Email */}
                <label className="field">
                  Email Address

                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="input"
                  />
                </label>

                {/* Password */}
                <label className="field">
                  Password

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      placeholder="Enter your password"
                      autoComplete={
                        mode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      minLength={8}
                      required
                      className="input w-full pr-14"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 hover:text-blue-600"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                {/* Remember Me */}
                {mode === "login" && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.remember}
                      onChange={set("remember")}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Remember me
                  </label>
                )}

                {/* Error */}
                {error && !otpActive && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                  >
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 py-4 font-semibold text-white shadow-lg shadow-blue-600/25 transition duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {busy && !otpActive
                    ? "Please wait..."
                    : mode === "login"
                      ? "Login to Payzo →"
                      : "Create My Account →"}
                </button>

              </form>

              {/* Switch Mode */}
              <div className="mt-8 text-center text-sm text-slate-500">
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}

                    <button
                      type="button"
                      onClick={switchMode}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}

                    <button
                      type="button"
                      onClick={switchMode}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Login
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* STEP 2 - TWO-STEP VERIFICATION (slides in from the right) */}
            <div
              className={`${slide} ${otpActive ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"}`}
              aria-hidden={!otpActive}
              inert={!otpActive ? "" : undefined}
            >
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Two-step verification
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                Enter the {OTP_LENGTH}-digit code from your authenticator app to finish signing in.
              </p>

              {/* Account being signed in */}
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold uppercase text-white">
                  {(form.email || "?").charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Signing in as</p>
                  <p className="truncate text-sm font-semibold text-slate-800">{form.email}</p>
                </div>
                <button
                  type="button"
                  onClick={backToCredentials}
                  className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Change
                </button>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-5">
                <OtpInput
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    if (error) setError("");
                  }}
                  disabled={busy}
                  containerRef={otpRef}
                />

                {error && otpActive && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy || otp.length !== OTP_LENGTH}
                  className="w-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 py-4 font-semibold text-white shadow-lg shadow-blue-600/25 transition duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {busy ? "Verifying..." : "Verify & Sign in →"}
                </button>

                <p className="text-center text-xs leading-5 text-slate-400">
                  The code changes every 30 seconds. Open your authenticator app to see the current one.
                </p>
              </form>
            </div>

          </div>
        </section>

        {/* RIGHT SIDE - PROMOTIONAL PANEL (unchanged) */}

        <section className="relative hidden min-h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#071225] via-[#102d55] to-blue-800 p-10 text-white md:flex">

          {/* Background Effects */}
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative z-10 max-w-sm text-center">

            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">
              Digital Wallet
            </p>

            <p className="mt-6 leading-7 text-blue-100/70">
              Manage your wallet, keep track of transactions
              and enjoy a simpler digital payment experience.
            </p>

            {/* Decorative Wallet Card */}
            <div className="mt-12 rotate-[-3deg] rounded-3xl border border-white/20 bg-white/10 p-6 text-left shadow-2xl backdrop-blur-xl transition duration-500 hover:rotate-0">

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-100">
                  PAYZO WALLET
                </span>

                <span className="text-2xl">
                  <img
                    src={logo}
                    alt="Payzo Logo"
                    className="h-10 w-10 object-contain"
                  />
                </span>
              </div>

              <p className="mt-9 text-sm text-blue-100/70">
                Your wallet, your control
              </p>

              <p className="mt-2 text-3xl font-bold">
                ₹ ••••••
              </p>

              <div className="mt-8 flex items-center justify-between">
                <span className="text-xs text-blue-100/70">
                  SECURE DIGITAL WALLET
                </span>

                <span className="rounded-full bg-green-400/20 px-3 py-1 text-xs text-green-300">
                  Protected
                </span>
              </div>

            </div>

            <div className="mt-10 flex justify-center gap-6 text-xs text-blue-100/70">
              <span>✓ Secure</span>
              <span>✓ Simple</span>
              <span>✓ Convenient</span>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}