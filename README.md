# Payzo – wallet app (React + Python + MySQL)

Public home page → register / log in → wallet with QR payments, bank linking and withdrawals.

```
Browser ──► Vercel (React + Tailwind) ──► Render (Python FastAPI) ──► TiDB Cloud (online MySQL)
```

## Updating an existing folder (from the older version)

Delete these old files, then copy in the new ones keeping the same folder paths:

- `frontend/src/api.js`  (now `frontend/src/lib/api.js`)
- `frontend/src/pages/AuthForm.jsx`  (replaced by `Login.jsx` + `Register.jsx`)
- everything inside `backend/app/` from the older version (e.g. `routes_auth.py`, `routes_wallet.py`)
- the `package.json`, `package-lock.json` and `node_modules` at the **project root**: they aren't needed (only `frontend/` and `backend/` have their own)

Then run `npm install` inside `frontend/` and `pip install -r requirements.txt` inside `backend/`.
`frontend/src/assets/` is not used by the app; keep or delete the images as you like.

## What is real and what is sandbox

| Built and tested | Sandbox only (fake money) |
|---|---|
| Registration, login, rate limiting, account lockout, sessions, auto sign-out | Adding money (`collect_funds`) |
| Optional authenticator-app 2FA (TOTP), 6-digit transaction PIN with lockout | Bank account verification (`verify_bank_account`) |
| Wallet ledger, wallet-to-wallet payments by Wallet ID / email / QR | Withdrawals to a bank (`payout_to_bank`) |
| Encrypted bank details, limits, idempotency, audit log, receipts | KYC (a button that marks you verified) |

**No real money moves until you connect a licensed payment partner** (see "Going live" at the bottom).
The only place money enters or leaves is `backend/app/providers/`, so going live means
writing one adapter class, not rewriting the app.

---

## PART 1 – Install the tools (once)

| Tool | Where | Check |
|---|---|---|
| Python 3.12 | python.org/downloads (tick "Add Python to PATH" on Windows) | `python --version` |
| Node.js 20 or 22 LTS | nodejs.org | `node --version` |
| Git | git-scm.com | `git --version` |
| VS Code | code.visualstudio.com | |

No local MySQL or Docker needed: the database is online.

## PART 2 – Online MySQL (TiDB Cloud)

1. Sign up at tidbcloud.com and create a free **Starter** cluster (check current free limits when you sign up).
2. Open the cluster → **Connect** → Public endpoint → generate a password and save it.
3. Note **host**, **port** (4000), **user** (like `abc123.root`), **password**.
4. In the cluster's **SQL Editor** create a fresh database: `CREATE DATABASE payzo;`
   (If you used an older version of this project in the same database, use a new database or drop its old
   `transactions`, `wallets`, `users` tables first. The table layout changed.)
5. Your connection string:
   `mysql+pymysql://USER:PASSWORD@HOST:4000/payzo`
   (Special characters in the password must be URL-encoded; simplest is a letters-and-numbers password.)

## PART 3 – Run it on your computer first

**Backend**
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate        Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
```
Fill in `backend/.env`:
```
APP_ENV=development
JWT_SECRET=<python -c "import secrets; print(secrets.token_hex(32))">
ENCRYPTION_KEY=<python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:4000/payzo
DB_SSL=true
FRONTEND_ORIGINS=http://localhost:5173
PAYMENT_PROVIDER=sandbox
```
Then: `uvicorn app.main:app --reload --port 8000` and open http://localhost:8000/docs.

> Keep `ENCRYPTION_KEY` safe and never change it later: it decrypts stored bank account numbers.

**Frontend** (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. You'll see the public home page. Create two accounts (use a private window for the second),
set a PIN in **Security**, click "Verify (sandbox)" on the dashboard, add money, and pay the other wallet.

## PART 4 – GitHub
```bash
git init && git add . && git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/payzo.git
git push -u origin main
```
`.gitignore` keeps `.env` out. **Never commit secrets.**

## PART 5 – Backend on Render
New → Web Service → your repo, then:

- **Root Directory:** `backend`  ·  **Runtime:** Python 3  ·  **Build:** `pip install -r requirements.txt`
- **Start Command:**
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`
  (`--proxy-headers` makes rate limiting see each visitor's real IP instead of Render's proxy.)
- **Health Check Path:** `/api/health`

Environment variables:

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.12.7` |
| `APP_ENV` | `development` for sandbox testing (see note) |
| `PAYMENT_PROVIDER` | `sandbox` |
| `DATABASE_URL` | your TiDB string |
| `DB_SSL` | `true` |
| `JWT_SECRET` | long random string |
| `ENCRYPTION_KEY` | Fernet key (from the command above) |
| `FRONTEND_ORIGINS` | `http://localhost:5173` for now (Part 7) |

> `APP_ENV=production` hides `/docs`, removes the sandbox "verify me" endpoint and refuses to start with weak secrets.
> Use it once a real payment partner is connected. For sandbox testing online, keep `development`.

Test: open `https://YOUR-SERVICE.onrender.com/api/health` → `{"status":"ok"}`.

## PART 6 – Frontend on Vercel
Import the repo → **Root Directory:** `frontend` → Framework: Vite → add `VITE_API_URL` = your Render URL (no trailing `/`) → Deploy.
`vercel.json` makes direct links like `/send` work after a refresh and adds basic security headers.

Optional Vercel variables for the home page: `VITE_COMPANY_NAME`, `VITE_SUPPORT_EMAIL`, `VITE_LICENSE_NOTE` (your regulatory / partner-bank disclosure line).

## PART 7 – Connect them
Render → Environment → `FRONTEND_ORIGINS` = your exact Vercel URL (e.g. `https://payzo.vercel.app`, no trailing `/`).
Optional: add several, comma-separated. Save, wait for redeploy, open your Vercel URL.

## Troubleshooting

| Problem | Fix |
|---|---|
| CORS error in browser console | `FRONTEND_ORIGINS` on Render must exactly equal your Vercel URL |
| Calls go to the wrong place / "Can't reach the server" | `VITE_API_URL` missing or wrong on Vercel. Fix it and **redeploy** (value is baked in at build time) |
| First load takes ~1 minute | Render's free plan sleeps when idle |
| `Unsafe production config` on Render start | `APP_ENV=production` needs `JWT_SECRET` (32+ chars) and `ENCRYPTION_KEY` |
| `Table ... has no column` / odd DB errors | You're reusing a database from an older version: use a fresh database |
| "Too many attempts" | Rate limit hit. Wait a minute. Repeated bad logins lock an account for 15 minutes |
| Camera won't open for QR scan | Needs HTTPS (Vercel is) and camera permission; typing the Wallet ID always works |
| Render build fails on `pydantic-core` | Set `PYTHON_VERSION=3.12.7` |
| `Access denied` / SSL error to DB | Re-copy host/user/password; `DB_SSL=true`; URL-encode special characters |

## Project layout
```
backend/app/   config, database, models, schemas, security (hashing, JWT, PIN, TOTP, encryption),
               money.py (ALL balance changes), providers/ (sandbox + adapter interface), routes/
frontend/src/  pages/ (Landing, Login, Register, Dashboard, Send, Receive, AddMoney, Withdraw, Banks, Activity, Security)
               components/landing/ (animated hero phone, scroll reveal)  ·  Tailwind CSS
```

## Security notes (what is in place)
Passwords: SHA-256 → bcrypt. PIN: HMAC → bcrypt, lock after 5 wrong tries. Login: per-IP rate limits + per-account lockout,
same error for unknown email / wrong password. Tokens: short-lived, revocable server-side sessions, sliding refresh, 8-hour cap,
15-minute idle sign-out. Money: `DECIMAL`, row locks, idempotency keys, append-only ledger, balance ≥ 0 DB constraint.
Bank numbers: encrypted at rest, masked in every response. Every sensitive action is written to `audit_logs`.

## Going live with real money (read before you launch)
This is not only a coding step. In India, holding customers' money in a wallet is a regulated activity.
Based on RBI's published draft prepaid-instrument rules (April 2026; verify the final text), non-bank wallet issuers need
**RBI authorisation** and minimum net worth, and wallets are capped by KYC level. The alternative is to operate through a
**licensed partner** that holds the funds. Talk to a fintech lawyer first. Then:

1. **Partner:** implement `PaymentProvider` (`backend/app/providers/base.py`) for your partner; set `PAYMENT_PROVIDER`.
2. **Webhooks:** partners confirm payments/payouts asynchronously. Add a signature-verified webhook that finishes `PENDING`
   transactions, plus a reconciliation job that compares your ledger with the partner's settlement report daily.
3. **KYC:** replace the sandbox button with your partner's KYC flow; set real limits in `config.py` (`LIMITS` are placeholders).
4. **Compliance:** record-keeping, suspicious-transaction reporting, grievance officer, privacy law obligations, Terms and Privacy text
   (add Terms and Privacy pages and link them from the footer and sign-up form), and the regulatory disclosure line (`VITE_LICENSE_NOTE`).
5. **Email/SMS OTP and alerts** (you planned this): then hide whether an email is registered at sign-up.
6. **Operations:** paid hosting (no sleeping), DB backups, monitoring/alerts, Redis for rate limits if you run >1 server,
   Alembic migrations instead of auto-create, a penetration test, and a secrets manager.