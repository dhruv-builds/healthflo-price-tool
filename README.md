<p align="center">
  <img src="docs/banner.png" alt="HealthFlo Banner" width="100%" />
</p>

<h1 align="center">🏥 HealthFlo</h1>
<p align="center"><strong>Enterprise Pricing & CRM Platform for Healthcare Growth Teams</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/shadcn/ui-Components-000000?logo=shadcnui&logoColor=white" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/Status-V1_(Cloud--synced)-brightgreen" alt="Status" />
</p>

---

## 📌 Overview

HealthFlo is an internal enterprise platform built for founder and growth teams in healthcare. It combines **multi-tier pricing modeling** with a lightweight **CRM** to manage hospital, clinic, and doctor relationships — all in one place.

---

## ✨ Features

### 💰 Pricing Tool

| Feature | Description |
|---|---|
| **Multi-Tier Discount Modeling** | Automatically calculates pricing across 6 discount tiers (0–50%) with configurable base price, overage rates, and included visits |
| **INR / USD Currency Support** | Toggle between currencies with live FX rates (API-sourced or manual override) |
| **Overage Analysis** | Visual breakdown of overage costs when actual visits exceed included volume |
| **Unit Economics** | Admin-only margin analysis showing cost, revenue, profit, and margin % per tier |
| **Implementation Cost Modeling** | First-hospital and per-additional-hospital implementation pricing |
| **Excel Export** | One-click export of the full pricing model to `.xlsx` via SheetJS |
| **Client & Version Management** | Save, load, and iterate on pricing versions per client |
| **Presentation Mode** | Admin toggle to hide sensitive unit economics when screen-sharing |
| **Template System** | Pre-built templates (e.g., Jeena Seekho, India General) for quick setup |

### 🏢 CRM Module

| Feature | Description |
|---|---|
| **Account Management** | Track Hospitals, Clinics, and Doctors with status, source, geography, and ownership |
| **Contacts** | Store contacts per account with title, seniority, LinkedIn, phone, and email |
| **Opportunities** | Pipeline management with 8 stages from Prospecting → Won/Lost, expected value, and close dates |
| **Activity Timeline** | Log Meetings, Calls, Demos, Emails, and Notes with file/link attachments |
| **Tasks** | Assignable tasks with priority (Low/Medium/High), status tracking, and due dates |
| **Documents & Links** | Attach files and URLs at the account level for proposals, contracts, and references |
| **Pricing Linkage** | Link CRM accounts to pricing clients for seamless cross-module navigation |
| **Reports** | Lightweight reporting dashboard with pipeline and activity analytics |

### 🔐 Auth & Security

| Feature | Description |
|---|---|
| **Email/Password + Google OAuth** | Dual sign-in methods with email verification |
| **Admin Approval Gating** | New users must be approved by an admin before accessing the platform |
| **Role-Based Access** | `admin` and `employee` roles stored in a dedicated `user_roles` table |
| **Row-Level Security** | RLS policies on all database tables enforced via `has_role()` security-definer function |
| **User Management** | Admin panel to approve users and manage roles |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS 3 + shadcn/ui |
| **Routing** | react-router-dom v6 |
| **State / Data** | TanStack React Query v5 |
| **Backend** | Supabase (Auth, Postgres, Storage, Edge Functions) |
| **Charts** | Recharts |
| **Excel Export** | SheetJS (xlsx) |
| **Forms** | React Hook Form + Zod validation |

---

## 📁 Project Structure

| Directory | Purpose |
|---|---|
| `src/pages/` | Route-level page components (Auth, Index/Pricing, CRM pages, Admin) |
| `src/components/pricing/` | Pricing module UI — toolbar, sidebar, summary tables, overage & unit economics |
| `src/components/crm/` | CRM module UI — accounts, contacts, opportunities, activities, tasks, documents |
| `src/components/ui/` | shadcn/ui primitives (button, dialog, table, form, etc.) |
| `src/hooks/` | Data-fetching hooks (useClients, useCrmAccounts, useCrmContacts, etc.) |
| `src/contexts/` | AuthContext for session, role, and approval state |
| `src/types/` | TypeScript types for Pricing and CRM domains |
| `src/utils/` | Calculation engine, formatting, Excel export, template defaults |
| `src/integrations/` | Supabase client, auto-generated types, Lovable Cloud auth |
| `supabase/` | Database migrations and config |

---

<details>
<summary>🚀 <strong>Installation</strong></summary>

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm or bun

### Steps

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>

# 2. Navigate to the project
cd <YOUR_PROJECT_NAME>

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

</details>

<details>
<summary>⚙️ <strong>Development</strong></summary>

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview production build |

### Environment Variables

The project uses Lovable Cloud, which auto-configures the `.env` file with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

> ⚠️ Do not manually edit `.env`, `supabase/config.toml`, or auto-generated integration files.

</details>

---

## 🎬 Demo

<p align="center">
  <img src="docs/demo.gif" alt="Demo Walkthrough" width="80%" />
</p>

---

## 📚 Documentation

In-repo documentation is the source of truth for how HealthFlo is built.

| File | Covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System overview, modules, routing, integrations |
| [docs/DATABASE.md](docs/DATABASE.md) | Tables, enums, RLS, storage buckets |
| [docs/AUTH.md](docs/AUTH.md) | Roles, approval gating, permissions matrix |
| [docs/UX_FLOWS.md](docs/UX_FLOWS.md) | Pricing flow, CRM flows, presentation mode |
| [docs/TECH_DEBT.md](docs/TECH_DEBT.md) | Known gaps, risks, future cleanup |
| [CHANGELOG.md](CHANGELOG.md) | Chronological log of major updates and decisions |

### Maintenance rule

When making a **major update** (new feature/route, schema change, auth change, new integration, branding change, or breaking change to a shared component), you **must**:

1. Update the relevant `/docs/*.md` file(s).
2. Add a `CHANGELOG.md` entry that includes a **Decisions** section explaining *why*.

See [`docs/README.md`](docs/README.md) for the full rule and what counts as "major".

---

## 📄 License

This is a private internal tool. All rights reserved.

---


