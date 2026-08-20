import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { createDatabase } from './createDatabase';
import { seedDevelopmentData } from './seed';

const DEFAULT_DB_PATH = join(__dirname, '..', '..', 'data', 'dev.sqlite');

function openDatabase(dbPath: string): DatabaseSync {
  if (existsSync(dbPath)) {
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = ON');
    return db;
  }
  return createDatabase(dbPath);
}

function countResidents(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM residents').get() as unknown as {
    count: number;
  };
  return row.count;
}

export function seedProd(dbPath: string): void {
  const db = openDatabase(dbPath);
  if (countResidents(db) === 0) {
    seedDevelopmentData(db);
  }
  db.close();
}

if (require.main === module) {
  seedProd(process.env.DATABASE_PATH ?? DEFAULT_DB_PATH);
}
