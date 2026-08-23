# Himalayan ERP

## Project Overview
Himalayan ERP is a comprehensive, full-stack Enterprise Resource Planning application tailor-made to handle the operational requirements of businesses. The system boasts an intuitive web-based frontend and a robust Node.js backend. It features multi-level role-based access control (RBAC), encompassing standard users and a SuperAdmin role. 

This repository ("Code") is structured as a monorepo containing both the `frontend` and `backend` codebases.

## System Architecture

The application adopts a decoupled architecture:
1. **Frontend**: A React.js Single Page Application (SPA) built with Vite, styled with Tailwind CSS, providing a modern and responsive user experience.
2. **Backend**: An Express.js REST API with a MySQL database managing persistent data, utilizing JSON Web Tokens (JWT) for secure authentication.

---

## 🎨 Frontend (Client-side)
Located under the `frontend` directory.

### Tech Stack
- **Framework:** React 18 with Vite for rapid development and optimized builds.
- **Styling:** Tailwind CSS integrated via PostCSS for utility-first styling.
- **Routing:** React Router v6 mapping screens and guarding routes based on authentication.
- **PDF Generation:** `jspdf` and `jspdf-autotable` for exporting bills, ledgers, and reports on the fly.
- **State & HTTP:** React Context API (`AuthContext`), utilizing `axios` for backend communication. `react-hot-toast` for application-wide push notifications.

### Modules & Capabilities
1. **Authentication:**
   - Secure Login page with JWT caching.
   - Route guarding blocking unauthorized access (`ProtectedRoute`, `SuperAdminRoute`).
2. **Dashboards (`/dashboard`, `/superadmin`):**
   - General overview of business metrics.
   - SuperAdmin dashboard for managing the overall ERP state.
3. **Billing System (`/billing`):**
   - Point of Sale (POS) and invoicing capabilities. Lets users generate invoices to buyers, heavily backed by `jspdf` for printing.
4. **Inventory Management (`/inventory`):**
   - Adding, querying, and updating inventory items.
5. **Ledger (`/ledger`):**
   - Comprehensive accounting ledger tracking transactions, credits, debits, and balance statements.
6. **Purchases (`/purchases`):**
   - Recording incoming stock, purchase orders, and supplier receipts.
7. **Due Payments (`/due-payments`):**
   - Tracking outstanding balances from customers and managing installment/due amounts.
8. **Settings (`/settings`):**
   - User profile and business configurations.

---

## ⚙️ Backend (Server-side)
Located under the `backend` directory.

### Tech Stack
- **Environment:** Node.js.
- **Framework:** Express.js for REST endpoints.
- **Database:** MySQL relational database accessed via `mysql2`.
- **Security & Validation:** `bcryptjs` (password hashing), `jsonwebtoken` (session handling), `helmet`, `cors`, and `express-validator`.
- **File Management:** `multer` setup for handling potential user uploads.
- **Logging:** `morgan` alongside custom error and crash logs.

### Directory Structure & Controllers
- **`src/models/`**: Defines the data interaction layer wrapping raw SQL queries mapping to entities like `userModel`, `invoiceModel`, `itemModel`, `purchaseModel`, and `duePaymentModel`.
- **`src/routes/` & `src/controllers/`**: 
  - `authRoutes`: Login endpoint and token generation.
  - `invoiceRoutes`: Generating & fetching bills.
  - `itemRoutes`: Getting item list, adding/editing items (Inventory core).
  - `ledgerRoutes`: Statement compilation.
  - `masterRoutes` & `reportRoutes`: Core configuration and aggregations.
  - `purchaseRoutes` & `duePaymentRoutes`: Managing accounts payables and receivables.
  - `superAdminRoutes`: Elevated endpoints for system oversight.
- **`src/middlewares/`**: Validation layers, checking authorization token presence and user role clearance (SuperAdmin vs normal users).

### System Utilities
The backend directory includes diverse maintenance and fixing Node.js scripts executed outside the runtime:
- Database diagnostics and migration fixes (`fix-db.js`, `fix-invoices-cols.js`, `check-cols.js`).
- Scripts for fixing or resetting specific business logics (`reset-admin.js`, `force-multi.js`).

---

## Key Features
1. **A-Z Accounting Flow:** Starting from stocking inventory (Purchases) -> Processing Sales (Billing/Invoicing) -> Recording Payments and tracking debts (Due Payments) -> Standardizing general records (Ledger).
2. **Access Control Layer:** Clear hierarchy restricting what a staff/manager can do vs highly sensitive actions available to SuperAdmin.
3. **Data Integrity tools:** Custom-built Node.js diagnostic scripts to correct malformed database records efficiently.
4. **Immediate Report Generation:** Offloading PDF and text document generation to the client browser.
5. **Secure Authentication:** Using BCrypt encoded passwords mapped to short-lived JSON Web Tokens for API authorization.

---
**Maintained by:** Himalayan Software Solutions
