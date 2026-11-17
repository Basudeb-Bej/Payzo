// frontend/src/components/sidebar/profile.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../../api.js";
import { getInitials } from "./Formatters.js";

/* ------------------------------------------------------------------ styles */
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800 dark:disabled:bg-slate-800/70 dark:disabled:text-slate-400";
const invalidCls = "!border-red-400 focus:!ring-red-500/10";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1246] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#14206E] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:border-slate-600";

/* ------------------------------------------------------------------ countries
   [ISO code, name, dial code, min national digits, max national digits]
   The phone box adapts its length limit and validation to the selected country. */
const COUNTRY_PRIORITY = [
  ["IN", "India", "91", 10, 10],
  ["US", "United States", "1", 10, 10],
  ["CA", "Canada", "1", 10, 10],
  ["GB", "United Kingdom", "44", 9, 10],
  ["AE", "United Arab Emirates", "971", 8, 9],
  ["SA", "Saudi Arabia", "966", 9, 9],
  ["QA", "Qatar", "974", 8, 8],
  ["KW", "Kuwait", "965", 8, 8],
  ["OM", "Oman", "968", 8, 8],
  ["BH", "Bahrain", "973", 8, 8],
  ["SG", "Singapore", "65", 8, 8],
  ["MY", "Malaysia", "60", 9, 10],
  ["AU", "Australia", "61", 9, 9],
  ["NZ", "New Zealand", "64", 8, 10],
  ["BD", "Bangladesh", "880", 10, 10],
  ["NP", "Nepal", "977", 10, 10],
  ["LK", "Sri Lanka", "94", 9, 9],
  ["PK", "Pakistan", "92", 10, 10],
  ["ID", "Indonesia", "62", 9, 12],
  ["TH", "Thailand", "66", 8, 9],
  ["PH", "Philippines", "63", 10, 10],
  ["VN", "Vietnam", "84", 9, 10],
  ["HK", "Hong Kong", "852", 8, 8],
  ["CN", "China", "86", 11, 11],
  ["JP", "Japan", "81", 9, 10],
  ["KR", "South Korea", "82", 9, 10],
  ["DE", "Germany", "49", 10, 11],
  ["FR", "France", "33", 9, 9],
  ["IT", "Italy", "39", 9, 10],
  ["ES", "Spain", "34", 9, 9],
  ["NL", "Netherlands", "31", 9, 9],
  ["CH", "Switzerland", "41", 9, 9],
  ["SE", "Sweden", "46", 7, 10],
  ["IE", "Ireland", "353", 8, 9],
  ["RU", "Russia", "7", 10, 10],
  ["TR", "Turkey", "90", 10, 10],
  ["EG", "Egypt", "20", 10, 10],
  ["ZA", "South Africa", "27", 9, 9],
  ["NG", "Nigeria", "234", 10, 10],
  ["KE", "Kenya", "254", 9, 9],
  ["BR", "Brazil", "55", 10, 11],
  ["MX", "Mexico", "52", 10, 10],
  ["AR", "Argentina", "54", 10, 11],
].map(([iso, name, dial, min, max]) => ({ iso, name, dial, min, max }));

// Dropdown order: A-Z by country name
const COUNTRY_LIST = [...COUNTRY_PRIORITY].sort((a, b) => a.name.localeCompare(b.name));

const BY_ISO = Object.fromEntries(COUNTRY_LIST.map((c) => [c.iso, c]));
/** "+919876543210" -> { country: "IN", number: "9876543210" } (longest dial code wins; shared codes resolve in COUNTRY_PRIORITY order). */
function parsePhone(stored) {
  const raw = (stored || "").trim();
  if (!raw) return { country: "", number: "" };
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) {
    for (const len of [3, 2, 1]) {
      const hit = COUNTRY_PRIORITY.find((c) => c.dial === digits.slice(0, len));
      if (hit) return { country: hit.iso, number: digits.slice(len) };
    }
  }
  // Older numbers saved without a country code: keep the digits, the user picks the country
  return { country: "", number: digits };
}

const fullPhone = (f) => (f.phone && f.country ? `+${BY_ISO[f.country].dial}${f.phone}` : "");

function phoneError(f) {
  if (!f.phone) return "";
  const c = BY_ISO[f.country];
  if (!c) return "Select a country";
  if (f.phone.length >= c.min && f.phone.length <= c.max) return "";
  return c.min === c.max ? `Enter ${c.min} digits` : `Enter ${c.min}–${c.max} digits`;
}

const POSTAL_OK = /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/;

const TEXT_FIELDS = ["address_line1", "address_line2", "city", "state", "pincode"];
const fromProfile = (p) => {
  const { country, number } = parsePhone(p?.phone);
  return {
    country,
    phone: number,
    phone_discoverable: p?.phone_discoverable ?? true,
    ...Object.fromEntries(TEXT_FIELDS.map((k) => [k, p?.[k] ?? ""])),
  };
};

/* ------------------------------------------------------------------ icons */
const ICONS = {
  check: <polyline points="20 6 9 17 4 12" />,
  chevron: <polyline points="6 9 12 15 18 9" />,
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  map: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
};

function Ico({ name, className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function QrIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h4v4h-4zM14 20h1M20 14h1" />
    </svg>
  );
}

function PayzoLogo({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" fillOpacity="0.16" />
      <path d="M8 16.5V7.5h4.2a3.1 3.1 0 0 1 0 6.2H8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16.2" cy="16.2" r="1.4" fill="currentColor" />
    </svg>
  );
}

function CameraIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ small pieces */
function Card({ icon, title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-5 flex items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-slate-100">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <Ico name={icon} />
        </span>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function Switch({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}

/** Searchable country-code dropdown. */
function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrap = useRef(null);
  const current = BY_ISO[value];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrap.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^\+/, "");
    if (!s) return COUNTRY_LIST;
    return COUNTRY_LIST.filter(
      (c) => c.name.toLowerCase().includes(s) || c.iso.toLowerCase() === s || c.dial.startsWith(s)
    );
  }, [q]);

  const pick = (iso) => {
    onChange(iso);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current ? `Country code: ${current.name} +${current.dial}` : "Select country code"}
        className={`${inputCls} flex w-[6.75rem] items-center justify-between gap-1.5 !px-3`}
      >
        {current ? (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{current.iso}</span>
            <span className="font-semibold">+{current.dial}</span>
          </span>
        ) : (
          <span className="text-slate-400">Select</span>
        )}
        <Ico name="chevron" className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="relative border-b border-slate-100 p-2 dark:border-slate-800">
            <Ico name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country or code"
              aria-label="Search country"
              className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
            {list.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">No match</li>}
            {list.map((c) => (
              <li key={c.iso} role="option" aria-selected={c.iso === value}>
                <button
                  type="button"
                  onClick={() => pick(c.iso)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    c.iso === value
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="w-6 text-[11px] font-bold text-slate-400">{c.iso}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">+{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Round profile picture, or the user's initials when there is no photo. */
export function Avatar({ src, name, className = "h-16 w-16 sm:h-20 sm:w-20 text-xl sm:text-2xl" }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s photo` : "Profile photo"}
        className={`${className} shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-slate-800`}
      />
    );
  }
  return (
    <div
      className={`flex ${className} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0B1246] to-blue-600 font-bold text-white shadow-sm`}
      aria-label={name || "Profile"}
    >
      {getInitials(name)}
    </div>
  );
}

/* ------------------------------------------------------------------ photo processing */
function loadHtmlImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image. Try a JPG, PNG, or WebP"));
    };
    img.src = url;
  });
}

async function fileToAvatar(file) {
  const validExt = /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name || "");
  if (file.type ? !file.type.startsWith("image/") : !validExt) {
    throw new Error("Please choose a JPG, PNG, or WebP image");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("That image is too large (8 MB max)");
  }

  let source;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await loadHtmlImage(file);
  }

  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;

  try {
    for (const [size, quality] of [
      [256, 0.85],
      [256, 0.75],
      [224, 0.7],
      [192, 0.6],
      [160, 0.5],
      [128, 0.45],
      [96, 0.4],
    ]) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
      const url = canvas.toDataURL("image/jpeg", quality);
      if (url.length <= 58_000) return url;
    }
  } finally {
    if (typeof source.close === "function") source.close();
  }

  throw new Error("That image is too detailed to shrink. Try a different one");
}

/* ------------------------------------------------------------------ centered QR modal */
function PayQrModal({ walletNo, name, avatar, onClose, onFlash }) {
  const box = useRef(null);
  const link = `${window.location.origin}/#pay=${walletNo}`;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      onFlash?.("ok", "Payment link copied");
    } catch {
      onFlash?.("err", "Couldn't copy the link");
    }
  };

  const copyWalletNo = async () => {
    try {
      await navigator.clipboard.writeText(walletNo);
      onFlash?.("ok", "Wallet ID copied");
    } catch {
      onFlash?.("err", "Couldn't copy Wallet ID");
    }
  };

  const share = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: "Pay me on Payzo", text: `Pay ${name || "me"} on Payzo`, url: link });
    } catch {
      /* user dismissed share sheet */
    }
  };

  const download = () => {
    const svg = box.current?.querySelector("svg");
    if (!svg) return;
    const img = new Image();
    img.onload = () => {
      const pad = 32;
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size + pad * 2;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return onFlash?.("err", "Couldn't create the QR image");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payzo-qr-${walletNo}.png`;
        a.click();
        URL.revokeObjectURL(url);
        onFlash?.("ok", "QR code downloaded");
      }, "image/png");
    };
    img.onerror = () => onFlash?.("err", "Couldn't create the QR image");
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <PayzoLogo className="h-4 w-4" />
            Payzo QR
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR code"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex flex-col items-center">
          <Avatar src={avatar} name={name} className="h-14 w-14 text-lg" />
          <h3 id="qr-modal-title" className="mt-2.5 text-base font-bold text-slate-900 dark:text-slate-100">
            {name}
          </h3>
          <button
            type="button"
            onClick={copyWalletNo}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Copy Wallet ID"
          >
            <span>{walletNo}</span>
            <Ico name="copy" className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>

        <div
          ref={box}
          className="mx-auto mt-5 w-fit rounded-2xl bg-[#ffffff] p-4 shadow-sm ring-1 ring-[#e2e8f0]"
        >
          <QRCodeSVG value={link} size={200} level="M" bgColor="#ffffff" fgColor="#0B1246" />
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Scan to pay {name}</p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={download} className={ghostBtn}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download</span>
          </button>
          <button type="button" onClick={share} className={primaryBtn}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>{navigator.share ? "Share" : "Copy link"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ main */
export default function ProfileSection({ user, profile, onProfileChange, reloadUser, onFlash }) {
  const [localProfile, setLocalProfile] = useState(profile ?? null);
  const activeProfile = profile ?? localProfile;

  const saved = fromProfile(activeProfile);
  const [name, setName] = useState(user?.name || "");
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  // Load profile from GET /api/profile if parent didn't pass it
  useEffect(() => {
    if (profile !== undefined && profile !== null) {
      setLocalProfile(profile);
      return;
    }
    let cancelled = false;
    api
      .profileDetails()
      .then((data) => {
        if (cancelled) return;
        setLocalProfile(data);
        onProfileChange?.(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile, onProfileChange]);

  const detailsKey = [activeProfile?.phone, activeProfile?.phone_discoverable, ...TEXT_FIELDS.map((k) => activeProfile?.[k])]
    .map((v) => v ?? "")
    .join("\u0001");
  useEffect(() => {
    setForm(fromProfile(activeProfile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsKey]);

  const updateProfileState = (next) => {
    setLocalProfile(next);
    onProfileChange?.(next);
  };

  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const clearError = (key) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  const setText = (key) => (e) => {
    patch({ [key]: e.target.value });
    clearError(key);
  };

  const country = BY_ISO[form.country]; // undefined until a country is chosen

  const onCountry = (iso) => {
    patch({ country: iso, phone: form.phone.slice(0, BY_ISO[iso].max) });
    clearError("phone");
  };

  const onPhone = (e) => {
    patch({ phone: e.target.value.replace(/\D/g, "").slice(0, country?.max ?? 15) });
    clearError("phone");
  };

  const postalError = (v) => (v.trim() && !POSTAL_OK.test(v.trim()) ? "Invalid postal code" : "");
  const nameError = (v) => (v.trim().length < 2 ? "Min. 2 characters" : "");

  const nameChanged = name.trim() !== (user?.name || "");
  const detailsChanged =
    TEXT_FIELDS.some((k) => form[k].trim() !== saved[k]) ||
    fullPhone(form) !== fullPhone(saved) ||
    form.phone_discoverable !== saved.phone_discoverable;
  const dirty = nameChanged || detailsChanged;

  function validate() {
    const next = {
      name: nameError(name),
      phone: phoneError(form),
      pincode: postalError(form.pincode),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  function discard() {
    setName(user?.name || "");
    setForm(saved);
    setErrors({});
  }

  async function save(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (nameChanged) {
        await api.updateProfile(name.trim());
        await reloadUser?.();
      }
      if (detailsChanged) {
        const next = await api.saveProfileDetails({
          phone: fullPhone(form) || null,
          phone_discoverable: form.phone_discoverable,
          ...Object.fromEntries(TEXT_FIELDS.map((k) => [k, form[k].trim() || null])),
        });
        updateProfileState(next);
      }
      onFlash?.("ok", "Saved");
    } catch (err) {
      onFlash?.("err", err.message || "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const image = await fileToAvatar(file);
      const next = await api.setAvatar(image);
      updateProfileState(next);
      onFlash?.("ok", "Photo updated");
    } catch (err) {
      onFlash?.("err", err.message || "Couldn't update photo");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    try {
      const next = await api.removeAvatar();
      updateProfileState(next);
      onFlash?.("ok", "Photo removed");
    } catch (err) {
      onFlash?.("err", err.message || "Couldn't remove photo");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function copyWalletId() {
    try {
      await navigator.clipboard.writeText(user?.wallet_no || "");
      setCopied(true);
      onFlash?.("ok", "Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onFlash?.("err", "Couldn't copy");
    }
  }

  const kyc = user?.kyc_status || "NOT_STARTED";
  const kycOk = kyc === "VERIFIED";
  const kycLabel = { VERIFIED: "Verified", PENDING: "Pending", REJECTED: "Rejected" }[kyc] || "Unverified";
  const since = user?.created_at
    ? new Date(user.created_at + "Z").toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : null;

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------ identity */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-20 bg-gradient-to-r from-[#0B1246] via-[#122B88] to-blue-600 sm:h-24" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-12">
            <div className="relative rounded-full bg-white p-1 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-700">
              <Avatar src={activeProfile?.avatar} name={user?.name} className="h-20 w-20 text-2xl sm:h-24 sm:w-24 sm:text-3xl" />
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPick} />
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => fileRef.current?.click()}
                aria-label={activeProfile?.avatar ? "Change photo" : "Upload photo"}
                title={activeProfile?.avatar ? "Change photo" : "Upload photo"}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#0B1246] text-white shadow-sm transition hover:bg-[#14206E] disabled:opacity-50 dark:border-slate-900 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <CameraIcon />
              </button>
              {activeProfile?.avatar && (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={removePhoto}
                  aria-label="Remove photo"
                  title="Remove photo"
                  className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-slate-500 shadow-sm transition hover:text-red-600 disabled:opacity-50 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-red-400"
                >
                  <Ico name="trash" className="h-3.5 w-3.5" />
                </button>
              )}
              {photoBusy && (
                <span className="absolute inset-1 flex items-center justify-center rounded-full bg-slate-900/50">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                </span>
              )}
            </div>

            {user?.wallet_no && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                aria-label="Show payment QR code"
                className={`${ghostBtn} !px-3.5`}
              >
                <QrIcon className="h-4 w-4" />
                <span className="hidden sm:inline">QR</span>
              </button>
            )}
          </div>

          <div className="mt-3 min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{user?.name}</h2>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                kycOk
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                  : "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30"
              }`}
            >
              <Ico name="shield" className="h-3.5 w-3.5" />
              {kycLabel}
            </span>

            {user?.wallet_no && (
              <button
                type="button"
                onClick={copyWalletId}
                title="Copy Wallet ID"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {user.wallet_no}
                <Ico name={copied ? "check" : "copy"} className={`h-3.5 w-3.5 ${copied ? "text-emerald-500" : "text-slate-400"}`} />
              </button>
            )}

            {since && <span className="text-xs text-slate-400 dark:text-slate-500">Since {since}</span>}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ form */}
      <form onSubmit={save} noValidate className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card icon="user" title="Personal">
            <Field id="pf-name" label="Full name" error={errors.name}>
              <input
                id="pf-name"
                className={`${inputCls} ${errors.name ? invalidCls : ""}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                onBlur={() => setErrors((er) => ({ ...er, name: nameError(name) }))}
                maxLength={100}
                autoComplete="name"
                aria-invalid={!!errors.name}
              />
            </Field>

            <Field id="pf-email" label="Email">
              <div className="relative">
                <input id="pf-email" className={`${inputCls} pr-10`} value={user?.email || ""} disabled readOnly />
                <Ico name="lock" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>

            <Field id="pf-phone" label="Phone" error={errors.phone}>
              <div className="flex gap-2">
                <CountrySelect value={form.country} onChange={onCountry} />
                <div className="relative min-w-0 flex-1">
                  <input
                    id="pf-phone"
                    className={`${inputCls} pr-14 ${errors.phone ? invalidCls : ""}`}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={country ? "0".repeat(country.min) : "Select country first"}
                    disabled={!country && !form.phone}
                    value={form.phone}
                    onChange={onPhone}
                    onBlur={() => setErrors((er) => ({ ...er, phone: phoneError(form) }))}
                    aria-invalid={!!errors.phone}
                  />
                  {country && (
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-400">
                      {form.phone.length}/{country.max}
                    </span>
                  )}
                </div>
              </div>
            </Field>

            <Switch
              checked={form.phone_discoverable}
              onChange={(v) => patch({ phone_discoverable: v })}
              label="Find me by phone"
              hint="Only name & Wallet ID are shown"
            />
          </Card>

          <Card icon="map" title="Address">
            <Field id="pf-a1" label="Address line 1">
              <input id="pf-a1" className={inputCls} autoComplete="address-line1" maxLength={120} value={form.address_line1} onChange={setText("address_line1")} />
            </Field>
            <Field id="pf-a2" label="Address line 2">
              <input id="pf-a2" className={inputCls} autoComplete="address-line2" maxLength={120} value={form.address_line2} onChange={setText("address_line2")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pf-city" label="City">
                <input id="pf-city" className={inputCls} autoComplete="address-level2" maxLength={60} value={form.city} onChange={setText("city")} />
              </Field>
              <Field id="pf-state" label="State">
                <input id="pf-state" className={inputCls} autoComplete="address-level1" maxLength={60} value={form.state} onChange={setText("state")} />
              </Field>
            </div>
            <Field id="pf-postal" label="Postal code" error={errors.pincode}>
              <input
                id="pf-postal"
                className={`${inputCls} font-mono uppercase tracking-wide ${errors.pincode ? invalidCls : ""}`}
                autoComplete="postal-code"
                maxLength={10}
                value={form.pincode}
                onChange={(e) => {
                  patch({ pincode: e.target.value.replace(/[^A-Za-z0-9 -]/g, "").slice(0, 10) });
                  clearError("pincode");
                }}
                onBlur={() => setErrors((er) => ({ ...er, pincode: postalError(form.pincode) }))}
                aria-invalid={!!errors.pincode}
              />
            </Field>
          </Card>
        </div>

        {/* Save bar: slides up only when something changed */}
        <div
          className={`sticky bottom-4 z-20 transition-all duration-300 ${
            dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
          }`}
          aria-hidden={!dirty}
          inert={dirty ? undefined : ""}
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 pl-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={discard} disabled={busy} className={ghostBtn}>
                Discard
              </button>
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {showQrModal && user?.wallet_no && (
        <PayQrModal
          walletNo={user.wallet_no}
          name={user.name}
          avatar={activeProfile?.avatar}
          onClose={() => setShowQrModal(false)}
          onFlash={onFlash}
        />
      )}
    </div>
  );
}