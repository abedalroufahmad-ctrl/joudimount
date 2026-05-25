# Notifications setup

The project supports real-time notifications across three layers:

- **API** — persists notifications, emits Socket.IO events, optional FCM push via Firebase Admin
- **Web** — Socket.IO client + notification bell in the top bar
- **Flutter app** — in-app notification list with polling; FCM push after Firebase setup

## Who gets notified

- **Manager (admin)** — any project action by another user (create/update/delete transactions, clients, employees, etc.)
- **Employees / accountant** — when another user edits project data (not their own actions)

## API environment (optional FCM)

Set one of:

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccount.json
# or
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

Restart the API after setting these variables.

## Web

No extra setup. The web app connects to Socket.IO on the same host as `API_BASE` (`http://localhost:4000` by default).

## Flutter — Firebase Cloud Messaging

1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with package `com.example.judi_mount`
3. Download `google-services.json` into `apps/app/android/app/`
4. Run from `apps/app`:

```bash
dart pub global activate flutterfire_cli
flutterfire configure
```

5. Add to `apps/app/pubspec.yaml`:

```yaml
firebase_core: ^3.8.1
firebase_messaging: ^15.1.6
flutter_local_notifications: ^18.0.1
```

6. Apply the Google Services plugin in `android/app/build.gradle.kts` and initialize Firebase in `main.dart`.

Until Firebase is configured, the Flutter app still receives notifications via REST polling every 30 seconds and the bell icon on the dashboard.

## Testing

1. Start API: `npm run dev -w customs-api`
2. Log in as **employee** in one browser/app
3. Log in as **manager** in another browser
4. Create or edit a transaction as manager
5. Employee should see a notification (web: instant via socket; app: within 30s or immediately after opening the bell sheet)
