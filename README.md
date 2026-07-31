# Transaction Tracker Monorepo

Repository: [https://github.com/abedalroufahmad-ctrl/joudimount](https://github.com/abedalroufahmad-ctrl/joudimount)

Internal transaction tracking platform for customs operations with role-based access, staged workflows across three modules, MongoDB persistence, and real-time notifications.

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, Mongoose, MongoDB, Socket.IO, optional Firebase Admin (FCM)
- **Auth:** JWT (`Authorization: Bearer <token>`), bcrypt password hashing
- **Web:** React 18 + Vite + TypeScript + React Router
- **Mobile:** Flutter (`apps/app`, package `judi_mount`)

## Repository Layout

- `apps/api` — REST API, auth, role checks, stage transitions, notifications, uploads
- `apps/web` — login, dashboard, CRUD for three modules, storage card, notifications bell
- `apps/app` — Flutter client (dashboard, imports/transfers/exports, clients, shipping, staff, profile)
- `docs/NOTIFICATIONS.md` — notification and FCM setup
- `seed-test-data.sh` — bulk seed clients + transactions
- `seed-shipping-linked-data.sh` — seed shipping companies + linked transactions

## Roles

| Role | Summary |
|------|---------|
| `manager` | Full access: all modules, clients, shipping companies, employees, pay/release, storage |
| `employee` | Create/update/delete records on all modules; **Preparation** and **Customs clearance** stages; preparation-stage fields on `PUT`; original BL action (imports); cannot pay, release, or change `paymentStatus` |
| `employee2` | Read all modules; change stage (`POST .../stage`); **Transportation** and **Storage** stages; transportation fields on `PUT`, warehouse fields at **Storage**; attachment upload on `PUT` only at **Transportation**; cannot create/delete or change `paymentStatus` |
| `warehouse` | Read imports/transfers/exports; **Storage** stage only; edit warehouse/storage fields via storage card and stage-scoped `PUT`; no create/delete, pay/release, or `paymentStatus` |
| `accountant` | Read all modules; pay and release; `PUT` may **only** set `paymentStatus`; storage card is read-only |

Default accounts (auto-seeded on API startup, password `123456`):

- `manager@tracker.local`
- `employee@tracker.local`
- `employee2@tracker.local`
- `warehouse@tracker.local`
- `accountant@tracker.local`

## Modules & Stages

Three operational modules share the same record schema:

- **Imports** — `/api/transactions`, web `/transactions`
- **Transfers** — `/api/transfers`, web `/transfers`
- **Exports** — `/api/exports`, web `/exports`

Stage workflow:

1. `PREPARATION`
2. `CUSTOMS_CLEARANCE`
3. `TRANSPORTATION`
4. `STORAGE` (imports and transfers only; exports cannot advance to Storage)

Other behavior:

- Preparation completeness is validated before moving from `PREPARATION` to `CUSTOMS_CLEARANCE`
- Setting `documentArrivalDate` can auto-advance toward customs clearance
- Risk level and channel are derived from invoice value, HS code, and origin country (1–4 character code, normalized to uppercase on save)
- Pay/release endpoints enforce payment and document-status rules
- **Storage card** — dedicated UI for warehouse entry/exit/seal fields at Storage stage (imports & transfers)
- Create/update payloads require **`isStopped`**; if stopped, **`stopReason`** is required before advancing to customs clearance
- **Form validation UX** — on web and mobile, required fields left blank on save are highlighted in red; stage-change `missing_fields` API errors highlight the corresponding inputs on web

## Core Features

- Unified list/detail/form UX for imports, transfers, and exports (web + mobile)
- Clients and shipping companies (list + detail routes)
- Staff directory and employee CRUD (manager)
- Self-service profile: `GET/PUT /api/auth/me` (mobile profile tab; API only on web today)
- Document attachments (images/PDF) with categories; served under `/uploads`
- Real-time notifications (Socket.IO on web; REST polling on mobile) — see `docs/NOTIFICATIONS.md`
- Arabic/English localization (web and app)
- Padded field-card layout on transaction details and edit forms (web)
- Web production bundle uses lazy routes and vendor chunk splitting (`vite.config.ts`)
- JOUDI branding on Flutter splash (Android) and web loading screen

**Accounting card:** Dedicated page per record for manager and accountant (`GET/PUT /api/{module}/:id/accounting`) with payment-related fixed fields plus custom titled amount rows.

## API Endpoints (summary)

- `GET /health`
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET/PUT /api/auth/me`
- Employees: `GET/POST /api/employees`, `PUT/DELETE /api/employees/:id`
- Clients: `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/:id`
- Shipping: `GET/POST /api/shipping-companies`, `GET/PUT/DELETE /api/shipping-companies/:id`
- Notifications: `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST .../read`, `POST .../read-all`, `POST .../clear`
- FCM devices: `POST/DELETE /api/devices/fcm`
- Per module (`transactions`, `transfers`, `exports`):
  - `GET/POST` list/create
  - `GET/PUT/DELETE /:id`
  - `POST /:id/stage`
  - `POST /:id/pay` (manager, accountant)
  - `POST /:id/release` (manager, accountant)
- Imports only: `POST /api/transactions/:id/original-bl` (manager, employee)

## Run Locally

```bash
npm install
```

Start API:

```bash
npm run dev:api
```

Start web:

```bash
npm run dev:web
```

Production build (API + web):

```bash
npm run build
```

Default URLs: API `http://localhost:4000`, web `http://localhost:5173`.

Default Mongo URI:

```bash
mongodb://127.0.0.1:27017/customs_broker_track
```

Override env example:

```bash
MONGO_URI="mongodb://127.0.0.1:27017/customs_broker_track" JWT_SECRET="change-me" npm run dev:api
```

## Seed Data

```bash
./seed-test-data.sh
./seed-shipping-linked-data.sh
```

## Flutter

From `apps/app`:

```bash
flutter pub get
flutter run
```

Configure reachable API host:

```bash
flutter run --dart-define=API_BASE=http://<your-lan-ip>:4000
```

Android emulator alias: `http://10.0.2.2:4000`.

See `apps/app/README.md` for mobile feature details.
