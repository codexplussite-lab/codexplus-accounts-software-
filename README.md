# CodexPlus Accounts Software

Enterprise-grade Financial Ledger, Sales & Inventory Management System developed by **CODEX PLUS** ([https://codexplus.site/](https://codexplus.site/)).

---

## 📁 Project Structure

```text
codexplus-accounts-software/
├── backend/                  # Node.js + Express + Prisma API
│   ├── prisma/               # Database schema & migrations
│   ├── src/                  # Controllers, routes, middlewares
│   ├── uploads/              # Uploaded documents and attachments
│   ├── .env.example          # Sample backend environment configuration
│   └── package.json          # Backend dependencies and scripts
│
├── frontend/                 # React + Vite Modern Web Application
│   ├── public/               # Public assets & icons
│   ├── src/                  # React components, UI studio, state logic
│   ├── .env.example          # Sample frontend environment configuration
│   ├── vercel.json           # SPA routing rewrite for Vercel/Netlify
│   └── package.json          # Frontend dependencies and scripts
│
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
The backend API will run at `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend web app will run at `http://localhost:5173`.

---

## 🌐 Production Deployment Guide

### Deploying the Backend (e.g. Render, Railway, VPS, Heroku)
1. Set the root directory for the backend service to `backend`.
2. **Build Command:**
   ```bash
   npm install && npm run build
   ```
3. **Start Command:**
   ```bash
   npm start
   ```
4. **Environment Variables:**
   - `PORT`: `5000` (or provided by host)
   - `JWT_SECRET`: Secure random string (min 32 characters)
   - `DATABASE_URL`: `file:./dev.db` (or PostgreSQL connection string)
   - `BACKUP_SECRET_KEY`: Secure encryption key for local backups

### Deploying the Frontend (e.g. Vercel, Netlify, Cloudflare Pages)
1. Set the root directory for the frontend service to `frontend`.
2. **Build Command:**
   ```bash
   npm run build
   ```
3. **Output Directory:**
   `dist`
4. **Environment Variables:**
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://api.yourdomain.com`)
   - `VITE_API_BASE_URL`: Your deployed backend API URL (e.g. `https://api.yourdomain.com/api`)

---

## 🛡️ Core Features
- **Official Ledger & Accounting:** Inflows, outflows, category management, bank accounts, and payment tracking.
- **Executive PDF & Excel Reporting:** Executive-grade statements with KPI cards, zebra-striped tables, auto-aligned currency formats, and multi-page pagination.
- **Customizable Invoicing Studio:** Dynamic logo trimming, flexible dimensions (A4, Letter, Thermal POS Receipt, Custom), and letterhead backgrounds.
- **Stock & Inventory Audit:** Stock tracking, automated valuation, and low stock threshold alerts.
- **Sales & Billing System:** Point of sale ledger with order summaries and customer accounting.
- **Role-Based Access Control:** Superadmin, Admin, and User tier access controls.

---

## 📞 Support & Inquiries
- **Website:** [https://codexplus.site/](https://codexplus.site/)
- **Phone:** +92 325 3315524
- **Email:** [info@codexplus.site](mailto:info@codexplus.site)
