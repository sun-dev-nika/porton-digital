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
