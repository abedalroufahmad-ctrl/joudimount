import jwt from "jsonwebtoken";

export type UserRole = "manager" | "employee" | "employee2" | "accountant";

export interface AuthPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production";

export function signAuthToken(payload: AuthPayload) {
  // Intentionally no JWT expiry to keep login sessions persistent.
  return jwt.sign(payload, JWT_SECRET);
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}
