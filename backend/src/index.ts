import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { createApp } from './app';
import { createDatabase } from './db/createDatabase';

const DEFAULT_PORT = 3000;
const DATA_DB_PATH = process.env.DATABASE_PATH ?? join(__dirname, '..', 'data', 'dev.sqlite');

function openDatabase(dbPath: string): DatabaseSync {
  if (existsSync(dbPath)) {
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = ON');
    return db;
  }
  return createDatabase(dbPath);
}

const db = openDatabase(DATA_DB_PATH);
const app = createApp(db);
const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`porton-digital backend listening on port ${port}`);
});
