import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import { createDatabase } from '../../src/db/createDatabase';
import { findGuardByEmail } from '../../src/db/guards';
import { findResidentByEmail } from '../../src/db/residents';
import { seedDevelopmentData } from '../../src/db/seed';
import { listEntryHistoryForResident } from '../../src/services/entryService';

describe('entryService.listEntryHistoryForResident', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let residentId: number;
  let unitId: number;
  let guardId: number;
  let otherResidentId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-entry-service-'));
    dbPath = join(tempDir, 'entry-service-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentId = resident.id;
    unitId = resident.unitId;

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardId = guard.id;

    const otherUnitId = db.prepare('INSERT INTO units (label) VALUES (?)').run('202')
      .lastInsertRowid as number;
    otherResidentId = db
      .prepare('INSERT INTO residents (unitId, fullName, email, passwordHash) VALUES (?, ?, ?, ?)')
      .run(otherUnitId, 'Otro Residente', 'otro-resident-entries@dev.local', 'hash-irrelevante')
      .lastInsertRowid as number;
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  function insertInvitation(forResidentId: number, forUnitId: number, visitorName: string): number {
    const code = `CODE-${forResidentId}-${visitorName}`;
    return db
      .prepare(
        'INSERT INTO invitations (code, residentId, unitId, visitorName, validFrom, validUntil) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        code,
        forResidentId,
        forUnitId,
        visitorName,
        '2026-01-01T10:00:00.000Z',
        '2026-01-01T12:00:00.000Z',
      ).lastInsertRowid as number;
  }

  function insertEntry(params: {
    invitationId: number | null;
    forUnitId: number;
    visitorName: string;
    isManual: number;
    enteredAt: string;
  }): number {
    return db
      .prepare(
        'INSERT INTO entries (invitationId, unitId, guardId, visitorName, isManual, enteredAt) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        params.invitationId,
        params.forUnitId,
        guardId,
        params.visitorName,
        params.isManual,
        params.enteredAt,
      ).lastInsertRowid as number;
  }

  it('devuelve solo los ingresos cuya invitación pertenece al residente pedido (R1)', () => {
    const ownInvitationId = insertInvitation(residentId, unitId, 'Visita Propia');
    const otherInvitationId = insertInvitation(otherResidentId, unitId, 'Visita Ajena');

    insertEntry({
      invitationId: ownInvitationId,
      forUnitId: unitId,
      visitorName: 'Visita Propia',
      isManual: 0,
      enteredAt: '2026-01-02T10:00:00.000Z',
    });
    insertEntry({
      invitationId: otherInvitationId,
      forUnitId: unitId,
      visitorName: 'Visita Ajena',
      isManual: 0,
      enteredAt: '2026-01-02T11:00:00.000Z',
    });

    const result = listEntryHistoryForResident(db, residentId);

    expect(result).toHaveLength(1);
    expect(result[0]!.visitorName).toBe('Visita Propia');
    expect(result[0]!.invitationId).toBe(ownInvitationId);
  });

  it('excluye ingresos manuales sin invitación asociada (R2)', () => {
    insertEntry({
      invitationId: null,
      forUnitId: unitId,
      visitorName: 'Visita Manual',
      isManual: 1,
      enteredAt: '2026-01-02T10:00:00.000Z',
    });

    const result = listEntryHistoryForResident(db, residentId);

    expect(result).toEqual([]);
  });

  it('ordena el resultado por enteredAt descendente (R3)', () => {
    const invitationId = insertInvitation(residentId, unitId, 'Visita');

    insertEntry({
      invitationId,
      forUnitId: unitId,
      visitorName: 'Visita Antigua',
      isManual: 0,
      enteredAt: '2026-01-01T09:00:00.000Z',
    });
    insertEntry({
      invitationId,
      forUnitId: unitId,
      visitorName: 'Visita Reciente',
      isManual: 0,
      enteredAt: '2026-01-03T09:00:00.000Z',
    });
    insertEntry({
      invitationId,
      forUnitId: unitId,
      visitorName: 'Visita Intermedia',
      isManual: 0,
      enteredAt: '2026-01-02T09:00:00.000Z',
    });

    const result = listEntryHistoryForResident(db, residentId);

    expect(result.map((entry) => entry.visitorName)).toEqual([
      'Visita Reciente',
      'Visita Intermedia',
      'Visita Antigua',
    ]);
  });

  it('cada elemento incluye id, invitationId, visitorName y enteredAt (R4)', () => {
    const invitationId = insertInvitation(residentId, unitId, 'Visita Completa');
    insertEntry({
      invitationId,
      forUnitId: unitId,
      visitorName: 'Visita Completa',
      isManual: 0,
      enteredAt: '2026-01-02T10:00:00.000Z',
    });

    const result = listEntryHistoryForResident(db, residentId);

    expect(result[0]).toMatchObject({
      id: expect.any(Number),
      invitationId,
      visitorName: 'Visita Completa',
      enteredAt: '2026-01-02T10:00:00.000Z',
    });
  });

  it('devuelve un array vacío cuando el residente no tiene ingresos (R7)', () => {
    const result = listEntryHistoryForResident(db, residentId);

    expect(result).toEqual([]);
  });
});
