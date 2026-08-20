import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type { Express } from 'express';
import { sign } from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../src/app';
import { JWT_SECRET } from '../../src/config';
import { createDatabase } from '../../src/db/createDatabase';
import { findGuardByEmail } from '../../src/db/guards';
import { findResidentByEmail } from '../../src/db/residents';
import { seedDevelopmentData } from '../../src/db/seed';

describe('GET /residents/me/entries', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;
  let residentToken: string;
  let guardToken: string;
  let residentId: number;
  let unitId: number;
  let guardId: number;
  let otherResidentId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-residentroutes-'));
    dbPath = join(tempDir, 'residentroutes-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    app = createApp(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentId = resident.id;
    unitId = resident.unitId;
    residentToken = sign({ id: resident.id, role: 'resident' }, JWT_SECRET);

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardId = guard.id;
    guardToken = sign({ id: guard.id, role: 'guard' }, JWT_SECRET);

    const otherUnitId = db.prepare('INSERT INTO units (label) VALUES (?)').run('303')
      .lastInsertRowid as number;
    otherResidentId = db
      .prepare('INSERT INTO residents (unitId, fullName, email, passwordHash) VALUES (?, ?, ?, ?)')
      .run(otherUnitId, 'Otro Residente', 'otro-resident-routes@dev.local', 'hash-irrelevante')
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

  it('devuelve 200 con solo los ingresos propios cuando hay ingresos de otro residente (R1, R2)', async () => {
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
    insertEntry({
      invitationId: null,
      forUnitId: unitId,
      visitorName: 'Visita Manual',
      isManual: 1,
      enteredAt: '2026-01-02T12:00:00.000Z',
    });

    const response = await request(app)
      .get('/residents/me/entries')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.entries).toHaveLength(1);
    expect(response.body.entries[0].visitorName).toBe('Visita Propia');
  });

  it('cada ingreso devuelto incluye id, invitationId, visitorName y enteredAt (R4)', async () => {
    const invitationId = insertInvitation(residentId, unitId, 'Visita Completa');
    insertEntry({
      invitationId,
      forUnitId: unitId,
      visitorName: 'Visita Completa',
      isManual: 0,
      enteredAt: '2026-01-02T10:00:00.000Z',
    });

    const response = await request(app)
      .get('/residents/me/entries')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.entries[0]).toMatchObject({
      id: expect.any(Number),
      invitationId,
      visitorName: 'Visita Completa',
      enteredAt: '2026-01-02T10:00:00.000Z',
    });
  });

  it('devuelve el array ordenado por enteredAt descendente (R3)', async () => {
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

    const response = await request(app)
      .get('/residents/me/entries')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.entries.map((entry: { visitorName: string }) => entry.visitorName)).toEqual([
      'Visita Reciente',
      'Visita Antigua',
    ]);
  });

  it('devuelve 200 con [] cuando el residente autenticado no tiene ingresos (R7)', async () => {
    const response = await request(app)
      .get('/residents/me/entries')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.entries).toEqual([]);
  });

  it('rechaza con 401 sin token de autenticación (R5)', async () => {
    const response = await request(app).get('/residents/me/entries');

    expect(response.status).toBe(401);
  });

  it('rechaza con 403 un token de rol guard (R6)', async () => {
    const response = await request(app)
      .get('/residents/me/entries')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(403);
  });
});
