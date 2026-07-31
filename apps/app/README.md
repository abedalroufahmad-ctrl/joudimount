# Transaction Tracker Flutter App

Flutter client for the Transaction Tracker monorepo.

**Package name:** `judi_mount` (see `pubspec.yaml`).  
**Android application ID:** `com.example.judi_mount`.

## What this app includes

- Login with JWT-backed API session (token in `SharedPreferences`, optional remember-me); blank email/password highlighted red on submit
- **Home dashboard** — search, module shortcuts, recent imports, notification entry (`warehouse` role: storage-focused shortcuts, no clients/shipping tabs)
- **Imports, transfers, exports** — list, detail, create/edit form (multipart uploads where allowed)
- **Storage card** — warehouse entry/exit/seal fields at Storage stage (imports & transfers)
- Stage and field permissions aligned with web/API (`transaction_field_permissions.dart`)
- **Origin country** — text input, max 4 characters, uppercase on entry (matches web)
- **Form validation** — required fields left empty on save show red borders; document upload categories validated before multipart save
- Document attachments (grouped by category)
- **Clients** and **shipping companies** (list + detail; hidden for `warehouse` role)
- **Employees** screen (manager: CRUD with role description cards; required name/email/password validation)
- **Profile** tab — `GET/PUT /api/auth/me` (name, email, password) with required-field highlighting
- **Notifications** — in-app list with 30-second REST polling (`NotificationService`)
- Arabic/English localization
- Map picker for shipping company coordinates (`flutter_map`)

**Accounting card:** `TransactionAccountingPage` for manager and accountant (list icon + detail link). Uses `GET/PUT /api/{module}/:id/accounting`.

**FCM push:** Optional; requires Firebase setup (see repo `docs/NOTIFICATIONS.md`). Until then, notifications arrive via polling.

**Branding:** JOUDI logo on Android splash (`android/app/src/main/res/drawable/splash_logo.png`) and web `index.html` loading splash.

## Roles (summary)

| Role | Mobile behavior |
|------|-----------------|
| `manager` | Full tabs and CRUD |
| `employee` | Preparation + customs clearance editing |
| `employee2` | Transportation + storage editing |
| `warehouse` | Imports/transfers/exports at **Storage** only; storage card |
| `accountant` | Read + accounting card; no storage edits |

Default test login: `manager@tracker.local` / `123456` (see root README for all seeded accounts).

## API configuration

Override base URL with a dart define:

```bash
flutter run --dart-define=API_BASE=http://<your-lan-ip>:4000
```

Default resolution (in `api.dart`):

- Desktop/web: tries `http://localhost:4000`, then LAN fallback
- Android: tries LAN, then `http://10.0.2.2:4000`, then localhost

## Run

```bash
flutter pub get
flutter run
```

Ensure the API is running from the repo root:

```bash
npm run dev:api
```

Use a reachable host/IP when testing on physical devices.
