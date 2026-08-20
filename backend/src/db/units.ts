import type { DatabaseSync } from 'node:sqlite';

export interface UnitRecord {
  id: number;
  label: string;
  createdAt: string;
}

export function findUnitByLabel(db: DatabaseSync, label: string): UnitRecord | undefined {
  const row = db.prepare('SELECT id, label, createdAt FROM units WHERE label = ?').get(label);
  return row as unknown as UnitRecord | undefined;
}
