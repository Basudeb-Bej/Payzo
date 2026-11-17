<!--
  PAYZO — project README
  Keep this document aligned with the implementation and clearly distinguish
  sandbox functionality from real-money payment processing.
-->

<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&height=220&color=0:111827,45:1D4ED8,100:06B6D4&text=PAYZO&fontColor=FFFFFF&fontSize=72&fontAlignY=38&desc=Your%20wallet.%20Your%20control.&descAlignY=58&descSize=18&animation=fadeIn" alt="Payzo animated header" width="100%" />

  <h3>Modern digital wallet experience</h3>

  <p>
    A full-stack wallet application for account management, wallet-to-wallet transfers,
    QR payments and transaction tracking — with a security-first backend and sandbox payment flows.
  </p>

  <p>
    <a href="https://github.com/Basudeb-Bej/Payzo"><strong>Explore the repository</strong></a>
    ·
    <a href="https://github.com/Basudeb-Bej/Payzo/issues">Report an issue</a>
    ·
    <a href="https://github.com/Basudeb-Bej">Developer profile</a>
  </p>

  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=18&pause=1200&color=38BDF8&center=true&vCenter=true&width=650&lines=Send+money+between+Payzo+wallets;Scan+and+pay+with+QR+codes;Protect+accounts+with+2FA+and+transaction+PINs;Track+wallet+activity+in+one+place" alt="Animated Payzo feature tagline" />

  <br />

  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=111827" alt="React 18" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/MySQL-TiDB-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL and TiDB" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />

</div>

---

## ✨ About Payzo

**Payzo** is a full-stack digital wallet project built to demonstrate how a modern wallet experience can be designed and implemented. It combines a React frontend with a Python FastAPI backend and a MySQL-compatible database.

The application brings common wallet workflows together:

- Create an account and securely sign in.
- Manage a wallet and view its transaction history.
- Send money to another Payzo wallet using a Wallet ID or phone number.
- Receive payments and share wallet details through a QR code.
- Manage linked bank details and explore deposit and withdrawal flows.
- Protect sensitive actions with additional authentication controls.

> **Important — sandbox status:** Payzo is currently a project/demo implementation, not a licensed banking service. Add-money, bank verification and bank withdrawal flows are sandbox operations. No real bank transfer or real-money payment is performed by the current sandbox provider. See [Sandbox vs. live functionality](#-sandbox-vs-live-functionality).

## 🎬 Visual preview

<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:06B6D4,50:2563EB,100:7C3AED" alt="" width="80%" />

  <p><em>Want to see the actual interface? Run Payzo locally using the quick-start instructions below.</em></p>

  <a href="https://github.com/Basudeb-Bej/Payzo/tree/main/frontend">
    <img src="https://img.shields.io/badge/Explore-Frontend-2563EB?style=for-the-badge&logo=react&logoColor=white" alt="Explore frontend" />
  </a>
  <a href="https://github.com/Basudeb-Bej/Payzo/tree/main/backend">
    <img src="https://img.shields.io/badge/Explore-Backend-0F766E?style=for-the-badge&logo=fastapi&logoColor=white" alt="Explore backend" />
  </a>

</div>

**Screenshots and product walkthrough video:** not currently included in the repository. Add real application screenshots or a short screen recording here when available; no mock screenshots are presented as live product footage.

## 🚀 Core features

| Area | What is included |
|---|---|
| Authentication | Registration, login, session handling, rate limiting and account lockout |
| Account security | Optional authenticator-app TOTP 2FA and transaction PIN with lockout |
| Wallet | Wallet balance and ledger-based transaction records |
| Transfers | Wallet-to-wallet payments using Wallet ID, phone number or QR |
| QR payments | QR code generation and camera-based scanning (HTTPS and camera permission required) |
| Bank details | Linked bank detail management with encryption and masked responses |
| Money movement | Sandbox add-money, bank verification and withdrawal flows |
| Activity | Transaction history, receipts and audit records |

## 🧱 Technology stack

<div align="center">

  <img src="https://skillicons.dev/icons?i=react,js,tailwind,vite,python,fastapi,mysql,git,github&perline=9" alt="Technology stack icons" />

</div>

| Layer | Technology |
|---|---|
| Frontend | React 18, JavaScript, Vite |
| Styling | Tailwind CSS 3 |
| QR code | qrcode.react |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Data layer | SQLAlchemy 2, PyMySQL |
| Database | MySQL-compatible TiDB Cloud |
| Authentication & security | PyJWT, bcrypt, pyotp, cryptography |
| Rate limiting | SlowAPI |
| Deployment guide | Vercel (frontend), Render (backend), TiDB Cloud (database) |

## 🏛️ Architecture

```mermaid
flowchart LR
    U[User / Browser] --> FE[React + Vite Frontend]
    FE -->|HTTPS / REST API| API[FastAPI Backend]
    API --> AUTH[Authentication & Security]
    API --> WALLET[Wallet & Transaction Logic]
    API --> DB[(TiDB Cloud / MySQL)]
    WALLET --> PROVIDER[Payment Provider Interface]
    PROVIDER --> SANDBOX[Sandbox Provider]
```

The frontend communicates with the FastAPI backend through the configured API URL. Wallet balance changes are handled on the backend, while the provider interface separates sandbox money movement from a future licensed payment integration.

## 📁 Project structure

```text
Payzo/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── security.py
│   │   ├── routes_auth.py
│   │   ├── routes_account.py
│   │   ├── routes_wallet.py
│   │   ├── routes_profile.py
│   │   ├── routes_invoices.py
│   │   ├── routes_messages.py
│   │   ├── providers/
│   │   └── ...
│   ├── requirements.txt
│   └── .python-version
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── .gitignore
├── package.json
└── README.md
```

## ⚙️ Getting started

### 1. Prerequisites

Install the following tools:

- [Python 3.12](https://www.python.org/downloads/)
- [Node.js 20 or 22 LTS](https://nodejs.org/)
- [Git](https://git-scm.com/)
- A MySQL-compatible database. The deployment setup in this project uses [TiDB Cloud](https://www.pingcap.com/tidb/).

Check your installations:

```bash
python --version
node --version
npm --version
git --version
```

### 2. Clone the repository

```bash
git clone https://github.com/Basudeb-Bej/Payzo.git
cd Payzo
```

### 3. Configure the database

Create a database named `payzo` in your MySQL-compatible database:

```sql
CREATE DATABASE payzo;
```

Prepare the connection URL:

```text
mysql+pymysql://USER:PASSWORD@HOST:4000/payzo
```

URL-encode special characters in the database password before placing it in the connection URL.

### 4. Configure and run the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**
```powershell
.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Configure the values in `backend/.env`:

```dotenv
APP_ENV=development
JWT_SECRET=replace_with_a_long_random_secret
ENCRYPTION_KEY=replace_with_a_fernet_key
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:4000/payzo
DB_SSL=true
FRONTEND_ORIGINS=http://localhost:5173
PAYMENT_PROVIDER=sandbox
```

Generate secure secrets instead of using the example text:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend URLs:

- API base: `http://localhost:8000`
- Health check: `http://localhost:8000/api/health`
- Interactive API docs (development): `http://localhost:8000/docs`

**Keep the encryption key safe.** It is required to decrypt bank details already encrypted in the database. Do not rotate it without a planned key migration.

### 5. Configure and run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Configure the frontend API URL using the environment variable expected by the frontend deployment/build. For Vercel, the project README's deployment setup uses `VITE_API_URL` pointing to the backend URL (without a trailing slash).

## 🔐 Security practices

The project includes several security-oriented controls:

- Password hashing using bcrypt.
- Transaction PIN verification with a keyed hash and bcrypt.
- Optional time-based one-time password (TOTP) authentication.
- Login rate limiting and account lockout after repeated failed attempts.
- Server-managed sessions, revocation and automatic sign-out controls.
- Decimal-based monetary values and database constraints to prevent negative balances.
- Idempotency support and transaction ledger handling.
- Encryption of stored bank account details and masking of sensitive values in API responses.
- Audit logging for sensitive operations.

Security features reduce risk but do not constitute a security certification or guarantee. Review the implementation, configuration and deployment before exposing the application to real users.

## 🧪 Sandbox vs. live functionality

| Functionality | Current status |
|---|---|
| Registration and login | Implemented |
| Optional TOTP 2FA and transaction PIN | Implemented |
| Wallet-to-wallet transfers | Implemented within the Payzo wallet ledger |
| QR-based wallet payment | Implemented for Payzo wallet flows |
| Transaction history and audit records | Implemented |
| Add money / collect funds | Sandbox only |
| Bank account verification | Sandbox only |
| Withdraw to bank | Sandbox only |
| Real bank transfers / live payment settlement | Not connected |

**Payzo does not currently connect to SBI or another bank to initiate real deposits, payouts or account-to-account transfers.** A bank details form or a successful sandbox response is not proof of a real bank connection.

## ☁️ Deployment overview

The repository's deployment approach is:

| Component | Suggested platform | Configuration |
|---|---|---|
| Frontend | Vercel | Root directory: `frontend`; set `VITE_API_URL` |
| Backend | Render | Root directory: `backend`; install requirements and run Uvicorn |
| Database | TiDB Cloud | MySQL-compatible connection URL and SSL |

For Render, the start command is:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"
```

Set the backend's `FRONTEND_ORIGINS` to the exact deployed frontend origin. Configure secrets in the hosting provider's environment settings — never commit them to Git.

> Use development/sandbox settings only for testing. Before a production launch, configure production secrets and complete the real payment, compliance, monitoring and operational work described below.

## 🛣️ Roadmap

- [x] Wallet account and authentication foundation
- [x] Wallet-to-wallet transfer flows
- [x] QR-based wallet payment experience
- [x] Transaction records and account security controls
- [x] Sandbox provider interface
- [ ] Add real payment partner integration
- [ ] Implement verified provider webhooks and settlement reconciliation
- [ ] Integrate production KYC and applicable transaction limits
- [ ] Add automated tests and CI checks
- [ ] Publish product screenshots and a walkthrough video
- [ ] Complete production security and compliance review

## ⚖️ Before handling real money

A wallet application that stores, transfers or facilitates customer funds can trigger financial-services, payment-system, KYC/AML, consumer-protection, privacy and other legal obligations. Requirements depend on the actual business model and jurisdiction.

Before any real-money launch in India:

1. Obtain advice from qualified fintech/legal and compliance professionals.
2. Work with an appropriately authorised bank or payment provider, or obtain the authorisations required for the proposed model.
3. Implement provider-side payment confirmation with signature-verified webhooks.
4. Add reconciliation, refunds, dispute handling and operational monitoring.
5. Replace sandbox verification and limits with approved production KYC and risk controls.
6. Publish accurate terms, privacy, grievance and regulatory disclosures.

**Do not use the current sandbox implementation to accept, hold or promise real customer funds.**

## 🤝 Contributing

Contributions, suggestions and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Make your changes and test them locally.
4. Commit: `git commit -m "feat: describe your change"`.
5. Push your branch and open a Pull Request.

For bugs or feature ideas, please [open an issue](https://github.com/Basudeb-Bej/Payzo/issues).

## 📄 License

No license file is currently referenced in this repository. Unless a license is added, standard copyright applies and reuse, modification or redistribution is not automatically granted. Add a `LICENSE` file if you want to define open-source permissions.

---

<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&section=footer&height=120&color=0:06B6D4,50:1D4ED8,100:111827" alt="" width="100%" />

  **Built with care by [Basudeb Bej](https://github.com/Basudeb-Bej)**

  <sub>Payzo — a wallet project focused on a clean experience and security-conscious engineering.</sub>

  <br />

  <a href="https://github.com/Basudeb-Bej/Payzo">⭐ Star this repository</a>
  ·
  <a href="https://github.com/Basudeb-Bej/Payzo/issues">Share feedback</a>

</div>
