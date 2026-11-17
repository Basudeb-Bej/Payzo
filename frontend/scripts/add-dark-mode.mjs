//frontend/scripts/add-dark-mode.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const targets = args.filter((a) => !a.startsWith("--"));
const ROOTS = targets.length ? targets : ["src/pages", "src/components"];
const SKIP = /^(LandingPage|AuthForm)/i;

/* ------------------------------------------------------------------ colour table */
// light-mode class  ->  classes to add for dark mode
const MAP = {
  // surfaces
  "bg-white": ["dark:bg-slate-900"],
  "bg-[#F8FAFC]": ["dark:bg-slate-950"],
  "bg-slate-50": ["dark:bg-slate-800/60"],
  "bg-slate-100": ["dark:bg-slate-800"],
  "bg-slate-200": ["dark:bg-slate-700"],
  "hover:bg-white": ["dark:hover:bg-slate-800"],
  "focus:bg-white": ["dark:focus:bg-slate-800"],
  "hover:bg-slate-50": ["dark:hover:bg-slate-800/60"],
  "hover:bg-slate-100": ["dark:hover:bg-slate-800"],
  "hover:bg-slate-200": ["dark:hover:bg-slate-700"],
  // brand navy buttons / badges
  "bg-[#0B1246]": ["dark:bg-blue-600"],
  "hover:bg-[#14206E]": ["dark:hover:bg-blue-500"],
  // text
  "text-slate-900": ["dark:text-slate-100"],
  "text-slate-800": ["dark:text-slate-200"],
  "text-slate-700": ["dark:text-slate-300"],
  "text-slate-600": ["dark:text-slate-300"],
  "text-slate-500": ["dark:text-slate-400"],
  "hover:text-slate-900": ["dark:hover:text-slate-100"],
  "hover:text-slate-800": ["dark:hover:text-slate-100"],
  "hover:text-slate-600": ["dark:hover:text-slate-200"],
  "placeholder-slate-400": ["dark:placeholder:text-slate-500"],
  // borders, dividers, rings
  "border-slate-100": ["dark:border-slate-800"],
  "border-slate-200": ["dark:border-slate-700"],
  "border-slate-300": ["dark:border-slate-600"],
  "hover:border-slate-200": ["dark:hover:border-slate-600"],
  "hover:border-slate-300": ["dark:hover:border-slate-600"],
  "divide-slate-100": ["dark:divide-slate-800"],
  "ring-slate-200": ["dark:ring-slate-700"],
  // svg text
  "fill-slate-900": ["dark:fill-slate-100"],
};

// soft coloured chips, alerts and accents
for (const c of ["blue", "emerald", "red", "amber", "indigo", "sky"]) {
  Object.assign(MAP, {
    [`bg-${c}-50`]: [`dark:bg-${c}-500/10`],
    [`bg-${c}-100`]: [`dark:bg-${c}-500/15`],
    [`hover:bg-${c}-50`]: [`dark:hover:bg-${c}-500/10`],
    [`hover:bg-${c}-100`]: [`dark:hover:bg-${c}-500/20`],
    [`border-${c}-200`]: [`dark:border-${c}-500/30`],
    [`border-${c}-300`]: [`dark:border-${c}-500/40`],
    [`hover:border-${c}-300`]: [`dark:hover:border-${c}-500/40`],
    [`ring-${c}-200`]: [`dark:ring-${c}-500/30`],
    [`text-${c}-600`]: [`dark:text-${c}-400`],
    [`text-${c}-700`]: [`dark:text-${c}-300`],
    [`text-${c}-800`]: [`dark:text-${c}-300`],
    [`text-${c}-900`]: [`dark:text-${c}-200`],
    [`border-${c}-100`]: [`dark:border-${c}-500/20`],
    [`hover:text-${c}-700`]: [`dark:hover:text-${c}-300`],
    [`fill-${c}-600`]: [`dark:fill-${c}-400`],
  });
}

// Finds the dark classes for one light class. Understands variants ("hover:", "group-hover:",
// "disabled:", "md:" ...) and opacity suffixes ("/80").
function darkFor(token) {
  if (token.startsWith("dark:")) return null;
  let m;
  // translucent white overlays on gradients / skeletons stay as they are
  if ((m = token.match(/^bg-white\/(\d+)$/))) return Number(m[1]) >= 50 ? [`dark:bg-slate-900/${m[1]}`] : null;
  // card borders such as border-slate-200/80
  if (/^border-slate-200\/\d+$/.test(token)) return ["dark:border-slate-800"];
  if (MAP[token]) return MAP[token];

  const parts = token.split(":");
  const util = parts.pop();
  const variants = parts.length ? parts.join(":") + ":" : "";
  const om = util.match(/^(.*)\/(\d+)$/);
  const base = om ? om[1] : util;
  const suffix = om ? `/${om[2]}` : "";

  let mapped = MAP[variants + base];
  if (!mapped && variants && MAP[base]) {
    mapped = MAP[base].map((d) => `dark:${variants}${d.slice(5)}`); // re-apply the variant chain
  }
  if (!mapped) return null;
  return suffix ? mapped.map((d) => (/\/\d+$/.test(d) ? d : d + suffix)) : mapped;
}

/* ------------------------------------------------------------------ one class string */
let added = 0;

// "dark:hover:bg-slate-800/60" -> "dark:hover:bg"  (variant chain + utility, without the colour)
const keyOf = (t) => {
  const m = t.match(/^((?:[a-z-]+:)*)([a-z]+)-/);
  return m ? m[1] + m[2] : t;
};

// light classes we expect to have a dark counterpart; anything left over is reported for manual review
const REVIEW =
  /^(?:[a-z-]+:)*(?:bg-(?:white|slate-(?:50|100|200|300)|[a-z]+-(?:50|100|200))|text-(?:slate-(?:500|600|700|800|900)|[a-z]+-(?:600|700|800|900))|border-(?:slate|[a-z]+)-(?:100|200|300)|ring-(?:slate|[a-z]+)-(?:100|200|300)|divide-slate-(?:100|200))(?:\/\d+)?$/;
let review = new Set();

function addDark(text) {
  if (!/(bg|text|border|divide|ring|fill|placeholder)-/.test(text)) return text;

  const tokens = text.split(/\s+/).filter(Boolean);
  const present = new Set(tokens);
  let adds = [];

  for (const t of tokens) {
    const d = darkFor(t);
    if (d) adds.push(...d);
  }
  // solid dark chip with white text (e.g. the selected filter): invert it in dark mode
  if (present.has("bg-slate-900") && present.has("text-white")) adds.push("dark:bg-slate-100", "dark:text-slate-900");

  // active tab inside a segmented control ("bg-white text-slate-900 shadow-sm"): lighter than its track
  const simple = tokens.every((t) => /^(bg-white|text-[\w-]+|shadow-sm|font-\w+)$/.test(t));
  if (simple && present.has("bg-white") && present.has("shadow-sm")) {
    adds = adds.map((x) => (x === "dark:bg-slate-900" ? "dark:bg-slate-700" : x));
  }

  // never add a dark class for a property that already has one (keeps the script idempotent
  // and respects dark: classes you wrote by hand)
  const have = new Set(tokens.filter((t) => t.startsWith("dark:")).map(keyOf));
  const out = [];
  for (const x of adds) {
    const k = keyOf(x);
    if (have.has(k)) continue;
    have.add(k);
    out.push(x);
  }

  for (const t of tokens) {
    if (t.startsWith("dark:") || !REVIEW.test(t)) continue;
    if (/^bg-white\/(\d+)$/.test(t) && Number(t.split("/")[1]) < 50) continue;
    if (!have.has(keyOf("dark:" + t))) review.add(t);
  }

  if (!out.length) return text;
  added += out.length;
  const trailing = text.match(/\s*$/)[0];
  const body = text.slice(0, text.length - trailing.length);
  return `${body} ${out.join(" ")}${trailing}`;
}

/* ------------------------------------------------------------------ source scanner */
function skipString(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length && src[j] !== "\n"; j++) {
    if (src[j] === "\\") { j++; continue; }
    if (src[j] === q) return j + 1;
  }
  return -1; // not a string (e.g. an apostrophe in JSX text)
}

// a "/" after one of these characters starts a regex literal (e.g. .replace(/"/g, ...)), not a division
const REGEX_AFTER = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", ";", ""]);

function skipRegex(src, i) {
  let inClass = false;
  for (let j = i + 1; j < src.length && src[j] !== "\n"; j++) {
    const c = src[j];
    if (c === "\\") { j++; continue; }
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) {
      let k = j + 1;
      while (k < src.length && /[a-z]/.test(src[k])) k++; // flags
      return k;
    }
  }
  return -1;
}

// Walks JavaScript source. Class strings found in "..." '...' and `...` get dark variants;
// comments and regex literals are copied untouched. `stopAtBrace` is used for ${ ... } parts.
function scan(src, start, stopAtBrace) {
  let out = "";
  let i = start;
  let depth = 1;
  let prev = ""; // last non-space character written
  const put = (text, last) => { out += text; prev = last ?? text.trimEnd().slice(-1) ?? prev; };

  while (i < src.length) {
    const c = src[i];

    if (c === "/" && src[i + 1] === "/") {
      const e = src.indexOf("\n", i);
      const end = e === -1 ? src.length : e;
      out += src.slice(i, end); i = end; continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const e = src.indexOf("*/", i + 2);
      const end = e === -1 ? src.length : e + 2;
      out += src.slice(i, end); i = end; continue;
    }
    if (c === "/" && REGEX_AFTER.has(prev)) {
      const end = skipRegex(src, i);
      if (end > 0) { put(src.slice(i, end), "x"); i = end; continue; }
    }
    if (c === '"' || c === "'") {
      const end = skipString(src, i);
      if (end > 0) { put(c + addDark(src.slice(i + 1, end - 1)) + c, c); i = end; continue; }
    }
    if (c === "`") { const [t, next] = template(src, i); put(t, "`"); i = next; continue; }

    if (stopAtBrace) {
      if (c === "{") depth++;
      if (c === "}" && --depth === 0) return [out, i + 1];
    }
    out += c;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return [out, i];
}

function template(src, start) {
  let out = "`";
  let i = start + 1;
  let chunk = i;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") { i += 2; continue; }
    if (c === "`") return [out + addDark(src.slice(chunk, i)) + "`", i + 1];
    if (c === "$" && src[i + 1] === "{") {
      out += addDark(src.slice(chunk, i)) + "${";
      const [inner, next] = scan(src, i + 2, true);
      out += inner + "}";
      i = next;
      chunk = i;
      continue;
    }
    i++;
  }
  return [src.slice(start), src.length]; // unterminated: leave untouched
}

const transform = (src) => scan(src, 0, false)[0];

// Safety net: the result must equal the input once every " dark:..." class is removed.
const stripDark = (s) => s.replace(/ dark:[\w:/.\-[\]#%]+/g, "");

/* ------------------------------------------------------------------ run */
function* walk(p) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const name of readdirSync(p)) if (name !== "node_modules") yield* walk(join(p, name));
  } else if ([".jsx", ".tsx", ".js", ".ts"].includes(extname(p)) && !SKIP.test(basename(p))) {
    yield p;
  }
}

let files = 0;
let changed = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    files++;
    const before = readFileSync(file, "utf8");
    added = 0;
    review = new Set();
    const after = transform(before);
    if (review.size) console.log(`review     ${file}: ${[...review].join(" ")}`);
    if (after !== before && stripDark(after) !== stripDark(before)) {
      console.log(`SKIPPED  ${file}  (could not be processed safely; left unchanged)`);
      continue;
    }
    if (after !== before) {
      changed++;
      console.log(`${DRY ? "would update" : "updated"}  ${file}  (+${added} dark classes)`);
      if (!DRY) writeFileSync(file, after);
    }
  }
}
console.log(`\n${changed} of ${files} files ${DRY ? "would change" : "changed"}.`);
