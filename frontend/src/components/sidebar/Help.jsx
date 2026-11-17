// frontend/src/components/help/Help.jsx
import { useMemo, useState } from "react";
import { inr } from "./Formatters.js";

// Change this to your real support address
const SUPPORT_EMAIL = "support@payzo.app";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "start", label: "Getting started" },
  { id: "payments", label: "Payments" },
  { id: "security", label: "Security" },
  { id: "account", label: "Account" },
];

const CAT_LABELS = {
  start: "Getting started",
  payments: "Payments",
  security: "Security",
  account: "Account",
};

// `a` receives live data: { user, wallet, limits, balance }
// `action.to` is "tab:<dashboard|wallets|activity>" or "settings:<profile|security|sessions|danger>"
const FAQS = [
  {
    id: "add-money",
    cat: "start",
    q: "How do I add money to my wallet?",
    keywords: "top up topup deposit fund",
    a: ({ limits, balance }) =>
      `Open Add Money, enter an amount (or pick a preset) and confirm. Your wallet can hold up to ${inr(limits?.max_balance)}` +
      (balance != null ? `, and you currently have ${inr(balance)}.` : "."),
    action: { label: "Add money", to: "tab:wallets" },
  },
  {
    id: "wallet-id",
    cat: "start",
    q: "Where do I find my Wallet ID?",
    keywords: "account number id receive",
    a: ({ user }) =>
      `Your Wallet ID is ${user?.wallet_no || "shown in Settings → Profile"}. People can pay you with it, or with your phone number if you've added one in Settings → Profile and allowed others to find you by it.`,
    action: { label: "View profile", to: "settings:profile" },
  },
  {
    id: "send",
    cat: "payments",
    q: "How do I send money?",
    keywords: "transfer pay recipient wallet id phone number",
    a: ({ user }) =>
      "Go to Send Money, enter the recipient's Wallet ID or phone number, the amount and an optional note. Email can't be used to send money. " +
      (user?.has_pin ? "You'll also need your 6-digit transaction PIN. " : "") +
      "Transfers are instant.",
    action: { label: "Send money", to: "tab:dashboard" },
  },
  {
    id: "limits",
    cat: "payments",
    q: "What are my sending and balance limits?",
    keywords: "limit daily maximum kyc verified",
    a: ({ limits, user }) =>
      limits
        ? `Per transaction: ${inr(limits.per_txn)}. Daily: ${inr(limits.daily)} (${inr(limits.daily_remaining)} left today). ` +
          `Maximum wallet balance: ${inr(limits.max_balance)}. ` +
          (user?.kyc_status === "VERIFIED"
            ? "You have the higher verified limits."
            : "Verifying your identity raises these limits.")
        : "Your limits will appear here once your wallet loads.",
  },
  {
    id: "failed",
    cat: "payments",
    q: "Why did my transfer fail?",
    keywords: "error declined not working insufficient",
    a: ({ limits, balance }) =>
      "The most common reasons: the amount is more than your balance" +
      (balance != null ? ` (${inr(balance)})` : "") +
      (limits ? `, above your ${inr(limits.per_txn)} per-transaction or ${inr(limits.daily)} daily limit` : "") +
      ", no wallet matches the Wallet ID or phone number, the recipient's wallet is full, or the PIN was wrong. The error message under the form tells you which.",
  },
  {
    id: "pending",
    cat: "payments",
    q: "My payment shows as pending. What should I do?",
    keywords: "stuck processing waiting",
    a: () =>
      "Pending means the bank hasn't confirmed yet. Don't retry straight away: it will move to Success or Failed on its own, and any failed amount is returned to your wallet. Use Refresh on the card to check.",
    action: { label: "View activity", to: "tab:activity" },
  },
  {
    id: "cancel",
    cat: "payments",
    q: "Can I cancel or reverse a transfer?",
    keywords: "undo refund wrong person",
    a: () =>
      "Transfers between wallets are instant and can't be cancelled. If you sent money to the wrong person, ask them to send it back, and contact support with the Reference ID from the receipt.",
  },
  {
    id: "export",
    cat: "payments",
    q: "How do I download my transaction history?",
    keywords: "csv export statement download",
    a: () => "Open Activity and use Export CSV. It exports whatever the current filter and search show.",
    action: { label: "Open activity", to: "tab:activity" },
  },
  {
    id: "2fa",
    cat: "security",
    q: "How do I turn on two-factor authentication?",
    keywords: "2fa totp authenticator otp code",
    a: ({ user }) =>
      user?.totp_enabled
        ? "Two-factor authentication is already on for your account. You can turn it off in Settings → Security."
        : "It's off right now. Set it up in Settings → Security by scanning a QR code with Google Authenticator, Authy or similar.",
    action: { label: "Open security", to: "settings:security" },
  },
  {
    id: "pin",
    cat: "security",
    q: "How do I set or change my transaction PIN?",
    keywords: "pin forgot reset 6 digit",
    a: ({ user }) =>
      (user?.has_pin ? "You have a PIN set. " : "You haven't set a PIN yet. ") +
      "Set or change it in Settings → Security (you'll confirm your password). Five wrong PIN attempts lock it for about 15 minutes.",
    action: { label: "Open security", to: "settings:security" },
  },
  {
    id: "locked",
    cat: "security",
    q: "I'm locked out after too many attempts.",
    keywords: "locked login blocked failed password",
    a: () =>
      "After 5 wrong passwords, sign-in is locked for about 15 minutes. Wait, then try again with the correct password and, if enabled, a fresh authenticator code.",
  },
  {
    id: "suspicious",
    cat: "security",
    q: "I think someone else is using my account.",
    keywords: "hacked unauthorised unauthorized stolen devices",
    a: () =>
      "Act quickly: sign out other devices, change your password, then turn on two-factor authentication. Contact support if you see transactions you don't recognise.",
    action: { label: "Review devices", to: "settings:sessions" },
  },
  {
    id: "name",
    cat: "account",
    q: "How do I change my name or email?",
    keywords: "profile edit update",
    a: () =>
      "You can change your name in Settings → Profile. Email can't be changed yet; contact support if you need to update it.",
    action: { label: "Edit profile", to: "settings:profile" },
  },
  {
    id: "hide",
    cat: "account",
    q: "How do I hide my balance?",
    keywords: "privacy eye mask",
    a: () =>
      "Use the eye icon at the top of My Card on the dashboard. It hides the amount until you tap it again.",
    action: { label: "Go to dashboard", to: "tab:dashboard" },
  },
  {
    id: "delete",
    cat: "account",
    q: "How do I delete my account?",
    keywords: "close remove cancel",
    a: ({ balance }) =>
      "Go to Settings → Delete account. Your balance must be ₹0 first" +
      (balance != null && Number(balance) > 0 ? ` (you have ${inr(balance)} left to move out)` : "") +
      ". This can't be undone.",
    action: { label: "Open delete account", to: "settings:danger" },
  },
];

function Chevron({ open }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180 text-blue-600 dark:text-blue-400" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function Help({ user, wallet, onNavigate, onOpenSettings }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const ctx = useMemo(
    () => ({ user, wallet, limits: wallet?.limits, balance: wallet?.balance }),
    [user, wallet]
  );

  const go = (to) => {
    const [kind, target] = to.split(":");
    if (kind === "settings") onOpenSettings(target);
    else onNavigate(target);
  };

  const categoryCounts = useMemo(() => {
    const counts = { all: FAQS.length, start: 0, payments: 0, security: 0, account: 0 };
    for (const f of FAQS) counts[f.cat] = (counts[f.cat] || 0) + 1;
    return counts;
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (cat !== "all" && f.cat !== cat) return false;
      if (!q) return true;
      return `${f.q} ${f.keywords} ${f.a(ctx)}`.toLowerCase().includes(q);
    });
  }, [query, cat, ctx]);

  const checklist = [
    {
      id: "pin",
      done: Boolean(user?.has_pin),
      doneText: "Transaction PIN is set",
      todoText: "Set a transaction PIN to protect transfers",
      action: { label: "Set PIN", to: "settings:security" },
    },
    {
      id: "2fa",
      done: Boolean(user?.totp_enabled),
      doneText: "Two-factor authentication is on",
      todoText: "Turn on two-factor authentication",
      action: { label: "Enable 2FA", to: "settings:security" },
    },
    {
      id: "kyc",
      done: user?.kyc_status === "VERIFIED",
      doneText: "Identity verified · higher limits active",
      todoText: "Identity not verified · standard limits apply",
    },
    {
      id: "funds",
      done: wallet ? Number(wallet.balance) > 0 : true,
      doneText: `Wallet balance: ${inr(wallet?.balance)}`,
      todoText: "Your wallet balance is ₹0.00",
      action: { label: "Add money", to: "tab:wallets" },
    },
  ];

  const completedCount = checklist.filter((c) => c.done).length;
  const pending = checklist.length - completedCount;

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Payzo support request")}&body=${encodeURIComponent(
    `Hi Payzo team,\n\n[Describe your issue here]\n\n--\nName: ${user?.name || ""}\nEmail: ${user?.email || ""}\nWallet ID: ${user?.wallet_no || ""}`
  )}`;

  const copySupportEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Clipboard blocked; mailto link remains available
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
      {/* Main FAQ Column */}
      <div className="space-y-5 lg:col-span-8">
        {/* Search & Filter Header Card */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">How can we help?</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Search answers tailored to your account, limits, and security settings.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {results.length} {results.length === 1 ? "article" : "articles"}
            </span>
          </div>

          <div className="relative mt-4">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenId(null);
              }}
              placeholder="Search topics: limits, PIN, failed transfer, CSV…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = cat === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[#0B1246] text-white shadow-sm dark:bg-blue-600"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-slate-100"
                  }`}
                >
                  <span>{c.label}</span>
                  <span className={`text-[11px] ${active ? "text-blue-200" : "text-slate-400"}`}>
                    {categoryCounts[c.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* FAQ List Card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No answers match &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try a shorter keyword, or reach out to our support team.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCat("all");
                }}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((f) => {
                const open = openId === f.id;
                return (
                  <li key={f.id} className={open ? "bg-blue-50/30 dark:bg-blue-500/10" : ""}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`help-faq-${f.id}`}
                      onClick={() => setOpenId(open ? null : f.id)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {CAT_LABELS[f.cat]}
                        </span>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{f.q}</p>
                      </div>
                      <Chevron open={open} />
                    </button>

                    {open && (
                      <div id={`help-faq-${f.id}`} className="px-6 pb-5 pt-0.5">
                        <p className="max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {f.a(ctx)}
                        </p>
                        {f.action && (
                          <button
                            type="button"
                            onClick={() => go(f.action.to)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                          >
                            <span>{f.action.label}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Right Sticky Sidebar Column */}
      <div className="space-y-5 lg:sticky lg:top-24 lg:col-span-4">
        {/* Account Health Checklist */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Account status</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                pending ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${pending ? "bg-amber-500" : "bg-emerald-500"}`} />
              {pending ? `${pending} to do` : "All set"}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(completedCount / checklist.length) * 100}%` }}
            />
          </div>

          <ul className="mt-4 space-y-3">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5 text-sm">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    c.done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  }`}
                >
                  {c.done ? "✓" : "!"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={c.done ? "text-slate-600 dark:text-slate-300" : "font-medium text-slate-900 dark:text-slate-100"}>
                    {c.done ? c.doneText : c.todoText}
                  </p>
                  {!c.done && c.action && (
                    <button
                      type="button"
                      onClick={() => go(c.action.to)}
                      className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {c.action.label} →
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact Support Card */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Need more help?</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">We usually reply within 24 hours.</p>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Your name, email, and Wallet ID are pre-filled so our team can locate your account faster.
          </p>

          <div className="mt-4 space-y-2">
            <a
              href={mailto}
              className="block w-full rounded-xl bg-[#0B1246] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#14206E] dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Email support
            </a>
            <button
              type="button"
              onClick={copySupportEmail}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
            >
              {copiedEmail ? "Copied support@payzo.app ✓" : `Copy ${SUPPORT_EMAIL}`}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            For a specific transfer, include the Reference ID from its receipt.
          </p>
        </section>
      </div>
    </div>
  );
}