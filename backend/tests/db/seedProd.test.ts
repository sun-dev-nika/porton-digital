import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { createDatabase } from '../../src/db/createDatabase';
import { seedProd } from '../../src/db/seedProd';

interface CountRow {
  count: number;
}

function countResidents(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM residents').get() as unknown as CountRow;
  return row.count;
}

describe('seedProd', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-seedprod-'));
    dbPath = join(tempDir, 'prod-test.sqlite');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('siembra los datos de demo cuando la tabla residents está vacía', () => {
    const db = createDatabase(dbPath);
    db.close();

    seedProd(dbPath);

    const verifyDb = new DatabaseSync(dbPath);
    expect(countResidents(verifyDb)).toBe(1);
    verifyDb.close();
  });

  it('no duplica filas si ya fue sembrada previamente', () => {
    seedProd(dbPath);
    seedProd(dbPath);

    const verifyDb = new DatabaseSync(dbPath);
    expect(countResidents(verifyDb)).toBe(1);
    verifyDb.close();
  });

  it('crea la base de datos si el archivo no existe todavía', () => {
    seedProd(dbPath);

    const verifyDb = new DatabaseSync(dbPath);
    expect(countResidents(verifyDb)).toBe(1);
    verifyDb.close();
  });
});
