import type { DatabaseSync } from 'node:sqlite';

export interface GuardRecord {
  id: number;
  fullName: string;
  email: string;
  passwordHash: string;
}

export function findGuardByEmail(db: DatabaseSync, email: string): GuardRecord | undefined {
  const row = db
    .prepare('SELECT id, fullName, email, passwordHash FROM guards WHERE email = ?')
    .get(email);
  return row as unknown as GuardRecord | undefined;
}
