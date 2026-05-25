# Project Specification: Transaction Tracker (UAE Customs Context)

This document is synchronized with the repository's current implementation.

---

## 1. Project Overview

**Name:** Transaction Tracker (monorepo)

**Objective:**  
Provide an internal customs workflow system with role-based access, authentication, staged processing, document uploads, warehouse storage tracking, notifications, and payment/release controls across three operational modules:

- Imports (transactions)
- Transfers
- Exports

**Out of scope (current code):**

- Real external customs platform integration (e.g. Mirsal 2)
- Public customer portal
- Full BI/reporting pipeline
- Automated duty/tariff calculation

---

## 2. Repository Layout

| Path | Purpose |
|------|---------|
| `apps/api` | Express + TypeScript REST API, MongoDB/Mongoose, Socket.IO, optional FCM |
| `apps/web` | React 18 + Vite + TypeScript web app |
| `apps/app` | Flutter mobile app (`judi_mount`) |
| `docs/NOTIFICATIONS.md` | Notification and Firebase setup guide |
| `seed-test-data.sh` | Seeds many clients/transactions directly via `mongosh` |
| `seed-shipping-linked-data.sh` | Seeds shipping companies and linked transactions |
| `package.json` | Root npm workspaces (`apps/api`, `apps/web`) |

---

## 3. Technical Stack

| Layer | Technology |
|-------|------------|
| API | Node.js, Express, TypeScript |
| Database | MongoDB with Mongoose |
| Auth | JWT (`Authorization: Bearer <token>`), bcrypt password hashing |
| Real-time | Socket.IO (web notifications) |
| Push (optional) | Firebase Admin SDK on API |
| Validation | Zod (request payload validation) |
| Web | React, React Router, Vite, TypeScript |
| Mobile | Flutter, `http`, `shared_preferences`, localization |

**Environment variables**

- `MONGO_URI` (default: `mongodb://127.0.0.1:27017/customs_broker_track`)
- `JWT_SECRET`
- `PORT` (default: `4000`)
- `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON` (optional, for FCM)

**Uploads**

- Uploaded documents are stored under `uploads/` in the API working directory.
- Files are served from `GET /uploads/...`.

---

## 4. Data Model

### 4.1 Employees (`employees`)

Fields:

- `name`
- `email` (unique)
- `password` (bcrypt hash)
- `role`: `manager` | `employee` | `employee2` | `accountant`

Seeded defaults on API startup (upsert), password `123456`:

- `manager@tracker.local`
- `employee@tracker.local`
- `employee2@tracker.local`
- `accountant@tracker.local`

### 4.2 Operational records (`transactions`, `transfers`, `exports`)

All three collections share the same schema model (same business fields).

Core fields:

- Client/shipping identity: `clientName`, optional `clientId`, `shippingCompanyName`, optional `shippingCompanyId`
- Declaration fields: `declarationNumber` (unique), `declarationNumber2`, `declarationDate`, `orderDate`, declaration metadata
- Shipment fields: `airwayBill`, `hsCode`, `goodsDescription`, `invoiceValue`, `invoiceCurrency`, `originCountry`
- Workflow fields: `documentStatus`, `clearanceStatus`, `riskLevel`, `channel`, `paymentStatus`, `xrayResult`, `releaseCode`
- Stage: `transactionStage` (`PREPARATION`, `CUSTOMS_CLEARANCE`, `TRANSPORTATION`, `STORAGE`)
- Attachments: `documentAttachments[]` with `path`, `originalName`, optional category
- Logistics + goods fields: container/unit/quantity/quality/weight and related optional values
- Transportation fields: `transportationTo`, `trachNo`, `transportationCompany`, charges, etc.
- Storage / warehouse fields: `storageSubStage`, entry/exit/seal sub-records (`storageInput*`, `storageExit*`, `storageSeal*`, legacy flat `storage*` fields)
- Flags/reasons: `isStopped`, `stopReason`, `holdReason`, `documentPostalNumber`
- Timestamps: `createdAt`, `updatedAt`

Declaration prefixes by module (atomic counters in `counters` collection):

- Imports: `DXB-2026-######`
- Transfers: `TRF-2026-######`
- Exports: `EXP-2026-######`

**Exports and Storage:** Export records use the same schema but the API rejects advancing exports to the `STORAGE` stage. Storage card UI is only offered for imports and transfers at Storage.

### 4.3 Clients (`clients`)

Fields: `companyName`, `trn` (unique), optional `immigrationCode`, `email`, `country`, `creditLimit`, `status` (`active`/`suspended`).

### 4.4 Shipping companies (`shippingcompanies`)

Fields: `companyName`, `code` (unique), optional contact fields, optional `dispatchFormTemplate`, optional paired `latitude`/`longitude`, and `status` (`active`/`inactive`).

### 4.5 Notifications (`notifications`)

Persisted in-app notifications with recipient, actor, action, entity reference, read state, and timestamps. Emitted over Socket.IO to connected web clients; optional FCM push to registered device tokens.

---

## 5. Business Logic

### 5.1 Risk and channel

- `invoiceValue > 500000` => high
- `hsCode` starts with `30` or `93` => high
- `originCountry` in `IR`, `SY`, `KP` => high
- else if `invoiceValue > 100000` => medium
- else => low

Channel mapping: low => green, medium => yellow, high => red.

### 5.2 Payment and release

- Pay endpoint sets `paymentStatus = paid` and `clearanceStatus = PAID`.
- Release is allowed only when paid and document status is `original_received` or `telex_release`.
- Successful release sets `releaseCode` and `clearanceStatus = E_RELEASE_ISSUED`.

### 5.3 Stage behavior

- Stages: `PREPARATION` → `CUSTOMS_CLEARANCE` → `TRANSPORTATION` → `STORAGE`.
- Stage endpoint exists per module (`POST .../:id/stage`) for manager and employee2.
- Moving from `PREPARATION` to `CUSTOMS_CLEARANCE` is blocked until preparation-required fields are complete.
- `documentArrivalDate` can auto-advance stage from `PREPARATION` toward `CUSTOMS_CLEARANCE`.
- Stage-locked field protection is enforced on `PUT` based on role and current stage.
- At **Storage** (imports/transfers), employee2 may only update warehouse fields defined in `STORAGE_STAGE_EDITABLE_FIELDS` (`store.ts`).

### 5.4 Validation and attachments

- Create/update payloads are validated with Zod (`transactionSchemas.ts`).
- `isStopped` is required on create and update schemas.
- Multipart upload requires a category entry per uploaded file.
- Attachments support merge/retain/remove flows on edit; orphan files are cleaned up.
- Employee2 may upload new attachments on `PUT` only while the record is at **Transportation** stage.

### 5.5 Storage card

Dedicated UI (web `TransactionStoragePage`, Flutter `transaction_storage_page.dart`) for warehouse data at Storage stage:

- Sub-sections: Input (entry), Exit, Seal
- Editable by manager, employee, and employee2 (when stage rules allow); read-only for accountant
- Linked from list, details, and edit screens when `transactionStage === "STORAGE"` (imports/transfers)

### 5.6 Notifications

- Published on create/update/delete across modules, clients, employees, shipping companies, etc.
- **Manager** receives notifications for actions by other users.
- **Employees and accountant** receive notifications when another user changes project data (not their own actions).
- Web: Socket.IO + bell UI (`NotificationBell`, `useNotifications`).
- Mobile: REST polling every 30 seconds; optional FCM after Firebase setup (see `docs/NOTIFICATIONS.md`).

### 5.7 Accounting card

- `GET/PUT /api/{transactions|transfers|exports}/:id/accounting` (manager and accountant only).
- Fixed fields: invoice value/currency, trip/waiting/maccrik charges, payment status, storage wages and loading fares.
- Custom fields: user-defined title + value rows stored in `accountingCustomFields`.
- Web and Flutter accounting pages; list column/button for manager and accountant.

---

## 6. Authentication & Authorization

### 6.1 Auth endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/login` | Returns JWT + user profile |
| POST | `/api/auth/logout` | Client-side token clear |
| GET | `/api/auth/me` | Current user profile |
| PUT | `/api/auth/me` | Update own name/email/password; returns new token |

### 6.2 Role summary

| Role | Access |
|------|--------|
| `manager` | Full CRUD and management across modules, staff, clients, shipping companies, pay/release, storage |
| `employee` | Create/read/update/delete (per module rules); original BL on imports; edit only during **Preparation** and **Customs clearance** with stage-1 field set; no pay/release/`paymentStatus` |
| `employee2` | Read; stage changes; edit during **Transportation** and **Storage** with stage-2 or warehouse field sets; attachment upload on `PUT` at Transportation only; no create/delete/`paymentStatus` |
| `accountant` | Read; pay/release; `PUT` limited to `paymentStatus`; storage read-only |

Stage-scoped edit windows are enforced in `server.ts` (`validateRoleFieldUpdates`) and mirrored on the web client (`stageRolePermissions.ts`, `transactionFieldPermissions.ts`).

---

## 7. REST API (Implemented)

### 7.1 Core

- `GET /health`
- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` (GET/PUT)
- Employees: `/api/employees`, `/api/employees/:id`
- Clients: `/api/clients`, `/api/clients/:id`
- Shipping companies: `/api/shipping-companies`, `/api/shipping-companies/:id`
- Notifications: `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/:id/read`, `/api/notifications/read-all`, `/api/notifications/clear`
- FCM: `POST/DELETE /api/devices/fcm`

### 7.2 Imports module (`/api/transactions`)

- `GET/POST /api/transactions` (optional `?clientId=`, pagination params)
- `GET/PUT/DELETE /api/transactions/:id`
- `POST /api/transactions/:id/stage`
- `POST /api/transactions/:id/original-bl`
- `POST /api/transactions/:id/pay`
- `POST /api/transactions/:id/release`

### 7.3 Transfers module (`/api/transfers`)

- Same CRUD + stage/pay/release as imports (no `original-bl`)

### 7.4 Exports module (`/api/exports`)

- Same CRUD + stage/pay/release as imports (no `original-bl`; cannot set stage to `STORAGE`)

---

## 8. Web App (`apps/web`)

Authenticated React SPA with:

- **Dashboard** (`/`) — module cards, recent activity, sidebar navigation
- Unified list/detail/form for imports, transfers, exports
- Route groups: `/`, `/transactions/*`, `/transfers/*`, `/exports/*`
- **Storage card** routes: `/transactions/:id/storage`, `/transfers/:id/storage`
- Employee, client, and shipping-company management + detail pages
- Search, status/stage filters, pagination on lists
- **Notification bell** in top bar (Socket.IO)
- JWT in `localStorage`; shared `apiFetch` helper
- Arabic/English i18n
- Attachment upload/category support in forms
- Padded field-card layout on details and edit forms (`DetailField`, `form-field-box`)

Default API base in `apps/web/src/types.ts`: `http://localhost:4000`.

**Not on web today:** self-service profile UI (`/api/auth/me` exists on API).

---

## 9. Mobile App (`apps/app`)

Flutter app includes:

- Auth with remember-me (`SharedPreferences`)
- **Dashboard** tab with shortcuts, search, recent imports, notifications entry
- Tabs: home, imports, transfers, exports, clients, shipping, employees, profile
- Transaction list/detail/form per module; **storage card** at Storage stage
- **Profile** tab — update name, email, password via `/api/auth/me`
- **Notifications** — polling service + in-app sheet
- Arabic/English localization
- API host via `API_BASE` dart define with runtime fallback in `api.dart`
- Map picker for shipping coordinates

Package: `judi_mount`. Android ID: `com.example.judi_mount`.

**Optional:** FCM push (see `docs/NOTIFICATIONS.md`).

---

## 10. Data Seeding

- `seed-test-data.sh` — large test dataset for clients/transactions.
- `seed-shipping-linked-data.sh` — shipping companies and linked transaction data.

---

## 11. Local Run

```bash
npm install
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:5173
```

Production build:

```bash
npm run build
```

Flutter (from `apps/app`):

```bash
flutter pub get
flutter run --dart-define=API_BASE=http://localhost:4000
```

---

## 12. Summary

The repository implements a role-based customs operations tracker across web and mobile clients, backed by a shared Express/Mongo API. It covers imports, transfers, and exports with staged workflows, warehouse storage tracking, accounting cards, document attachments, real-time notifications, and payment/release controls.
