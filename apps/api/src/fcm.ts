import { readFileSync } from "fs";
import type { App } from "firebase-admin/app";
import type { Messaging } from "firebase-admin/messaging";

let firebaseApp: App | null = null;
let messaging: Messaging | null = null;

function initFirebase(): Messaging | null {
  if (messaging) return messaging;
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!jsonPath && !jsonInline) return null;
  try {
    const { initializeApp, cert, getApps } = require("firebase-admin/app") as typeof import("firebase-admin/app");
    const { getMessaging } = require("firebase-admin/messaging") as typeof import("firebase-admin/messaging");
    if (getApps().length === 0) {
      const raw = jsonInline ?? readFileSync(jsonPath!, "utf8");
      const serviceAccount = JSON.parse(raw) as Record<string, string>;
      firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    }
    messaging = getMessaging();
    return messaging;
  } catch (err) {
    console.warn("Firebase Admin init failed; push notifications disabled.", err);
    return null;
  }
}

export async function sendFcmToTokens(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<void> {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (unique.length === 0) return;
  const msg = initFirebase();
  if (!msg) return;
  try {
    await msg.sendEachForMulticast({
      tokens: unique,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
    });
  } catch (err) {
    console.warn("FCM send failed", err);
  }
}
