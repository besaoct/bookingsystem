# 🎬 Booking System — Box Office & Ticketing Management Suite

> High-performance, offline-capable Box Office Point-of-Sale (POS), Dynamic Screen & Seat Layout Designer, Thermal Ticket Printing Engine, GST/Tax Compliance Management Suite, and Offline Cryptographic Hardware-Bound Licensing.

[![Author](https://img.shields.io/badge/Author-besaoct-blue.svg)](https://github.com/besaoct)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite WASM](https://img.shields.io/badge/Database-SQL.js%20(WASM)-003B57?logo=sqlite&logoColor=white)](https://sql.js.org/)
[![Electron](https://img.shields.io/badge/Desktop-Electron%2034-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github)](https://github.com/sponsors/besaoct)

---

## 🌟 Overview

**Booking System** is an enterprise-grade ticketing and management platform tailored for single-screen cinemas, multiplex auditoriums, and entertainment venues. Built with **React 18**, **TypeScript**, and an embedded **WASM-powered SQLite database (`sql.js`)**, it delivers sub-millisecond offline response times, complete ACID transactional integrity, seamless hardware integration with thermal receipt printers, and an unforgeable offline cryptographic licensing engine.

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

### 🛡️ 7. Offline Cryptographic Machine Licensing
- **Asymmetric ECDSA (P-256 / SHA-256)**: Public key embedded in client binary; private key kept strictly offline by developer.
- **Hardware Machine ID Binding**: Cryptographically tied to non-volatile host PC hardware (macOS `IOPlatformUUID`, Windows `MachineGuid`/`wmic`, Linux `machine-id`).
- **Pre-Boot Gatekeeper**: Completely locks application views until an authentic `.lic` file matching the computer's Machine ID is verified.
- **Full-Software Licensing**: Single license activates the entire host installation without artificial screen or auditorium limits.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) + Radix UI Primitives + Lucide Icons |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Embedded Database** | [sql.js (SQLite WebAssembly)](https://sql.js.org/) with native IPC disk loading & `localStorage` snapshotting |
| **Desktop Shell** | [Electron 34](https://www.electronjs.org/) + [electron-builder](https://www.electron.build/) |
| **Cryptography Engine** | WebCrypto (SubtleCrypto) ECDSA P-256 + SHA-256 Digital Signatures |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.0.0` or higher
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

```bash
# Run Electron in development mode
npm run electron:dev

# Build distributable installer for offline clients (requires .lic activation)
npm run electron:build:mac      # macOS DMG (Universal: Apple Silicon + Intel)
npm run electron:build:win      # Windows Installer (x64)

# Build for Mac App Store (MAS) (No license file required, purchased via Apple)
npm run electron:build:mas
```

---

## 🔐 Offline Software License Generation (Developer Guide)

The system includes a built-in CLI tool for issuing cryptographically signed software licenses.

### 1. Generating Customer Licenses

Run the `license:generate` CLI script from your terminal:

```bash
# A. 1-Year Subscription License (365 Days)
npm run license:generate -- --machine "BS-8F2A-99B1-4CD0-E7A3" --client "Grand Multiplex" --days 365

# B. Lifetime License (Never Expires)
npm run license:generate -- --machine "BS-8F2A-99B1-4CD0-E7A3" --client "Star Cinemas" --lifetime

# C. Custom Trial License (e.g., 7 Days or 30 Days)
npm run license:generate -- --machine "BS-8F2A-99B1-4CD0-E7A3" --client "Beta Theaters" --trial 7
npm run license:generate -- --machine "BS-8F2A-99B1-4CD0-E7A3" --client "Beta Theaters" --trial --days 30

# D. Developer Master License (Runs on Any PC)
npm run license:generate -- --machine "*" --client "Master Demo" --lifetime
```

### 2. Available CLI Flags

| Flag | Description | Default |
|---|---|---|
| `--machine`, `-m` | Customer's Host PC Machine ID (e.g. `BS-XXXX-XXXX-XXXX-XXXX` or `*` for all PCs) | **Required** |
| `--client`, `-c` | Business / Cinema / Client Name (e.g. `"Grand Multiplex"`) | **Required** |
| `--licensee`, `-u` | Contact Person / Authorized Manager Name | Optional |
| `--days`, `-d` | Number of days license remains valid | `365` |
| `--lifetime`, `-l` | Issues a permanent Lifetime License (`expiresAt: null`) | `false` |
| `--trial [days]` | Issues a Trial License (default: 14 days, or pass custom days) | `false` |
| `--out`, `-o` | Custom output destination path for `.lic` file | `./[Client]_Software_License.lic` |

### 3. Customer Activation Workflow

```
Customer PC                          You (Developer)
────────                         ──────────────
1. Installs app
2. Sees Machine ID  ──────────►  3. You run: npm run license:generate
                                 4. Generates signed [Client].lic file
5. Receives .lic    ◄──────────  5. You send .lic file (or activation key)
6. Loads .lic file
7. Suite Unlocked! (100% Offline)
```

---

## 📦 Dual Build Targets: Licensed vs. App Store

| Target | Build Command | License Requirement | Use Case |
|---|---|---|---|
| **Mac App Store (MAS)** | `npm run electron:build:mas` | **No License Required** | Distributed via Apple App Store with upfront app purchase. |
| **Standalone (No License)**| `npm run electron:build:nolicense`| **No License Required** | Internal demos / direct purchase without machine keys. |
| **macOS (Direct Client)** | `npm run electron:build:mac` | **Hardware `.lic` Required** | Direct client sales, SaaS annual renewals, and offline venues. |
| **Windows (Direct Client)**| `npm run electron:build:win` | **Hardware `.lic` Required** | Direct client sales, SaaS annual renewals, and offline venues. |

---

## 🔑 Default Credentials

The system comes pre-seeded with factory demo accounts:

| Username | Password | Role | Access Level |
|---|---|---|---|
| `sysadmin` | `admin123` | **SYSTEM_ADMIN** | Full System & Configuration Access |
| `operator` | `operator123` | **OPERATOR** | Box Office POS & Ticket Cancellation |

> 💡 **Tip**: You can trigger a factory re-seed at any time via **System Settings → Database Initialization & Factory Re-Seed**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| **`F2`** | Switch to Box Office POS Counter | Application Wide |
| **`F3`** | Switch to Daily Collection Report (DCR) | Application Wide |
| **`F4`** | Switch to Ticket Cancellation Screen | Application Wide |
| **`F9`** | Instant Confirm & Print Ticket Copies | Box Office POS Counter |
| **`Esc`** | Clear Active Seat Selection | Box Office POS Counter |
| **`Cmd / Ctrl + K`** | Global Command Menu & Page Search | Application Wide |
| **`Cmd / Ctrl + Shift + F + P`** | Developer Credentials Quick Access | Login Screen |

---

## 📁 Project Structure

```
bookingsystem/
├── .env.appstore             # Build config for Mac App Store (No-License mode)
├── electron/                 # Electron main and preload processes
│   ├── main.ts               # Window lifecycle, hardware Machine ID query, IPC handlers
│   └── preload.ts            # Safe contextBridge APIs
├── scripts/                  # Developer CLI tools
│   ├── generate-keys.js      # ECDSA P-256 keypair generator (npm run license:keys)
│   ├── generate-license.js   # Customer license generator (npm run license:generate)
│   └── test-license.js       # Automated cryptographic test suite
├── public/                   # Static assets & WASM binaries
│   └── sql-wasm.wasm         # SQLite WebAssembly engine
├── src/
│   ├── components/           # Reusable UI & Business Components
│   │   ├── auth/             # Login, first-time setup, and permission guards
│   │   ├── layout/           # TitleBar, Header, Sidebar, CommandMenu
│   │   ├── license/          # LicenseActivationView (Pre-boot gatekeeper)
│   │   ├── seatmap/          # Interactive visual seat grid
│   │   ├── ticket/           # Thermal ticket preview & printing
│   │   └── ui/               # Radix UI design system primitives & TimePicker
│   ├── db/                   # Database Layer
│   │   ├── seed.ts           # Factory seed data
│   │   └── sqlite-service.ts # SQL.js WASM service & auto-migrations
│   ├── lib/                  # Business Utilities & Cryptography
│   │   ├── license-crypto.ts # WebCrypto ECDSA P-256 verification engine
│   │   ├── tax-calculator.ts # GST & Service Charge calculation algorithms
│   │   ├── thermal-printer.ts# ESC/POS Thermal formatting
│   │   └── utils.ts          # Formatting & styling utilities
│   ├── pages/                # Application Views
│   │   ├── masters/          # Movie, Cinema, ShowTiming, Pricing, Tax & Lookup Masters
│   │   ├── AuditBackupPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── DCRReportPage.tsx
│   │   ├── POSCounterPage.tsx
│   │   ├── SystemSettingsPage.tsx # System preferences & software license card
│   │   ├── TicketCancellationPage.tsx
│   │   └── UsersPermissionsPage.tsx
│   ├── services/             # Domain Services (License, Booking, Movie, Screen, Pricing, etc.)
│   ├── store/                # Zustand State Stores (Auth, Booking, Settings)
│   ├── types/                # Strict TypeScript Type Definitions
│   ├── App.tsx               # Root component & security route guards
│   └── main.tsx              # Application entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 💖 Sponsoring & Support

If you find this project valuable and would like to support its ongoing development, features, and maintenance, you can sponsor through **GitHub Sponsors**:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?style=for-the-badge&logo=github)](https://github.com/sponsors/besaoct)

* **Sponsor Link:** [https://github.com/sponsors/besaoct](https://github.com/sponsors/besaoct)
* For corporate sponsorships, dedicated feature requests, custom cinema POS hardware integrations, and commercial licensing, contact **[besaoct](https://github.com/besaoct)** directly.

---

## 📄 License & Intellectual Property

This project is released under a **Proprietary and Confidential Software License**.

**Copyright (c) 2026 besaoct. All rights reserved.**

No part of this source code may be copied, modified, distributed, or deployed in any form without explicit written permission from the author. For commercial licensing inquiries, contact **[besaoct](https://github.com/besaoct)**.

See [LICENSE](LICENSE) for full legal terms.
