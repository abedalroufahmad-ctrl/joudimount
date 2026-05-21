import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/** Bcrypt hashes start with $2a$, $2b$, or $2y$. */
export function isPasswordHashed(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Verify plain password against stored hash or legacy plain text. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isPasswordHashed(stored)) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}
