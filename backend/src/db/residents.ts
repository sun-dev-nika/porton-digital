import type { DatabaseSync } from 'node:sqlite';

export interface ResidentRecord {
  id: number;
  unitId: number;
  fullName: string;
  email: string;
  passwordHash: string;
}

export function findResidentByEmail(db: DatabaseSync, email: string): ResidentRecord | undefined {
  const row = db
    .prepare('SELECT id, unitId, fullName, email, passwordHash FROM residents WHERE email = ?')
    .get(email);
  return row as unknown as ResidentRecord | undefined;
}
