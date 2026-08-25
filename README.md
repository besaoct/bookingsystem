# 🎬 Booking System — Box Office & Ticketing Management Suite

> High-performance, offline-capable Box Office Point-of-Sale (POS), Dynamic Screen & Seat Layout Designer, Thermal Ticket Printing Engine, and GST/Tax Compliance Management Suite.

[![Author](https://img.shields.io/badge/Author-besaoct-blue.svg)](https://github.com/besaoct)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite WASM](https://img.shields.io/badge/Database-SQL.js%20(WASM)-003B57?logo=sqlite&logoColor=white)](https://sql.js.org/)
[![Electron](https://img.shields.io/badge/Desktop-Electron%2034-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)

---

## 🌟 Overview

**Booking System** is an enterprise-grade ticketing and management platform tailored for single-screen cinemas, multiplex auditoriums, and entertainment venues. Built with **React 18**, **TypeScript**, and an embedded **WASM-powered SQLite database (`sql.js`)**, it delivers sub-millisecond offline response times, complete ACID transactional integrity, and seamless hardware integration with thermal receipt printers.

---

## ✨ Key Features

### 🎟️ 1. Box Office Point of Sale (POS)
- **Real-Time Interactive Seat Map**: Dynamic SVG/Canvas grid rendering custom row architectures, aisles, wheelchair spots, and seat classifications.
- **Instant Tax & S.CH Computation**: Real-time breakdown of Admission Net (ADM), Service Charges (S.CH), CGST, SGST, Cess, and Total Gross.
- **Fast-Paced Counter Workflow**: One-click seat allocation, multi-payment support (Cash, UPI / QR, Credit/Debit Cards, Online Partners), and **`F9` hotkey instant thermal printing**.
- **Per-Show Overrides & Class Fallbacks**: Real-time pricing lookup prioritizing custom show-rate rules with global seat class fallbacks.

### 🖨️ 2. ESC/POS & Thermal Ticket Printing Engine
- **Configurable Simultaneous Copies**: Print Office (`[O]`), Security (`[S]`), and Customer (`[C]`) tickets in single-run queued sequences.
- **Standard 10.2 cm × 3.5 cm Receipt Dimension**: Pre-formatted layout featuring dynamic header titles, SAC codes (997321), cinema GSTIN/CIN, ticket serials, transaction hash, and timestamp.
- **Thermal Hardware Support**: Direct integration with standard 80mm POS thermal printers (Citizen, Epson, TVS-E, POS-80).

### 🪑 3. Dynamic Screen & Seat Layout Designer
- **Visual Auditorium Builder**: Add and arrange custom rows (A, B, C...) with variable seat counts, aisle gaps, blocked seats, and wheelchair accessibility.
- **Seat Class & Palette Master**: Assign individual classes (`Gold Plus`, `Gold`, `Platinum`, `Silver`, `Recliner`, `Balcony`) with custom hex color identifiers and display orders.
- **Zoom & Pan Controls**: Multi-level zoom controls with scale reset for auditorium configurations.

### 💰 4. Dynamic Pricing & Tax (GST) Masters
- **Multi-Tier Pricing Engine**: Base pricing rules per seat class + custom rate overrides per movie showtime.
- **Flexible Tax Calculation Modes**: Support for **Inclusive** (Gross encompasses taxes) and **Exclusive** (Taxes added atop base rate) tax methodologies.
- **Rounding Rules**: Configurable Normal (`Math.round`), Floor, or Ceiling rounding logic.

### 📊 5. Daily Collection Report (DCR) & Audit Trail
- **Class-wise & Show-wise DCR**: Auto-aggregates opening/closing ticket sequences, gross intake, GST breakup, and statutory summary with computer-generated report certification.
- **Export & Print**: Instant print view and CSV export for daily box-office reconciliation.
- **Complete Audit Trail**: Immutable logging of all user activities (logins, bookings, cancellations, role modifications).

### 🔐 6. Role-Based Access Control (RBAC) & Security
- **Granular Permissions Matrix**: Module-level rights (`can_read`, `can_create`, `can_update`, `can_delete`) across 8 security domains.
- **Built-in Security Roles**: `SYSTEM_ADMIN` (full control) and `OPERATOR` (box office counter operations).
- **Hardened SQLite Engine**: Strictly parameterized SQL statements to eliminate injection vulnerabilities.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) + Radix UI Primitives + Lucide Icons |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Embedded Database** | [sql.js (SQLite WebAssembly)](https://sql.js.org/) with `localStorage` snapshotting |
| **Desktop Shell** | [Electron 34](https://www.electronjs.org/) + [electron-builder](https://www.electron.build/) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/besaoct/bookingsystem.git
   cd bookingsystem
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🖥️ Running as Desktop Application (Electron)

To launch the system as a native desktop application with full hardware printer access:

```bash
# Run Electron in development mode
npm run electron:dev

# Build distributable installer for your OS (macOS, Windows, Linux)
npm run electron:build
```

---

## 🔑 Default Credentials

The system comes pre-seeded with factory demo accounts:

| Username | Password | Role | Access Level |
|---|---|---|---|
| `sysadmin` | `admin123` | **SYSTEM_ADMIN** | Full System & Configuration Access |
| `operator` | `operator123` | **OPERATOR** | Box Office POS & Ticket Cancellation |

> 💡 **Tip**: You can trigger a factory re-seed at any time via **Audit & Backup → Run Database Re-Seed**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| **`F9`** | Instant Confirm & Print Ticket Copies | Box Office POS Counter |
| **`Esc`** | Clear Active Seat Selection | Box Office POS Counter |
| **`Cmd / Ctrl + K`** | Global Command Menu & Page Search | Application Wide |
| **`Cmd / Ctrl + Shift + F + P`** | Developer Credentials Quick Access | Login Screen |

---

## 📁 Project Structure

```
bookingsystem/
├── electron/                 # Electron main and preload processes
│   ├── main.ts
│   └── preload.ts
├── public/                   # Static assets & WASM binaries
│   └── sql-wasm.wasm         # SQLite WebAssembly engine
├── src/
│   ├── components/           # Reusable UI & Business Components
│   │   ├── auth/             # Login and user modals
│   │   ├── layout/           # Header, Sidebar, CommandMenu
│   │   ├── seatmap/          # Interactive visual seat grid
│   │   ├── ticket/           # Thermal ticket preview & printing
│   │   └── ui/               # Radix UI design system primitives
│   ├── db/                   # Database Layer
│   │   ├── schema.sql        # Full DDL SQLite schema
│   │   ├── seed.ts           # Factory seed data
│   │   └── sqlite-service.ts # SQL.js WASM service & auto-migrations
│   ├── lib/                  # Business Utilities & Tax Engines
│   │   ├── tax-calculator.ts # GST & Service Charge calculation algorithms
│   │   ├── thermal-printer.ts# ESC/POS Thermal formatting
│   │   └── utils.ts          # Formatting & styling utilities
│   ├── pages/                # Application Views
│   │   ├── masters/          # Movie, Screen, Timing, Pricing, Tax & Lookup Masters
│   │   ├── AuditBackupPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── DCRReportPage.tsx
│   │   ├── POSCounterPage.tsx
│   │   ├── SystemSettingsPage.tsx
│   │   ├── TicketCancellationPage.tsx
│   │   └── UsersPermissionsPage.tsx
│   ├── services/             # Domain Services (Booking, Movie, Screen, Pricing, etc.)
│   ├── store/                # Zustand State Stores (Auth, Booking, Settings)
│   ├── types/                # Strict TypeScript Type Definitions
│   ├── App.tsx               # Root component & security route guards
│   └── main.tsx              # Application entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📄 License & Intellectual Property

This project is released under a **Proprietary and Confidential Software License**.

**Copyright (c) 2026 besaoct. All rights reserved.**

No part of this source code may be copied, modified, distributed, or deployed in any form without explicit written permission from the author. For commercial licensing inquiries, contact **[besaoct](https://github.com/besaoct)**.

See [LICENSE](LICENSE) for full legal terms.
