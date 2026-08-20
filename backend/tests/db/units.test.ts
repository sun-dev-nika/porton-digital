import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import { createDatabase } from '../../src/db/createDatabase';
import { seedDevelopmentData } from '../../src/db/seed';
import { findUnitByLabel } from '../../src/db/units';

describe('findUnitByLabel', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-units-db-'));
    dbPath = join(tempDir, 'units-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('devuelve el registro esperado para un label sembrado', () => {
    const unit = findUnitByLabel(db, '101');

    expect(unit).toMatchObject({ id: expect.any(Number), label: '101' });
  });

  it('devuelve undefined para un label inexistente', () => {
    const unit = findUnitByLabel(db, 'unidad-inexistente');

    expect(unit).toBeUndefined();
  });
});
