import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import { createDatabase } from '../../src/db/createDatabase';

interface ForeignKeyRow {
  table: string;
  from: string;
  to: string;
}

interface TableNameRow {
  name: string;
}

describe('createDatabase', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-db-'));
    dbPath = join(tempDir, 'test.sqlite');
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('crea un archivo SQLite nuevo en el path indicado', () => {
    db = createDatabase(dbPath);

    expect(existsSync(dbPath)).toBe(true);
  });

  it('crea las tablas units, residents, guards, invitations y entries', () => {
    db = createDatabase(dbPath);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as unknown as TableNameRow[];
    const tableNames = tables.map((row) => row.name);

    expect(tableNames).toEqual(['entries', 'guards', 'invitations', 'residents', 'units']);
  });

  it('declara la foreign key de residents hacia units', () => {
    db = createDatabase(dbPath);

    const foreignKeys = db
      .prepare('PRAGMA foreign_key_list(residents)')
      .all() as unknown as ForeignKeyRow[];

    expect(foreignKeys).toContainEqual(
      expect.objectContaining({ table: 'units', from: 'unitId', to: 'id' }),
    );
  });

  it('declara las foreign keys de invitations hacia residents y units', () => {
    db = createDatabase(dbPath);

    const foreignKeys = db
      .prepare('PRAGMA foreign_key_list(invitations)')
      .all() as unknown as ForeignKeyRow[];

    expect(foreignKeys).toContainEqual(
      expect.objectContaining({ table: 'residents', from: 'residentId', to: 'id' }),
    );
    expect(foreignKeys).toContainEqual(
      expect.objectContaining({ table: 'units', from: 'unitId', to: 'id' }),
    );
  });

  it('declara las foreign keys de entries hacia invitations, units y guards', () => {
    db = createDatabase(dbPath);

    const foreignKeys = db
      .prepare('PRAGMA foreign_key_list(entries)')
      .all() as unknown as ForeignKeyRow[];

    expect(foreignKeys).toContainEqual(
      expect.objectContaining({ table: 'invitations', from: 'invitationId', to: 'id' }),
    );
    expect(foreignKeys).toContainEqual(
      expect.objectContaining({ table: 'units', from: 'unitId', to: 'id' }),
    );
    expect(foreignKeys).toContainEqual(
      expect.objectContaining({ table: 'guards', from: 'guardId', to: 'id' }),
    );
  });

  it('rechaza insertar un resident con un unitId inexistente por la foreign key', () => {
    db = createDatabase(dbPath);

    expect(() =>
      db
        .prepare(
          'INSERT INTO residents (unitId, fullName, email, passwordHash) VALUES (?, ?, ?, ?)',
        )
        .run(999, 'Alguien', 'alguien@test.local', 'hash'),
    ).toThrow();
  });
});
