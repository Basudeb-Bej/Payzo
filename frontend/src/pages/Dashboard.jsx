// frontend/src/pages/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import Sidebar, { NAV_ITEMS } from "../components/sidebar/Sidebar.jsx";
import WalletPanel from "../components/sidebar/Wallet.jsx";
import Activity from "../components/sidebar/Activity.jsx";
import Settings from "../components/sidebar/Settings.jsx";
import { MoneyFlowCard, StatisticsCard } from "../components/sidebar/Analytics.jsx";
import { inr } from "../components/sidebar/Formatters.js";
import Help from "../components/sidebar/Help.jsx";
import Messages from "../components/sidebar/Messages.jsx";
import Invoices from "../components/sidebar/invoices.jsx";
import Banks from "../components/sidebar/Banks.jsx";
import { useToast } from "../components/toast/ToastProvider.jsx";
import { ThemeToggle } from "../components/theme/ThemeControls.jsx";
import { Avatar } from "../components/sidebar/profile.jsx";

export default function Dashboard({ user, onLogout, onUserChange }) {
  // Every success / error / info message in the app goes through this toast.
  const { notify: flash } = useToast();

  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");
  const [profile, setProfile] = useState(null);

  const [messages, setMessages] = useState([]);

  const loadMessages = useCallback(async () => {
    try {
      const m = await api.messages();
      setMessages(Array.isArray(m) ? m : []);
    } catch (err) {
      console.error(err); // background polling: stay quiet, don't toast every 15s
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const id = setInterval(() => { if (!document.hidden) loadMessages(); }, 15000);
    return () => clearInterval(id);
  }, [loadMessages]);

  const unreadMessages = useMemo(
    () => messages.filter((m) => m.direction === "in" && !m.read).length,
    [messages]
  );

  const [invoices, setInvoices] = useState([]);

  const loadInvoices = useCallback(async () => {
    try {
      const list = await api.invoices();
      setInvoices(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err); // background polling: stay quiet
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    const id = setInterval(() => { if (!document.hidden) loadInvoices(); }, 15000);
    return () => clearInterval(id);
  }, [loadInvoices]);

  // invoices sent to me that I still have to pay
  const pendingInvoices = useMemo(
    () => invoices.filter((i) => i.direction === "received" && i.status === "PENDING").length,
    [invoices]
  );

  // Navigation & responsive drawer state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Action panel mode ("send" | "topup") & prefilled recipient (Wallet ID or phone number)
  const [actionMode, setActionMode] = useState("send");
  const [prefillRecipient, setPrefillRecipient] = useState("");

  // Card privacy toggle
  const [hideBalance, setHideBalance] = useState(false);

  // Search, filter, receipt modal & notifications
  const [searchQuery, setSearchQuery] = useState("");
  const [txFilter, setTxFilter] = useState("all");
  const [showAllTxs, setShowAllTxs] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Chart range
  const [chartRange, setChartRange] = useState("monthly");

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const refresh = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [w, t] = await Promise.all([api.wallet(), api.transactions()]);
      setWallet(w);
      setTxs(Array.isArray(t) ? t : []);
    } catch (err) {
      console.error(err);
      flash("err", err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [flash]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Profile (photo, phone, address) is loaded once and shared with the header + Settings
  useEffect(() => {
    api.profileDetails().then(setProfile).catch(() => { });
  }, []);

  // Open a payment link / scanned QR code: https://your-app/#pay=PZ0123456789
  // The dashboard only mounts after sign-in, so this also works when the person
  // scanned the QR while signed out and logged in afterwards.
  useEffect(() => {
    const m = window.location.hash.match(/^#pay=(PZ\d{6,14})$/i);
    if (!m) return;
    setPrefillRecipient(m[1].toUpperCase());
    setActionMode("send");
    setActiveTab("dashboard");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowLogoutModal(false);
        setSelectedTx(null);
        setShowNotifications(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalTopup = 0;

    for (const t of txs) {
      const amt = Number(t.amount || 0);
      if (t.type === "TOPUP") {
        totalTopup += amt;
        totalIn += amt;
      } else if (t.direction === "out") {
        totalOut += amt;
      } else {
        totalIn += amt;
      }
    }

    return {
      totalIn,
      totalOut,
      totalTopup,
      count: txs.length,
    };
  }, [txs]);

  // People you've paid before: { name, ref } where ref is their Wallet ID
  const recentContacts = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const t of txs) {
      if (t.type === "TRANSFER" && t.counterparty_ref && !seen.has(t.counterparty_ref)) {
        seen.add(t.counterparty_ref);
        list.push({ name: t.counterparty, ref: t.counterparty_ref });
        if (list.length >= 4) break;
      }
    }
    return list;
  }, [txs]);

  const filteredTxs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return txs.filter((t) => {
      if (txFilter === "topup" && t.type !== "TOPUP") return false;
      if (txFilter === "out" && t.direction !== "out") return false;
      if (txFilter === "in" && (t.direction === "out" || t.type === "TOPUP")) return false;

      if (!q) return true;
      const title =
        t.type === "TOPUP"
          ? "wallet top-up"
          : `${t.direction === "out" ? "to" : "from"} ${t.counterparty || ""}`.toLowerCase();
      const note = (t.note || "").toLowerCase();
      return title.includes(q) || note.includes(q) || String(t.amount).includes(q);
    });
  }, [txs, txFilter, searchQuery]);

  const visibleTxs = showAllTxs || activeTab === "activity" ? filteredTxs : filteredTxs.slice(0, 5);

  const selectTab = (id) => {
    setActiveTab(id);
    setMobileNavOpen(false);
    if (id === "wallets") setActionMode("topup");
    if (id === "settings") setSettingsTab("profile");
  };

  const openSettings = (tab = "profile") => {
    setSettingsTab(tab);
    setActiveTab("settings");
    setMobileNavOpen(false);
  };

  const exportCsv = () => {
    if (filteredTxs.length === 0) {
      flash("err", "No transactions to export");
      return;
    }
    const header = ["ID", "Type", "Direction", "Counterparty", "Amount (INR)", "Note", "Date"];
    const rows = filteredTxs.map((t) => [
      t.id,
      t.type,
      t.direction || "in",
      t.counterparty || "Wallet Top-up",
      Number(t.amount || 0).toFixed(2),
      `"${(t.note || "").replace(/"/g, '""')}"`,
      new Date(t.created_at + "Z").toISOString(),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payzo-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash("ok", `Exported ${filteredTxs.length} transaction(s) to CSV`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 lg:flex dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={selectTab}
        txCount={txs.length}
        unreadMessages={unreadMessages}
        pendingInvoices={pendingInvoices}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onOpenLogout={() => setShowLogoutModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/70 bg-white/90 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label ||
                (activeTab === "help" ? "Get Help" : "Settings")}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="relative hidden sm:block">
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions…"
                className="w-48 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white md:w-64 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
              />
            </div>

            <ThemeToggle />

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((s) => !s)}
                className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
                aria-label="Notifications"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {txs.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Alerts</span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Close
                    </button>
                  </div>
                  {txs.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No recent wallet activity yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {txs.slice(0, 3).map((t) => (
                        <li
                          key={t.id}
                          onClick={() => {
                            setSelectedTx(t);
                            setShowNotifications(false);
                          }}
                          className="cursor-pointer rounded-xl bg-slate-50 p-2.5 text-xs transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                        >
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {t.type === "TOPUP"
                              ? "Wallet top-up"
                              : t.direction === "out"
                                ? `Sent to ${t.counterparty}`
                                : `Received from ${t.counterparty}`}
                          </p>
                          <p className="mt-0.5 text-slate-500 dark:text-slate-400">{inr(t.amount)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => selectTab("settings")}
              className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              <Avatar src={profile?.avatar} name={user?.name} className="h-8 w-8 text-xs" />
              <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-slate-300">
                {user?.name}
              </span>
            </button>
          </div>
        </header>

        {/* Main Workspace Body */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:hidden">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions…"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:placeholder:text-slate-500"
            />
          </div>

          {activeTab === "messages" ? (
            <Messages
              user={user}
              wallet={wallet}
              txs={txs}
              messages={messages}
              loading={loading}
              onRefresh={refresh}
              onRefreshMessages={loadMessages}
              onFlash={flash}
            />
          ) : activeTab === "banks" ? (
            <Banks onFlash={flash} />
          ) : activeTab === "invoices" ? (
            <Invoices
              user={user}
              wallet={wallet}
              invoices={invoices}
              loading={loading}
              onRefreshInvoices={loadInvoices}
              onRefresh={refresh}
              onFlash={flash}
            />
          ) : activeTab === "help" ? (
            <Help
              user={user}
              wallet={wallet}
              onNavigate={selectTab}
              onOpenSettings={openSettings}
            />
          ) : activeTab === "settings" ? (
            <Settings
              initialTab={settingsTab}
              user={user}
              profile={profile}
              onProfileChange={setProfile}
              onUserChange={onUserChange}
              onLogout={onLogout}
              onFlash={flash}
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              {(activeTab === "dashboard" || activeTab === "wallets") && (
                <WalletPanel
                  user={user}
                  wallet={wallet}
                  loading={loading}
                  refreshing={refreshing}
                  hideBalance={hideBalance}
                  onToggleHideBalance={() => setHideBalance((h) => !h)}
                  actionMode={actionMode}
                  onActionModeChange={setActionMode}
                  recentContacts={recentContacts}
                  prefillRecipient={prefillRecipient}
                  onClearPrefill={() => setPrefillRecipient("")}
                  onOpenHistory={() => setActiveTab("activity")}
                  onRefresh={refresh}
                  onFlash={flash}
                  isWide={activeTab === "wallets"}
                />
              )}

              <div
                className={`space-y-6 ${activeTab === "wallets"
                  ? "lg:col-span-7"
                  : activeTab === "activity" || activeTab === "analytics"
                    ? "lg:col-span-12"
                    : "lg:col-span-8"
                  }`}
              >
                {(activeTab === "dashboard" || activeTab === "analytics") && (
                  <MoneyFlowCard
                    txs={txs}
                    range={chartRange}
                    onRangeChange={setChartRange}
                  />
                )}

                {activeTab !== "analytics" && (
                  <Activity
                    title={activeTab === "activity" ? "All Transactions" : "Recent Transactions"}
                    loading={loading}
                    txs={txs}
                    visibleTxs={visibleTxs}
                    filteredTxsCount={filteredTxs.length}
                    txFilter={txFilter}
                    onFilterChange={setTxFilter}
                    showAllTxs={showAllTxs}
                    onToggleShowAll={() => setShowAllTxs((s) => !s)}
                    isFullPage={activeTab === "activity"}
                    onSelectTx={setSelectedTx}
                    onExportCsv={exportCsv}
                  />
                )}

                <StatisticsCard stats={stats} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onClick={() => setSelectedTx(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Transaction Receipt
              </span>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close receipt"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {selectedTx.type === "TOPUP"
                  ? "Wallet top-up"
                  : selectedTx.direction === "out"
                    ? `Sent to ${selectedTx.counterparty}`
                    : `Received from ${selectedTx.counterparty}`}
              </p>
              <p
                className={`mt-1 text-3xl font-bold ${selectedTx.direction === "out" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
              >
                {selectedTx.direction === "out" ? "−" : "+"}
                {inr(selectedTx.amount)}
              </p>
            </div>

            <dl className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/60">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Reference ID</dt>
                <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">#{selectedTx.id}</dd>
              </div>
              {selectedTx.counterparty_ref && selectedTx.type === "TRANSFER" && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Wallet ID</dt>
                  <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedTx.counterparty_ref}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Date & Time</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">
                  {new Date(selectedTx.created_at + "Z").toLocaleString("en-IN")}
                </dd>
              </div>
              {selectedTx.note && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Note</dt>
                  <dd className="text-right font-medium text-slate-800 dark:text-slate-200">{selectedTx.note}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                <dd className="font-semibold text-emerald-700 dark:text-emerald-300">Success</dd>
              </div>
            </dl>

            <div className="mt-5 flex gap-3">
              {selectedTx.type === "TRANSFER" && selectedTx.counterparty_ref && (
                <button
                  type="button"
                  onClick={() => {
                    setPrefillRecipient(selectedTx.counterparty_ref);
                    setActionMode("send");
                    setActiveTab("dashboard");
                    setSelectedTx(null);
                  }}
                  className="w-full rounded-xl bg-[#0B1246] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14206E] dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Send Again
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
            className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-600 dark:text-red-400"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>

            <div className="text-center">
              <h2 id="logout-title" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Confirm Logout
              </h2>
              <p id="logout-description" className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Are you sure you want to sign out of your Payzo account? You will need to log in
                again to access your wallet.
              </p>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]"
              >
                Yes, Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}