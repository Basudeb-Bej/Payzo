// frontend/src/api.js
const TOKEN_KEY = "payzo_token";
const FLASH_KEY = "payzo_flash"; // a toast to show after the page reloads (read by App.jsx)
// Local: empty (Vite proxies /api to localhost:8000). Vercel: set VITE_API_URL to your Render URL.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && token) {
    clearToken();
    try {
      sessionStorage.setItem(
        FLASH_KEY,
        JSON.stringify({ type: "err", text: "Your session expired. Please sign in again." })
      );
    } catch {
      /* storage unavailable: reload without a toast */
    }
    window.location.reload();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // FastAPI returns {detail: "..."} or {detail: [{msg: "..."}]}
    const d = data.detail;
    throw new Error(Array.isArray(d) ? d.map((e) => e.msg).join(", ") : d || "Something went wrong");
  }
  return data;
}

export const api = {
  register: (b) => request("/auth/register", { method: "POST", body: b }),
  login: (b) => request("/auth/login", { method: "POST", body: b }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),

  // --- wallet ---
  wallet: () => request("/wallet"),
  topup: (amount) => request("/wallet/topup", { method: "POST", body: { amount } }),
  transfer: (b) => request("/wallet/transfer", { method: "POST", body: b }),
  transactions: () => request("/wallet/transactions"),
  // Resolve a Wallet ID or phone number (never email) to a masked name before paying
  lookupWallet: (q) => request(`/wallet/lookup?q=${encodeURIComponent(q)}`),

  // --- bank accounts ---
  banks: () => request("/banks"),
  // Free IFSC lookup: returns bank, branch, city ... for any Indian bank
  ifsc: (code) => request(`/banks/ifsc/${encodeURIComponent(code)}`),
  linkBank: (b) => request("/banks", { method: "POST", body: b }),
  // Balance + recent transactions (DEMO data in sandbox mode)
  bankDetails: (id) => request(`/banks/${id}/details`),
  removeBank: (id) => request(`/banks/${id}`, { method: "DELETE" }),

  // --- settings ---
  updateProfile: (name) => request("/account/profile", { method: "POST", body: { name } }),
  changePassword: (b) => request("/auth/change-password", { method: "POST", body: b }),
  totpSetup: (password) => request("/security/totp/setup", { method: "POST", body: { password } }),
  totpEnable: (code) => request("/security/totp/enable", { method: "POST", body: { code } }),
  totpDisable: (b) => request("/security/totp/disable", { method: "POST", body: b }),
  setPin: (b) => request("/security/pin", { method: "POST", body: b }),
  sessions: () => request("/account/sessions"),
  revokeSession: (id) => request(`/account/sessions/${id}`, { method: "DELETE" }),
  logoutAll: () => request("/auth/logout-all", { method: "POST" }),
  deleteAccount: (b) => request("/account/delete", { method: "POST", body: b }),

  // --- messages ---
  messages: () => request("/messages"),
  sendMessage: (b) => request("/messages", { method: "POST", body: b }),
  markRead: (contact) => request("/messages/read", { method: "POST", body: { contact } }),

  // --- profile details & photo ---
  profileDetails: () => request("/profile"),
  saveProfileDetails: (b) => request("/profile", { method: "POST", body: b }),
  setAvatar: (image) => request("/profile/avatar", { method: "POST", body: { image } }),
  removeAvatar: () => request("/profile/avatar", { method: "DELETE" }),

  // --- invoices ---
  invoices: () => request("/invoices"),
  createInvoice: (b) => request("/invoices", { method: "POST", body: b }),
  payInvoice: (id, pin) => request(`/invoices/${id}/pay`, { method: "POST", body: { pin: pin || null } }),
  cancelInvoice: (id) => request(`/invoices/${id}/cancel`, { method: "POST" }),
  declineInvoice: (id) => request(`/invoices/${id}/decline`, { method: "POST" }),
};