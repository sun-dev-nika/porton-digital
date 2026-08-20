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

describe('POST /entries/manual', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;
  let guardToken: string;
  let residentToken: string;
  let unitId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-entryroutes-'));
    dbPath = join(tempDir, 'entryroutes-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    app = createApp(db);

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardToken = sign({ id: guard.id, role: 'guard' }, JWT_SECRET);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentToken = sign({ id: resident.id, role: 'resident' }, JWT_SECRET);
    unitId = resident.unitId;
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('responde 201 con el entry creado para un body válido con unitLabel (R1)', async () => {
    const response = await request(app)
      .post('/entries/manual')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ visitorName: 'Visita Manual', unitLabel: '101' });

    expect(response.status).toBe(201);
    expect(response.body.entry).toMatchObject({
      isManual: true,
      invitationId: null,
      unitId,
      visitorName: 'Visita Manual',
    });
  });

  it('rechaza con 400 un visitorName vacío (R2)', async () => {
    const response = await request(app)
      .post('/entries/manual')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ visitorName: '   ', unitLabel: '101' });

    expect(response.status).toBe(400);
  });

  it('rechaza con 400 un unitLabel vacío (R3)', async () => {
    const response = await request(app)
      .post('/entries/manual')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ visitorName: 'Visita Manual', unitLabel: '   ' });

    expect(response.status).toBe(400);
  });

  it('rechaza con 404 un unitLabel inexistente (R4)', async () => {
    const response = await request(app)
      .post('/entries/manual')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ visitorName: 'Visita Manual', unitLabel: 'unidad-inexistente' });

    expect(response.status).toBe(404);
  });

  it('rechaza con 401 sin token de autenticación (R5)', async () => {
    const response = await request(app)
      .post('/entries/manual')
      .send({ visitorName: 'Visita Manual', unitLabel: '101' });

    expect(response.status).toBe(401);
  });

  it('rechaza con 403 un token de rol resident (R6)', async () => {
    const response = await request(app)
      .post('/entries/manual')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ visitorName: 'Visita Manual', unitLabel: '101' });

    expect(response.status).toBe(403);
  });
});

describe('GET /entries/today', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;
  let guardToken: string;
  let residentToken: string;
  let guardId: number;
  let unitId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-entryroutes-today-'));
    dbPath = join(tempDir, 'entryroutes-today-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    app = createApp(db);

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardId = guard.id;
    guardToken = sign({ id: guard.id, role: 'guard' }, JWT_SECRET);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentToken = sign({ id: resident.id, role: 'resident' }, JWT_SECRET);
    unitId = resident.unitId;
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  function insertEntryForUnit(params: { forUnitId: number; visitorName: string; enteredAt: string }): number {
    return db
      .prepare(
        'INSERT INTO entries (invitationId, unitId, guardId, visitorName, isManual, enteredAt) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(null, params.forUnitId, guardId, params.visitorName, 1, params.enteredAt)
      .lastInsertRowid as number;
  }

  it('responde 200 solo con el entries de hoy, con isManual y unitLabel presentes (R1, R2, R4)', async () => {
    insertEntryForUnit({
      forUnitId: unitId,
      visitorName: 'Visita De Hoy',
      enteredAt: new Date().toISOString(),
    });
    insertEntryForUnit({
      forUnitId: unitId,
      visitorName: 'Visita De Ayer',
      enteredAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    });

    const response = await request(app)
      .get('/entries/today')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(response.body.entries).toHaveLength(1);
    expect(response.body.entries[0]).toMatchObject({
      visitorName: 'Visita De Hoy',
      isManual: true,
      unitLabel: '101',
    });
  });

  it('rechaza con 401 sin token de autenticación (R5)', async () => {
    const response = await request(app).get('/entries/today');

    expect(response.status).toBe(401);
  });

  it('rechaza con 403 un token de rol resident (R6)', async () => {
    const response = await request(app)
      .get('/entries/today')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(403);
  });

  it('responde 200 con entries: [] cuando no hay ningún entries insertado (R7)', async () => {
    const response = await request(app)
      .get('/entries/today')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(response.body.entries).toEqual([]);
  });
});
