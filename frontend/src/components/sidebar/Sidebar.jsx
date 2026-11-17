// frontend/src/components/sidebar/Sidebar.jsx
import image1 from "../../assets/image2.png";

export const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "wallets", label: "My Wallets", icon: "wallet" },
    { id: "activity", label: "Activity", icon: "activity" },
    { id: "analytics", label: "Analytics", icon: "chart" },
    { id: "banks", label: "Bank Accounts", icon: "bank" },
    { id: "invoices", label: "Invoices", icon: "file" },
    { id: "messages", label: "Messages", icon: "message" },
];

function NavIcon({ name, className = "h-5 w-5" }) {
    switch (name) {
        case "home":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
                </svg>
            );
        case "wallet":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M16 12h4" />
                </svg>
            );
        case "activity":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            );
        case "chart":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            );
        case "bank":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
                </svg>
            );
        case "file":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
            );
        case "message":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            );
        case "help":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            );
        case "settings":
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            );
        default:
            return null;
    }
}

export default function Sidebar({
    activeTab,
    onSelectTab,
    txCount = 0,
    unreadMessages = 0,
    pendingInvoices = 0,   
    mobileOpen,
    onCloseMobile,
    onOpenLogout,
}) {
    return (
        <>
            {/* Mobile Sidebar Backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
                    onClick={onCloseMobile}
                />
            )}

            {/* Left Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white px-4 py-5 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:overflow-y-auto lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Brand */}
                <div className="mb-7 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                        <img src={image1} alt="Payzo Logo" className="h-9 w-auto object-contain" />
                        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Payzo</span>
                    </div>
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        aria-label="Close menu"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const active = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelectTab(item.id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${active
                                    ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                                    }`}
                            >
                                <NavIcon
                                    name={item.icon}
                                    className={`h-5 w-5 ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}
                                />
                                <span>{item.label}</span>

                                {item.id === "messages" && unreadMessages > 0 && (
                                    <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                        {unreadMessages}
                                    </span>
                                )}

                                {item.id === "invoices" && pendingInvoices > 0 && (
                                    <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                                        {pendingInvoices}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Utility Links */}
                <div className="mt-6 space-y-1 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => onSelectTab("help")}
                        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${activeTab === "help"
                            ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                            }`}
                    >
                        <NavIcon name="help" className="h-5 w-5 text-slate-400" />
                        <span>Get Help</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectTab("settings")}
                        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${activeTab === "settings"
                            ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                            }`}
                    >
                        <NavIcon name="settings" className="h-5 w-5 text-slate-400" />
                        <span>Settings</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}