import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { createDatabase } from './createDatabase';
import { seedDevelopmentData } from './seed';

const DEV_DB_PATH = join(__dirname, '..', '..', 'data', 'dev.sqlite');

function seedDev(dbPath: string): void {
  mkdirSync(dirname(dbPath), { recursive: true });
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
  const db = createDatabase(dbPath);
  seedDevelopmentData(db);
  db.close();
}

if (require.main === module) {
  seedDev(DEV_DB_PATH);
}
