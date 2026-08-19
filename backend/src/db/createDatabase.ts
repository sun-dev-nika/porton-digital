import { DatabaseSync } from 'node:sqlite';

import { SCHEMA_STATEMENTS } from './schema';

export function createDatabase(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON');
  for (const statement of SCHEMA_STATEMENTS) {
    db.exec(statement);
  }
  return db;
}
