import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import { createDatabase } from '../../src/db/createDatabase';
import { seedDevelopmentData } from '../../src/db/seed';

describe('seedDevelopmentData', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-seed-'));
    dbPath = join(tempDir, 'seed-test.sqlite');
    db = createDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('inserta al menos una unidad, un residente y un guardia', () => {
    seedDevelopmentData(db);

    const unitCount = db.prepare('SELECT COUNT(*) AS count FROM units').get() as {
      count: number;
    };
    const residentCount = db.prepare('SELECT COUNT(*) AS count FROM residents').get() as {
      count: number;
    };
    const guardCount = db.prepare('SELECT COUNT(*) AS count FROM guards').get() as {
      count: number;
    };

    expect(unitCount.count).toBeGreaterThanOrEqual(1);
    expect(residentCount.count).toBeGreaterThanOrEqual(1);
    expect(guardCount.count).toBeGreaterThanOrEqual(1);
  });

  it('asocia el residente sembrado a una unidad existente', () => {
    seedDevelopmentData(db);

    const resident = db.prepare('SELECT unitId FROM residents LIMIT 1').get() as { unitId: number };
    const unit = db.prepare('SELECT id FROM units WHERE id = ?').get(resident.unitId) as
      { id: number } | undefined;

    expect(unit).toBeDefined();
  });
});
