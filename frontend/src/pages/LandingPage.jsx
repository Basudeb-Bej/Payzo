// frontend/src/pages/LandingPage.jsx
import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

/* =====================================================================
   BACKGROUND VIDEO (optional)
   Drop a short, muted, looping clip (ideally < 3 MB, 1080p, H.264 .mp4)
   into frontend/public and point to it here, e.g. "/hero.mp4".
   Leave it empty to use the built-in animated payment network instead.
   ===================================================================== */

const HERO_VIDEO = "";
const HERO_POSTER = "";

/* =====================================================================
   CONTENT
   ===================================================================== */

const TRUST = [
  ["key", "PIN on every payment"],
  ["shield", "Two-factor sign-in"],
  ["lock", "Encrypted bank details"],
  ["receipt", "Immutable ledger receipts"],
];

const FEATURES = [
  [
    "bolt",
    "Instant Transfers",
    "Send money to another wallet in seconds using a Wallet ID, phone number, or QR code.",
  ],
  [
    "qr",
    "QR Pay & Receive",
    "Display your personal QR code to get paid or scan a recipient's code directly.",
  ],
  [
    "bank",
    "Bank Withdrawals",
    "Link your bank account once and transfer funds out whenever you need them.",
  ],
  [
    "chart",
    "Real-Time Tracking",
    "Monitor your available balance, money flow, and full history in one place.",
  ],
  [
    "receipt",
    "Verified Receipts",
    "Inspect any transaction for its timestamp, counterparty, reference ID, and status.",
  ],
  [
    "shield",
    "Layered Security",
    "Protected by a 6-digit transaction PIN, optional 2FA, and automated sign-in limits.",
  ],
];

const STEPS = [
  [
    "user",
    "Create your account",
    "Sign up with your name, email, and a strong password. Your INR wallet is provisioned immediately.",
  ],
  [
    "bank",
    "Add funds & link bank",
    "Top up your wallet balance and link a verified bank account for seamless withdrawals.",
  ],
  [
    "send",
    "Pay and get paid",
    "Send money via Wallet ID, phone number, or QR code, authorize with your PIN, and get an instant receipt.",
  ],
];

const SECURITY = [
  [
    "key",
    "Transaction PIN",
    "A 6-digit PIN authorizes every payment and withdrawal. Repeated failed attempts trigger a temporary lock.",
  ],
  [
    "phone",
    "Two-Factor Authentication",
    "Pair an authenticator app so a compromised password alone can never access your funds.",
  ],
  [
    "lock",
    "Encrypted Bank Details",
    "Account numbers are encrypted at rest and masked everywhere—only the last 4 digits are displayed.",
  ],
  [
    "shield",
    "Brute-Force Protection",
    "Suspicious sign-in attempts are automatically rate-limited and flagged to protect your account.",
  ],
  [
    "clock",
    "Session Safeguards",
    "Idle sessions expire automatically, with one-click sign-out across all active devices.",
  ],
  [
    "receipt",
    "Double-Entry Ledger",
    "Every rupee is recorded in an auditable ledger so balances always reconcile accurately.",
  ],
];

const FAQ = [
  [
    "How do I pay someone on Payzo?",
    "Open Send Money, enter the recipient's Wallet ID or phone number (or scan their QR code), verify their name, enter the amount, and confirm with your 6-digit PIN.",
  ],
  [
    "Are there transaction limits?",
    "Yes. Limits depend on your verification tier. Your per-transaction cap and remaining daily allowance are always displayed before you confirm a payment.",
  ],
  [
    "Do I need to verify my identity?",
    "You can get started immediately with standard limits. Completing identity verification (KYC) unlocks higher daily and per-transfer limits.",
  ],
  [
    "What happens if a bank withdrawal fails?",
    "If your bank rejects or cannot process a payout, the full amount is automatically returned to your Payzo wallet and logged in your activity feed.",
  ],
  [
    "How do I keep my account safe?",
    "Set a unique 6-digit transaction PIN, enable two-factor authentication, and never share your PIN or one-time codes. Payzo will never ask for them.",
  ],
];

/* =====================================================================
   HOOKS & UTILITIES
   ===================================================================== */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useInView(threshold = 0.14) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
      setSeen(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, seen];
}

function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }

    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function useInterval(fn, ms) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

function useScrollY(threshold) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return past;
}

function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const [ref, seen] = useInView();

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: seen ? `${delay}ms` : "0ms" }}
      className={`transition duration-700 ease-out ${
        seen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Card with a soft light that follows the cursor. */
function SpotCard({ className = "", line = "blue", children, ...rest }) {
  const move = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <Reveal as="li" onMouseMove={move} className={`pz-spot ${className}`} {...rest}>
      <span aria-hidden="true" className="pz-spot-glow" />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100 ${
          line === "cyan" ? "via-cyan-300/45" : "via-blue-400/50"
        }`}
      />
      <div className="relative">{children}</div>
    </Reveal>
  );
}

/** Thin progress bar at the very top. Isolated so only it re-renders while scrolling. */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    const calc = () => {
      raf = 0;
      const root = document.documentElement;
      const max = root.scrollHeight - root.clientHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };

    calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div
        className="h-full origin-left bg-gradient-to-r from-blue-500 via-cyan-300 to-blue-500"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

/* =====================================================================
   ICONS
   ===================================================================== */

const ICONS = {
  arrow: ["M5 12h14M13 6l6 6-6 6"],
  check: ["M5 13l4 4L19 7"],
  bolt: ["M13 2L4 14h7l-1 8 9-12h-7l1-8z"],
  lock: [
    "M7 11V8a5 5 0 0110 0v3",
    "M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z",
  ],
  chart: ["M5 20V11M12 20V4M19 20v-7"],
  qr: [
    "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z",
    "M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z",
  ],
  bank: ["M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"],
  receipt: ["M6 3h12v18l-3-2-3 2-3-2-3 2V3z", "M9 8h6M9 12h6"],
  key: [
    "m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  ],
  shield: [
    "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
    "M9 12l2 2 4-4",
  ],
  phone: [
    "M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2z",
    "M11 18h2",
  ],
  clock: ["M12 3a9 9 0 100 18 9 9 0 000-18z", "M12 7v5l3 2"],
  user: [
    "M15 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1",
    "M9 11a4 4 0 100-8 4 4 0 000 8z",
    "M19 8v6M22 11h-6",
  ],
  send: ["M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"],
  down: ["M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"],
  chevron: ["M6 9l6 6 6-6"],
};

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {(ICONS[name] || []).map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}

/* =====================================================================
   STYLES & MOTION
   ===================================================================== */

const STYLES = `
.payzo-landing {
  --pz-ease: cubic-bezier(.2,.7,.2,1);
  min-width: 0;
}

@keyframes pz-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: none; }
}

@keyframes pz-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pz-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes pz-word {
  from { opacity: 0; transform: translateY(65%); }
  to { opacity: 1; transform: none; }
}

@keyframes pz-scan {
  0% { top: 8%; }
  100% { top: 88%; }
}

@keyframes pz-pop {
  0% { opacity: 0; transform: scale(.6); }
  75% { transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes pz-draw {
  from { stroke-dashoffset: 48; }
  to { stroke-dashoffset: 0; }
}

@keyframes pz-dot {
  from { background: #334155; transform: scale(1); }
  50% { transform: scale(1.35); }
  to { background: #60a5fa; transform: scale(1); }
}

@keyframes pz-beam {
  0% { transform: translateX(-100%); opacity: 0; }
  20% { opacity: 0.8; }
  80% { opacity: 0.8; }
  100% { transform: translateX(220%); opacity: 0; }
}

@keyframes pz-drift-a {
  0%, 100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(6%,8%,0) scale(1.12); }
}

@keyframes pz-drift-b {
  0%, 100% { transform: translate3d(0,0,0) scale(1.05); }
  50% { transform: translate3d(-8%,-6%,0) scale(.92); }
}

@keyframes pz-drift-c {
  0%, 100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(5%,-9%,0) scale(1.1); }
}

@keyframes pz-chip {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pz-ring {
  0% { transform: scale(.35); opacity: .7; }
  100% { transform: scale(2.1); opacity: 0; }
}

@keyframes pz-sheen {
  0% { transform: translateX(-130%) skewX(-18deg); }
  60%, 100% { transform: translateX(330%) skewX(-18deg); }
}

.pz-fade-up { animation: pz-fade-up .75s var(--pz-ease) both; }
.pz-fade { animation: pz-fade .4s ease-out both; }
.pz-float { animation: pz-float 7s ease-in-out infinite; }
.pz-word { animation: pz-word .45s var(--pz-ease) both; }
.pz-scan { animation: pz-scan 1.8s ease-in-out infinite alternate; }
.pz-pop { animation: pz-pop .5s ease-out both; }
.pz-draw { stroke-dasharray: 48; animation: pz-draw .55s .2s ease-out both; }
.pz-beam { animation: pz-beam 5.5s ease-in-out infinite; }
.pz-drift-a { animation: pz-drift-a 22s ease-in-out infinite; }
.pz-drift-b { animation: pz-drift-b 26s ease-in-out infinite; }
.pz-drift-c { animation: pz-drift-c 30s ease-in-out infinite; }
.pz-chip { animation: pz-chip 6s ease-in-out infinite; }
.pz-ring { animation: pz-ring 4.5s ease-out infinite; }

.pz-shine { position: relative; overflow: hidden; }
.pz-shine::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 35%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
  transform: translateX(-130%) skewX(-18deg);
  animation: pz-sheen 4s ease-in-out infinite;
  pointer-events: none;
}

.pz-spot { position: relative; }
.pz-spot-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
  transition: opacity .3s ease;
  background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(56,189,248,.16), transparent 62%);
}
.pz-spot:hover .pz-spot-glow { opacity: 1; }

.payzo-landing a:focus-visible,
.payzo-landing button:focus-visible {
  outline: 2px solid #38bdf8;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .payzo-landing *,
  .payzo-landing *::before,
  .payzo-landing *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
`;

/* =====================================================================
   ANIMATED BACKDROPS
   ===================================================================== */

const AURORA = {
  blue: ["rgba(37,99,235,.30)", "rgba(14,165,233,.20)", "rgba(99,102,241,.24)"],
  cyan: ["rgba(6,182,212,.22)", "rgba(37,99,235,.22)", "rgba(56,189,248,.16)"],
  emerald: ["rgba(16,185,129,.18)", "rgba(6,182,212,.20)", "rgba(37,99,235,.20)"],
  indigo: ["rgba(99,102,241,.28)", "rgba(37,99,235,.22)", "rgba(14,165,233,.16)"],
};

/** Slow drifting colour clouds (cheap: gradients + transforms only, no blur filter). */
function Aurora({ tone = "blue", className = "" }) {
  const [a, b, c] = AURORA[tone] || AURORA.blue;
  const blob = (color, position, motion) => (
    <span
      className={`absolute rounded-full will-change-transform ${position} ${motion}`}
      style={{ background: `radial-gradient(circle at center, ${color}, transparent 66%)` }}
    />
  );

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {blob(a, "-left-[12%] -top-[25%] h-[75%] w-[55%]", "pz-drift-a")}
      {blob(b, "-right-[10%] top-[10%] h-[70%] w-[50%]", "pz-drift-b")}
      {blob(c, "bottom-[-30%] left-[25%] h-[70%] w-[55%]", "pz-drift-c")}
    </div>
  );
}

const NET_NODES = [
  [120, 160], [340, 90], [560, 200], [820, 110], [1040, 210],
  [200, 420], [470, 360], [720, 430], [960, 380], [1100, 540],
  [330, 590], [620, 560], [860, 620],
];

const NET_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 2], [6, 7],
  [7, 8], [8, 4], [8, 9], [5, 10], [10, 11], [11, 7], [11, 12], [12, 8],
];

function netPath(i, [from, to]) {
  const [x1, y1] = NET_NODES[from];
  const [x2, y2] = NET_NODES[to];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + (i % 2 ? -46 : 46);
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
}

/** Looping "video-like" animation: payments travelling between connected wallets. */
function PaymentNetwork({ idp = "pn", className = "" }) {
  const still = prefersReducedMotion();
  const mask = "radial-gradient(ellipse at 55% 45%, #000 18%, transparent 80%)";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <defs>
        <pattern id={`${idp}-dots`} width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#93c5fd" fillOpacity=".28" />
        </pattern>
        <linearGradient id={`${idp}-line`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#3b82f6" stopOpacity=".06" />
          <stop offset=".5" stopColor="#38bdf8" stopOpacity=".42" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity=".06" />
        </linearGradient>
        <radialGradient id={`${idp}-glow`}>
          <stop offset="0" stopColor="#67e8f9" stopOpacity=".85" />
          <stop offset="1" stopColor="#67e8f9" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="700" fill={`url(#${idp}-dots)`} />

      {NET_LINKS.map((link, i) => (
        <path
          key={i}
          id={`${idp}-p${i}`}
          d={netPath(i, link)}
          fill="none"
          stroke={`url(#${idp}-line)`}
          strokeWidth="1.2"
        />
      ))}

      {!still &&
        NET_LINKS.map((_, i) => (
          <g key={i}>
            <animateMotion
              dur={`${6 + (i % 5)}s`}
              begin={`-${(i * 1.7) % 8}s`}
              repeatCount="indefinite"
            >
              <mpath href={`#${idp}-p${i}`} />
            </animateMotion>
            <circle r="8" fill={`url(#${idp}-glow)`} />
            <circle r="2.3" fill="#a5f3fc" />
          </g>
        ))}

      {NET_NODES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#60a5fa" />
          <circle
            cx={x}
            cy={y}
            r="9"
            fill="none"
            stroke="#38bdf8"
            strokeOpacity=".6"
            className="pz-ring"
            style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: `${(i * 0.55) % 4.5}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

/** Optional looping video behind the hero. Renders nothing unless HERO_VIDEO is set. */
function BackdropVideo({ src, poster }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src, failed]);

  if (!src || failed || prefersReducedMotion()) return null;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <video
        ref={ref}
        src={src}
        poster={poster || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#071225]/70 via-[#071225]/35 to-[#071225]" />
    </div>
  );
}

/** Small glass notification that floats beside the wallet preview. */
function FloatingChip({ icon, title, sub, tone = "emerald", delay = 0, className = "" }) {
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-300",
    blue: "bg-blue-500/15 text-blue-300",
  };

  return (
    <div
      aria-hidden="true"
      style={{ animationDelay: `${delay}s` }}
      className={`pz-chip absolute z-20 items-center gap-2.5 rounded-2xl border border-white/10 bg-[#0b192d]/80 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-md ${className}`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="text-left">
        <span className="block text-xs font-semibold text-white">{title}</span>
        <span className="block text-[11px] text-slate-400">{sub}</span>
      </span>
    </div>
  );
}

/* =====================================================================
   INTERACTIVE WALLET PREVIEW
   ===================================================================== */

const DEMO_STEPS = ["Activity", "Scan & pay", "PIN", "Sent"];

function DemoActivity() {
  return (
    <div className="pz-fade space-y-3 p-4">
      {[
        ["down", "Money received", "+₹2,500.00", "bg-emerald-500/10 text-emerald-400", "text-emerald-400"],
        ["send", "Sent to Aarav S.", "−₹750.00", "bg-blue-500/10 text-blue-400", "text-slate-100"],
      ].map(([icon, title, amount, bg, color]) => (
        <div key={title} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
            <Icon name={icon} className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-100">{title}</span>
            <span className="block text-xs text-slate-500">Completed · Instant</span>
          </span>
          <span className={`shrink-0 text-sm font-semibold tabular-nums ${color}`}>{amount}</span>
        </div>
      ))}
    </div>
  );
}

function DemoScan() {
  return (
    <div className="pz-fade relative flex h-full flex-col items-center justify-center bg-[#050d1b] p-4">
      <p className="mb-3 text-xs font-medium text-slate-300">Point at a Payzo QR code</p>
      <div className="relative h-24 w-24">
        {[
          "left-0 top-0 border-l-2 border-t-2 rounded-tl-lg",
          "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg",
          "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
          "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
        ].map((cls) => (
          <span key={cls} className={`absolute h-4 w-4 border-cyan-300 ${cls}`} />
        ))}
        <div className="absolute inset-2.5 grid grid-cols-9 gap-[2px] opacity-75">
          {Array.from({ length: 81 }, (_, i) =>
            (i * 7 + (i % 5) * 3 + Math.floor(i / 9) * 11) % 3 !== 0
          ).map((active, i) => (
            <span key={i} className={active ? "bg-white" : "bg-transparent"} />
          ))}
        </div>
        <span className="pz-scan absolute inset-x-1 h-0.5 rounded bg-cyan-300 shadow-[0_0_10px_2px_rgba(103,232,249,.75)]" />
      </div>
    </div>
  );
}

function DemoPin() {
  return (
    <div className="pz-fade flex h-full flex-col items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-400">Paying Aarav S.</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">₹500.00</p>
      <p className="mt-3 text-xs font-medium text-slate-300">Enter your 6-digit PIN</p>
      <div className="mt-3 flex justify-center gap-2.5">
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            className="h-3 w-3 rounded-full bg-slate-700"
            style={{
              animation: `pz-dot .35s ease-out ${250 + index * 220}ms both`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DemoDone() {
  return (
    <div className="pz-fade flex h-full flex-col items-center justify-center px-4 text-center">
      <svg viewBox="0 0 80 80" className="pz-pop h-14 w-14" aria-hidden="true">
        <circle cx="40" cy="40" r="36" fill="rgba(52,211,153,.14)" />
        <path
          className="pz-draw"
          d="M24 41l11 11 21-23"
          fill="none"
          stroke="#34d399"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-2 text-sm font-bold text-white">Payment sent</p>
      <p className="text-xs text-slate-400">₹500.00 to Aarav S. · Ref #PZ8421</p>
    </div>
  );
}

function WalletDemo() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const balance = useCountUp(24850);

  useInterval(() => {
    if (!paused) setStep((current) => (current + 1) % DEMO_STEPS.length);
  }, 3600);

  const Frame = [DemoActivity, DemoScan, DemoPin, DemoDone][step];

  return (
    <div
      className="relative mx-auto w-full max-w-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-full bg-blue-500/15 blur-3xl"
      />

      <div className="pz-float relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#132544] via-[#0f1d36] to-[#0a1326] p-5 shadow-2xl shadow-black/50 sm:p-7">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300/80">
              Payzo Wallet
            </p>
            <p className="mt-0.5 text-base font-bold text-white">Primary INR Account</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-300">
            <Icon name="qr" className="h-5 w-5" />
          </span>
        </div>

        {/* Balance */}
        <div className="mt-6">
          <p className="text-xs font-medium text-slate-400">Available balance</p>
          <p
            className="mt-1 text-3xl font-bold tracking-tight text-white tabular-nums sm:text-4xl"
            aria-label="Sample balance 24,850 rupees"
          >
            ₹{Math.floor(balance).toLocaleString("en-IN")}
            <span className="text-lg text-slate-400 sm:text-xl">.00</span>
          </p>
        </div>

        {/* Action Tiles */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-2xl bg-blue-600 p-3.5 text-left transition hover:bg-blue-500"
          >
            <Icon name="send" className="mb-2 h-4 w-4 text-white" />
            <p className="text-sm font-semibold text-white">Send Money</p>
            <p className="text-xs text-blue-100/80">Instant transfer</p>
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition hover:bg-white/10"
          >
            <Icon name="down" className="mb-2 h-4 w-4 text-slate-200" />
            <p className="text-sm font-semibold text-white">Receive</p>
            <p className="text-xs text-slate-400">Scan or share QR</p>
          </button>
        </div>

        {/* Interactive Step Tabs */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {DEMO_STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                aria-pressed={step === index}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  step === index
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-500">Preview</span>
        </div>

        {/* Dynamic Preview Frame */}
        <div
          className="relative mt-3 h-[156px] overflow-hidden rounded-2xl border border-white/10 bg-black/20"
          aria-live="polite"
        >
          <Frame key={step} />
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   HERO
   ===================================================================== */

const WORDS = ["send money", "get paid", "scan & pay", "track spending"];

function Hero({ onLogin, onRegister }) {
  const [word, setWord] = useState(0);

  useInterval(() => {
    setWord((current) => (current + 1) % WORDS.length);
  }, 2400);

  return (
    <section id="home" className="relative scroll-mt-24 overflow-hidden">
      {/* Motion backdrop: optional video, drifting colour, and the payment network */}
      <BackdropVideo src={HERO_VIDEO} poster={HERO_POSTER} />
      <Aurora tone="blue" />
      <PaymentNetwork idp="hero" className="opacity-80" />

      {/* Subtle architectural grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 25%, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 25%, #000 30%, transparent 75%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#071225]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-6 md:px-10 md:pb-28 md:pt-20 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0 text-center lg:text-left">
          <div className="pz-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium text-blue-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Built for fast, PIN-verified INR payments
          </div>

          <h1
            className="pz-fade-up mx-auto max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:mx-0"
            style={{ animationDelay: ".08s" }}
          >
            Your money.
            <br />
            Your control.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
              Your Payzo.
            </span>
          </h1>

          <p
            className="pz-fade-up mx-auto mt-6 max-w-lg text-base leading-relaxed text-slate-400 md:text-lg lg:mx-0"
            style={{ animationDelay: ".16s" }}
          >
            A modern digital wallet to manage your balance, send instant transfers, and
            track every rupee with bank-grade PIN protection.
          </p>

          <p
            className="pz-fade-up mt-4 flex items-center justify-center gap-2 text-base font-semibold sm:text-lg lg:justify-start"
            style={{ animationDelay: ".24s" }}
            aria-live="polite"
          >
            <span className="text-slate-400">Built to</span>
            <span className="inline-block h-[1.5em] overflow-hidden text-left text-cyan-300">
              <span key={word} className="pz-word block leading-[1.5]">
                {WORDS[word]}
              </span>
            </span>
          </p>

          <div
            className="pz-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
            style={{ animationDelay: ".32s" }}
          >
            <button
              type="button"
              onClick={onRegister}
              className="pz-shine inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Create Your Account
              <Icon name="arrow" className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onLogin}
              className="min-h-12 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10"
            >
              Sign in to Payzo
            </button>
          </div>

          <ul
            className="pz-fade-up mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-xs font-medium text-slate-400 sm:text-sm lg:justify-start"
            style={{ animationDelay: ".4s" }}
          >
            {["No hidden fees", "6-digit PIN security", "Instant receipts"].map((text) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon name="check" className="h-4 w-4 shrink-0 text-emerald-400" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="pz-fade-up relative min-w-0" style={{ animationDelay: ".2s" }}>
          <FloatingChip
            icon="down"
            title="Money received"
            sub="+₹2,500.00 · just now"
            tone="emerald"
            className="-left-2 top-2 hidden sm:flex md:-left-10"
          />
          <FloatingChip
            icon="shield"
            title="PIN verified"
            sub="Payment secured"
            tone="blue"
            delay={1.6}
            className="-right-2 bottom-6 hidden sm:flex md:-right-8"
          />
          <WalletDemo />
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   TRUST STRIP
   ===================================================================== */

function TrustStrip() {
  return (
    <section aria-label="Security highlights" className="relative border-y border-white/10 bg-[#091529]">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 divide-y divide-white/5 md:grid-cols-4 md:divide-x md:divide-y-0">
        {TRUST.map(([icon, text], index) => (
          <Reveal
            as="li"
            key={text}
            delay={index * 70}
            className="flex items-center justify-center gap-2.5 px-4 py-5 text-center text-xs font-medium text-slate-300 sm:text-sm"
          >
            <Icon name={icon} className="h-4 w-4 shrink-0 text-blue-400 sm:h-5 sm:w-5" />
            <span>{text}</span>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/* =====================================================================
   LIVE ANIMATED CANVAS MOTION BACKGROUNDS
   (procedural, video-like backdrop for Features, How, Security, FAQ)
   ===================================================================== */

function SectionMotionBg({ mode = "constellation" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let rafId = null;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Seed particles for constellation / sparkles
    const nodes = Array.from({ length: 42 }, (_, i) => ({
      x: ((i * 73) % 100) / 100,
      y: ((i * 41) % 100) / 100,
      vx: (((i % 7) - 3) * 0.00018) || 0.00012,
      vy: (((i % 5) - 2) * 0.00018) || -0.00012,
      r: (i % 3) + 1.4,
      phase: i * 0.7,
    }));

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
            },
            { threshold: 0.01 }
          )
        : null;
    if (io) io.observe(canvas);

    const startTime = performance.now();

    const drawConstellation = (t) => {
      // Soft gradient wash
      const g = ctx.createRadialGradient(
        width * (0.5 + 0.12 * Math.sin(t * 0.25)),
        height * 0.35,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      g.addColorStop(0, "rgba(37, 99, 235, 0.14)");
      g.addColorStop(0.5, "rgba(14, 165, 233, 0.06)");
      g.addColorStop(1, "rgba(7, 18, 37, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // Update & draw nodes
      const pts = nodes.map((n) => {
        if (!prefersReducedMotion()) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        }
        return { x: n.x * width, y: n.y * height, r: n.r, phase: n.phase };
      });

      const maxDist = Math.min(200, Math.max(120, width * 0.16));
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.22;
            ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();

            // Traveling payment pulse on select links
            if ((i + j) % 9 === 0) {
              const p = (t * 0.35 + (i * 0.17)) % 1;
              const px = pts[i].x + (pts[j].x - pts[i].x) * p;
              const py = pts[i].y + (pts[j].y - pts[i].y) * p;
              ctx.fillStyle = "rgba(103, 232, 249, 0.75)";
              ctx.beginPath();
              ctx.arc(px, py, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      for (const p of pts) {
        const glow = 0.35 + 0.3 * Math.sin(t * 2 + p.phase);
        ctx.fillStyle = `rgba(125, 211, 252, ${glow})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawWaves = (t) => {
      const ribbons = [
        { amp: 46, freq: 0.0026, speed: 0.55, yOff: 0.32, color: "rgba(59, 130, 246, 0.14)", fill: "rgba(37, 99, 235, 0.05)" },
        { amp: 58, freq: 0.002, speed: -0.4, yOff: 0.52, color: "rgba(56, 189, 248, 0.13)", fill: "rgba(14, 165, 233, 0.04)" },
        { amp: 38, freq: 0.0032, speed: 0.7, yOff: 0.7, color: "rgba(99, 102, 241, 0.12)", fill: "rgba(99, 102, 241, 0.04)" },
      ];

      for (const r of ribbons) {
        ctx.beginPath();
        const baseY = height * r.yOff;
        for (let x = 0; x <= width + 24; x += 24) {
          const y =
            baseY +
            Math.sin(x * r.freq + t * r.speed) * r.amp +
            Math.cos(x * r.freq * 0.5 - t * r.speed * 0.7) * (r.amp * 0.45);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = r.fill;
        ctx.fill();
      }

      // Floating light particles
      for (let i = 0; i < 20; i++) {
        const px = ((i * 0.053 + t * 0.015 * ((i % 3) + 1)) % 1) * width;
        const py = height * (0.2 + 0.6 * ((i * 0.37) % 1)) + Math.sin(t + i) * 18;
        ctx.fillStyle = "rgba(186, 230, 253, 0.25)";
        ctx.beginPath();
        ctx.arc(px, py, (i % 2) + 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawRadar = (t) => {
      const cx = width * 0.5;
      const cy = height * 0.5;
      const maxR = Math.min(width, height) * 0.58;

      // Concentric security rings
      for (let i = 1; i <= 4; i++) {
        const radius = (maxR / 4) * i;
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.12 - i * 0.02})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rotating radar sweep
      const angle = t * 0.45;
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
      grad.addColorStop(0, "rgba(34, 211, 238, 0.16)");
      grad.addColorStop(0.6, "rgba(16, 185, 129, 0.08)");
      grad.addColorStop(1, "rgba(7, 18, 37, 0)");

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, angle, angle + 0.85);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Orbiting security nodes
      for (let i = 0; i < 12; i++) {
        const ring = ((i % 3) + 1.5) * (maxR / 4.5);
        const a = t * (0.18 + (i % 3) * 0.06) + i * 1.1;
        const nx = cx + Math.cos(a) * ring;
        const ny = cy + Math.sin(a) * ring;
        ctx.fillStyle = i % 2 === 0 ? "rgba(52, 211, 153, 0.45)" : "rgba(103, 232, 249, 0.45)";
        ctx.beginPath();
        ctx.arc(nx, ny, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = (now) => {
      if (visible && width > 0 && height > 0) {
        const t = (now - startTime) / 1000;
        ctx.clearRect(0, 0, width, height);
        if (mode === "constellation") drawConstellation(t);
        else if (mode === "radar") drawRadar(t);
        else drawWaves(t);
      }
      if (!prefersReducedMotion()) {
        rafId = requestAnimationFrame(render);
      }
    };

    render(performance.now());

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro?.disconnect();
      io?.disconnect();
    };
  }, [mode]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#071225]/55 via-transparent to-[#071225]/65" />
    </div>
  );
}

function Head({ kicker, title, text }) {
  return (
    <Reveal className="relative mx-auto mb-12 max-w-2xl text-center md:mb-16">
      {kicker && (
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          {kicker}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
        {title}
      </h2>
      {text && <p className="mt-4 text-base leading-relaxed text-slate-400">{text}</p>}
    </Reveal>
  );
}

/* =====================================================================
   FEATURES
   ===================================================================== */

function Features() {
  return (
    <section
      id="features"
      className="relative scroll-mt-20 overflow-hidden bg-[#0b192d] px-5 py-20 sm:px-6 md:px-10 md:py-28"
    >
      <Aurora tone="blue" />
      <SectionMotionBg mode="constellation" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <Head
          kicker="Features"
          title="Everything you need, in one wallet."
          text="Designed around speed, clarity, and strict account protection."
        />

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([icon, title, description], index) => (
            <SpotCard
              key={title}
              delay={(index % 3) * 80}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0b192d]/70 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-blue-400/40 hover:bg-[#0e2039]/85 hover:shadow-2xl hover:shadow-blue-950/60 sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300 shadow-inner transition duration-300 group-hover:scale-105 group-hover:border-blue-400/40 group-hover:bg-blue-600 group-hover:text-white">
                  <Icon name={icon} className="h-6 w-6" />
                </span>
                <span className="font-mono text-xs font-semibold text-slate-500 transition group-hover:text-blue-300/80">
                  0{index + 1}
                </span>
              </div>

              <h3 className="mt-6 text-lg font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
            </SpotCard>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* =====================================================================
   HOW IT WORKS
   ===================================================================== */

function How() {
  return (
    <section
      id="how"
      className="relative scroll-mt-20 overflow-hidden bg-[#071225] px-5 py-20 sm:px-6 md:px-10 md:py-28"
    >
      <Aurora tone="cyan" />
      <SectionMotionBg mode="waves" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Head
          kicker="How it works"
          title="Up and running in three steps"
          text="Start sending and receiving payments in minutes with built-in PIN verification."
        />

        <ol className="relative grid gap-6 md:grid-cols-3 md:gap-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-px overflow-hidden bg-white/10 md:block"
          >
            <div className="pz-beam h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          </div>

          {STEPS.map(([icon, title, description], index) => (
            <Reveal
              as="li"
              key={title}
              delay={index * 110}
              className="group relative rounded-2xl border border-white/10 bg-[#0b192d]/65 p-6 text-center backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-[#0e2039]/80 sm:p-8"
            >
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25 ring-8 ring-[#071225] transition duration-300 group-hover:scale-105 group-hover:shadow-blue-500/40">
                <Icon name={icon} className="h-6 w-6" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300 text-xs font-bold text-slate-900 shadow">
                  {index + 1}
                </span>
              </div>

              <h3 className="mt-6 text-lg font-bold text-white">{title}</h3>
              <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-slate-400">
                {description}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* =====================================================================
   SECURITY
   ===================================================================== */

function Security() {
  return (
    <section
      id="security"
      className="relative scroll-mt-20 overflow-hidden border-y border-white/10 bg-[#0b192d] px-5 py-20 sm:px-6 md:px-10 md:py-28"
    >
      <Aurora tone="emerald" />
      <SectionMotionBg mode="radar" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <Head
          kicker="Security"
          title="Built to protect every rupee"
          text="Defense-in-depth controls ensure a single mistake never compromises your wallet."
        />

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY.map(([icon, title, description], index) => (
            <SpotCard
              key={title}
              line="cyan"
              delay={(index % 3) * 80}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[#081326]/75 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-[#0c1b33]/90 sm:p-7"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 transition group-hover:border-cyan-300/40 group-hover:bg-cyan-400/15">
                  <Icon name={icon} className="h-5 w-5" />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Protected
                </span>
              </div>

              <h3 className="mt-5 text-base font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
            </SpotCard>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* =====================================================================
   FAQ (Smooth Animated Accordion)
   ===================================================================== */

function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section
      id="faq"
      className="relative scroll-mt-20 overflow-hidden bg-[#071225] px-5 py-20 sm:px-6 md:px-10 md:py-28"
    >
      <Aurora tone="indigo" />
      <SectionMotionBg mode="waves" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <Head
          kicker="FAQ"
          title="Frequently Asked Questions"
          text="Clear answers about payments, limits, and account safety."
        />

        <Reveal className="space-y-3">
          {FAQ.map(([question, answer], index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={question}
                className={`overflow-hidden rounded-2xl border backdrop-blur-md transition duration-300 ${
                  isOpen
                    ? "border-blue-400/40 bg-[#0e2039]/85 shadow-lg shadow-blue-950/40"
                    : "border-white/10 bg-[#0b192d]/65 hover:border-white/20 hover:bg-[#0e2039]/75"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-white sm:px-6 sm:py-5 sm:text-base"
                >
                  <span className="flex items-center gap-3.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition ${
                        isOpen
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      0{index + 1}
                    </span>
                    <span>{question}</span>
                  </span>
                  <Icon
                    name="chevron"
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-blue-300" : ""
                    }`}
                  />
                </button>

                <div
                  id={`faq-panel-${index}`}
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 pl-[3.75rem] text-sm leading-relaxed text-slate-300 sm:px-6 sm:pb-6 sm:pl-[4rem]">
                      {answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

/* =====================================================================
   MOBILE / TABLET STICKY CTA
   ===================================================================== */

function MobileCtaBar({ onLogin, onRegister }) {
  const past = useScrollY(520);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-3 border-t border-white/10 bg-[#071225]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition duration-300 lg:hidden ${
        past ? "translate-y-0" : "translate-y-full"
      }`}
      aria-label="Account actions"
      aria-hidden={!past}
    >
      <button
        type="button"
        onClick={onLogin}
        tabIndex={past ? 0 : -1}
        className="min-h-11 rounded-full border border-white/20 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        Sign in
      </button>

      <button
        type="button"
        onClick={onRegister}
        tabIndex={past ? 0 : -1}
        className="min-h-11 rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
      >
        Get Started
      </button>
    </div>
  );
}

/* =====================================================================
   MAIN LANDING PAGE
   ===================================================================== */

export default function LandingPage({ onLogin = () => {}, onRegister = () => {} }) {
  useEffect(() => {
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;

    if (!prefersReducedMotion()) {
      html.style.scrollBehavior = "smooth";
    }

    return () => {
      html.style.scrollBehavior = previousBehavior;
    };
  }, []);

  return (
    <div className="payzo-landing min-h-screen overflow-x-clip bg-[#071225] text-white">
      <style>{STYLES}</style>

      <ScrollProgress />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900"
      >
        Skip to content
      </a>

      <Navbar onLogin={onLogin} onRegister={onRegister} />

      <main id="main" tabIndex="-1">
        <Hero onLogin={onLogin} onRegister={onRegister} />
        <TrustStrip />
        <Features />
        <How />
        <Security />
        <Faq />
      </main>

      <Footer onLogin={onLogin} onRegister={onRegister} />

      <MobileCtaBar onLogin={onLogin} onRegister={onRegister} />
    </div>
  );
}