import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SALT_LENGTH_BYTES = 16;
const DERIVED_KEY_LENGTH_BYTES = 64;

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(SALT_LENGTH_BYTES).toString('hex');
  const derivedKey = scryptSync(plainPassword, salt, DERIVED_KEY_LENGTH_BYTES).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const [salt, storedDerivedKeyHex] = storedHash.split(':');
  if (!salt || !storedDerivedKeyHex) {
    return false;
  }

  const storedDerivedKey = Buffer.from(storedDerivedKeyHex, 'hex');
  const candidateDerivedKey = scryptSync(plainPassword, salt, DERIVED_KEY_LENGTH_BYTES);

  if (storedDerivedKey.length !== candidateDerivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedDerivedKey, candidateDerivedKey);
}
