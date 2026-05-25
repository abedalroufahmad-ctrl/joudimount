# Transaction Tracker Flutter App

Flutter client for the Transaction Tracker monorepo.

**Package name:** `judi_mount` (see `pubspec.yaml`).  
**Android application ID:** `com.example.judi_mount`.

## What this app includes

- Login with JWT-backed API session (token in `SharedPreferences`, optional remember-me)
- **Home dashboard** — search, module shortcuts, recent imports, notification entry
- **Imports, transfers, exports** — list, detail, create/edit form (multipart uploads where allowed)
- **Storage card** — warehouse entry/exit/seal fields at Storage stage (imports & transfers)
- Stage controls aligned with backend rules (stage-scoped employee permissions)
- Document attachments (grouped by category)
- **Clients** and **shipping companies** (list + detail)
- **Employees** screen (manager: CRUD; others: per API rules)
- **Profile** tab — `GET/PUT /api/auth/me` (name, email, password)
- **Notifications** — in-app list with 30-second REST polling (`NotificationService`)
- Arabic/English localization
- Map picker for shipping company coordinates (`flutter_map`)

**Accounting card:** `TransactionAccountingPage` for manager and accountant (list icon + detail link). Uses `GET/PUT /api/{module}/:id/accounting`.

**FCM push:** Optional; requires Firebase setup (see repo `docs/NOTIFICATIONS.md`). Until then, notifications arrive via polling.

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
