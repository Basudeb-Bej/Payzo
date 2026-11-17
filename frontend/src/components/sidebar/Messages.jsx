// frontend/src/components/sidebar/messages.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api.js";
import { inr, newKey } from "./Formatters.js";
import { Avatar } from "./profile.jsx";

/* ------------------------------------------------------------------ helpers */
const ts = (t) => new Date(t.created_at + "Z").getTime();
const dayLabel = (t) =>
  new Date(t.created_at + "Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const timeLabel = (t) =>
  new Date(t.created_at + "Z").toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

function relative(t) {
  const min = Math.floor((Date.now() - ts(t)) / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(t.created_at + "Z").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function preview(c) {
  const l = c.last;
  if (l.kind === "message") return `${l.direction === "out" ? "You: " : ""}${l.body}`;
  return `${l.direction === "out" ? "You sent" : "Sent you"} ${inr(l.amount)}${l.note ? ` · ${l.note}` : ""}`;
}

/* ------------------------------------------------------------------ main */
export default function Messages({ user, wallet, txs, messages, loading, onRefresh, onRefreshMessages, onFlash }) {
  const [query, setQuery] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [composing, setComposing] = useState(false);
  const bottomRef = useRef(null);

  // One conversation per person; payments and messages share one timeline.
  const conversations = useMemo(() => {
    const map = new Map();
    const bucket = (key, name, ref, avatar = null) => {
      if (!map.has(key)) map.set(key, { key, name, ref, avatar: null, items: [] });
      const entry = map.get(key);
      if (avatar && !entry.avatar) entry.avatar = avatar;
      return entry;
    };
    for (const t of txs) {
      if (t.type !== "TRANSFER") continue;
      const k = t.counterparty_ref || t.counterparty || "unknown";
      bucket(k, t.counterparty || "Unknown", t.counterparty_ref).items.push({ ...t, kind: "payment", uid: `p${t.id}` });
    }
    for (const m of messages) {
      const k = m.counterparty_ref || "unknown";
      bucket(k, m.counterparty || "Unknown", m.counterparty_ref, m.counterparty_avatar).items.push({
        ...m,
        kind: "message",
        uid: `m${m.id}`,
      });
    }
    return [...map.values()]
      .map((c) => {
        const items = [...c.items].sort((a, b) => ts(a) - ts(b) || a.uid.localeCompare(b.uid));
        return {
          ...c,
          items,
          last: items[items.length - 1],
          unread: items.filter((i) => i.kind === "message" && i.direction === "in" && !i.read).length,
        };
      })
      .sort((a, b) => ts(b.last) - ts(a.last));
  }, [txs, messages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filterUnread && c.unread === 0) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.ref || "").toLowerCase().includes(q) ||
        c.items.some((i) => (i.body || i.note || "").toLowerCase().includes(q))
      );
    });
  }, [conversations, query, filterUnread]);

  const active = conversations.find((c) => c.key === selectedKey) || null;
  const activeUnread = active?.unread ?? 0;
  const activeCount = active?.items.length ?? 0;
  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);

  // Opening a chat marks its incoming messages as read (on the server)
  useEffect(() => {
    if (!active?.ref || activeUnread === 0) return;
    api.markRead(active.ref).then(() => onRefreshMessages()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, activeUnread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [selectedKey, activeCount]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-11rem)] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="w-full space-y-3 border-r border-slate-100 p-4 md:w-80 dark:border-slate-800">
          <div className="h-9 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="hidden flex-1 animate-pulse bg-slate-50/50 md:block dark:bg-slate-800/60" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[540px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* ---------------- conversation list ---------------- */}
      <aside className={`${active ? "hidden md:flex" : "flex"} w-full flex-col border-r border-slate-200/70 bg-white md:w-80 md:shrink-0 dark:border-slate-800 dark:bg-slate-900`}>
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Messages</h2>
              {totalUnread > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setComposing((c) => !c)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                composing
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  : "bg-[#0B1246] text-white shadow-sm hover:bg-[#14206E] dark:bg-blue-600 dark:hover:bg-blue-500"
              }`}
            >
              {composing ? (
                "Cancel"
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>New</span>
                </>
              )}
            </button>
          </div>

          {composing ? (
            <NewChat
              onFlash={onFlash}
              onDone={async (ref) => {
                await onRefreshMessages();
                setSelectedKey(ref);
                setComposing(false);
              }}
            />
          ) : (
            <div className="mt-3 space-y-2.5">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people or messages…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-800"
                />
              </div>

              {totalUnread > 0 && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterUnread(false)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      !filterUnread ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterUnread(true)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      filterUnread ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    Unread ({totalUnread})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <li className="px-4 py-12 text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No conversations yet</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Start one with New, or send someone a payment.
              </p>
            </li>
          )}
          {conversations.length > 0 && filtered.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No matches{query ? ` for "${query}"` : ""}.
            </li>
          )}
          {filtered.map((c) => {
            const isSelected = c.key === selectedKey;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => setSelectedKey(c.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    isSelected
                      ? "bg-blue-50/90 ring-1 ring-blue-200/70 dark:bg-blue-500/10 dark:ring-blue-500/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Avatar src={c.avatar} name={c.name} className="h-10 w-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${c.unread ? "font-bold text-slate-900 dark:text-slate-100" : "font-semibold text-slate-900 dark:text-slate-100"}`}>
                        {c.name}
                      </p>
                      <span className={`shrink-0 text-[11px] ${c.unread ? "font-semibold text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>
                        {relative(c.last)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={`truncate text-xs ${c.unread ? "font-semibold text-slate-800 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>
                        {preview(c)}
                      </p>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ---------------- thread ---------------- */}
      <section className={`${active ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-slate-50/50 dark:bg-slate-800/60`}>
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Your Payzo Messages</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Select a conversation on the left to view messages and payment history, or start a new chat.
            </p>
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="mt-4 rounded-xl bg-[#0B1246] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#14206E] dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <Thread
            key={active.key}
            conv={active}
            user={user}
            wallet={wallet}
            bottomRef={bottomRef}
            onBack={() => setSelectedKey(null)}
            onRefresh={onRefresh}
            onRefreshMessages={onRefreshMessages}
            onFlash={onFlash}
          />
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ new conversation */
function NewChat({ onDone, onFlash }) {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const sent = await api.sendMessage({ to: to.trim(), body });
      await onDone(sent.counterparty_ref);
    } catch (e2) {
      onFlash("err", e2.message || "Couldn't send the message");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2.5 rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200/70 dark:bg-slate-800/60 dark:ring-slate-700/70">
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        required
        autoFocus
        placeholder="Email, Wallet ID or phone number"
        aria-label="Recipient"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={500}
        rows={3}
        placeholder="Write a message…"
        aria-label="Message"
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900"
      />
      <p className="text-[11px] leading-snug text-slate-400">
        New contacts allow 1 initial message until they reply.
      </p>
      <button
        type="submit"
        disabled={busy || !to.trim() || !body.trim()}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ thread */
function Thread({ conv, user, wallet, bottomRef, onBack, onRefresh, onRefreshMessages, onFlash }) {
  const [payMode, setPayMode] = useState(false);

  const paid = (dir) =>
    conv.items
      .filter((i) => i.kind === "payment" && i.direction === dir && i.status === "SUCCESS")
      .reduce((n, i) => n + Number(i.amount), 0);

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <Avatar src={conv.avatar} name={conv.name} className="h-9 w-9 text-xs" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{conv.name}</p>
              {conv.ref && (
                <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 sm:inline-block dark:bg-slate-800 dark:text-slate-300">
                  {conv.ref}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              Sent {inr(paid("out"))} · Received {inr(paid("in"))}
            </p>
          </div>
        </div>

        {conv.ref && (
          <button
            type="button"
            onClick={() => setPayMode((p) => !p)}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              payMode
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                : "bg-[#0B1246] text-white hover:bg-[#14206E] dark:bg-blue-600 dark:hover:bg-blue-500"
            }`}
          >
            {payMode ? "Paying…" : "₹ Pay"}
          </button>
        )}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {conv.items.map((t, i) => {
          const prev = conv.items[i - 1];
          const out = t.direction === "out";
          return (
            <div key={t.uid}>
              {(!prev || dayLabel(prev) !== dayLabel(t)) && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full border border-slate-200/80 bg-white px-3 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {dayLabel(t)}
                  </span>
                </div>
              )}

              <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
                {t.kind === "message" ? (
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      out
                        ? "rounded-br-sm bg-blue-600 text-white"
                        : "rounded-bl-sm border border-slate-200/80 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{t.body}</p>
                    <p className={`mt-1 text-right text-[10px] ${out ? "text-blue-100" : "text-slate-400"}`}>
                      {timeLabel(t)}
                    </p>
                  </div>
                ) : (
                  <div
                    className={`min-w-[200px] max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      out
                        ? "rounded-br-sm bg-gradient-to-br from-[#0B1246] to-[#17287A] text-white"
                        : "rounded-bl-sm border border-emerald-200 bg-white text-slate-900 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          out ? "text-blue-200" : "text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {out ? "Payment Sent" : "Payment Received"}
                      </span>
                      {t.status === "SUCCESS" ? (
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                            out ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          }`}
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            t.status === "FAILED" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          }`}
                        >
                          {t.status === "FAILED" ? "Failed" : "Pending"}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xl font-bold tracking-tight">{inr(t.amount)}</p>
                    {t.note && (
                      <p className={`mt-1 break-words text-xs ${out ? "text-blue-100" : "text-slate-600 dark:text-slate-300"}`}>
                        {t.note}
                      </p>
                    )}
                    {t.status === "FAILED" && t.failure_reason && (
                      <p className="mt-1.5 text-xs text-red-300">{t.failure_reason}</p>
                    )}
                    <p className={`mt-2 text-right text-[10px] ${out ? "text-blue-200/80" : "text-slate-400"}`}>
                      {timeLabel(t)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <Composer
        conv={conv}
        user={user}
        wallet={wallet}
        payMode={payMode}
        setPayMode={setPayMode}
        onRefresh={onRefresh}
        onRefreshMessages={onRefreshMessages}
        onFlash={onFlash}
      />
    </>
  );
}

/* ------------------------------------------------------------------ composer */
function Composer({ conv, user, wallet, payMode, setPayMode, onRefresh, onRefreshMessages, onFlash }) {
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(newKey);

  const needsPin = Boolean(user?.has_pin);
  const insufficient = payMode && wallet && amount && Number(amount) > Number(wallet.balance);
  const canSend =
    conv.ref &&
    !busy &&
    !insufficient &&
    (payMode ? Number(amount) > 0 && (!needsPin || pin.length === 6) : text.trim().length > 0);

  function togglePay() {
    setPayMode((p) => {
      if (!p) setText((t) => t.slice(0, 140)); // payment notes are limited to 140 characters
      return !p;
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    try {
      if (payMode) {
        await api.transfer({
          to: conv.ref, // Wallet ID: history only returns names, not emails
          amount,
          note: text.trim() || null,
          pin: needsPin ? pin : undefined,
          idempotency_key: key,
        });
        const sent = amount;
        setKey(newKey());
        setAmount("");
        setPin("");
        setText("");
        setPayMode(false);
        await onRefresh();
        onFlash("ok", `Sent ${inr(sent)} to ${conv.name}`);
      } else {
        await api.sendMessage({ to: conv.ref, body: text });
        setText("");
        await onRefreshMessages();
      }
    } catch (e2) {
      onFlash("err", e2.message || "Couldn't send. Try again");
    } finally {
      setBusy(false);
    }
  }

  if (!conv.ref) {
    return (
      <p className="border-t border-slate-200/70 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        This person can't be messaged.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="border-t border-slate-200/70 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
      {payMode && (
        <div className="mb-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              Paying {conv.name}
            </span>
            {wallet && (
              <span className="text-slate-500 dark:text-slate-400">
                Available: <strong className="text-slate-800 dark:text-slate-200">{inr(wallet.balance)}</strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              placeholder="₹ Amount"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Amount"
              className={`w-36 rounded-xl border bg-white px-3 py-2 text-sm font-bold outline-none transition focus:ring-4 dark:bg-slate-900 ${
                insufficient
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-slate-700"
              }`}
            />
            {needsPin && (
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                aria-label="Transaction PIN"
                className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center font-mono text-sm tracking-widest outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900"
              />
            )}

            <div className="flex flex-wrap gap-1.5">
              {[100, 500, 1000, 2000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                >
                  ₹{preset}
                </button>
              ))}
            </div>
          </div>

          {insufficient && (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              Exceeds your balance ({inr(wallet.balance)})
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={togglePay}
          aria-pressed={payMode}
          title={payMode ? "Switch back to a message" : "Attach a payment"}
          className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
            payMode
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          ₹
        </button>
        <input
          type="text"
          maxLength={payMode ? 140 : 500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={payMode ? "Add a payment note (optional)" : `Message ${conv.name.split(" ")[0]}…`}
          aria-label={payMode ? "Payment note" : "Message"}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
        />
        <button
          type="submit"
          disabled={!canSend}
          className={`shrink-0 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
            payMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#0B1246] hover:bg-[#14206E] dark:bg-blue-600 dark:hover:bg-blue-500"
          }`}
        >
          {busy ? "Sending…" : payMode ? `Pay${amount ? ` ${inr(amount)}` : ""}` : "Send"}
        </button>
      </div>
    </form>
  );
}