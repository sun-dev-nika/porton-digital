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
import { findResidentByEmail } from '../../src/db/residents';
import { findGuardByEmail } from '../../src/db/guards';
import { seedDevelopmentData } from '../../src/db/seed';

describe('POST /invitations', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;
  let residentToken: string;
  let guardToken: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-invitationroutes-'));
    dbPath = join(tempDir, 'invitationroutes-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    app = createApp(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentToken = sign({ id: resident.id, role: 'resident' }, JWT_SECRET);

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardToken = sign({ id: guard.id, role: 'guard' }, JWT_SECRET);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('crea una invitación y responde 201 con el código generado', async () => {
    const response = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.invitation).toMatchObject({
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    });
    expect(typeof response.body.invitation.code).toBe('string');
    expect(response.body.invitation.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
  });

  it('rechaza con 400 un visitorName vacío', async () => {
    const response = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: '   ',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });

    expect(response.status).toBe(400);
  });

  it('rechaza con 400 fechas no parseables', async () => {
    const response = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Juan Pérez',
        validFrom: 'no-es-una-fecha',
        validUntil: '2026-01-01T12:00:00.000Z',
      });

    expect(response.status).toBe(400);
  });

  it('rechaza con 400 cuando validUntil no es posterior a validFrom', async () => {
    const response = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T12:00:00.000Z',
        validUntil: '2026-01-01T10:00:00.000Z',
      });

    expect(response.status).toBe(400);
  });

  it('rechaza con 401 sin token de autenticación', async () => {
    const response = await request(app).post('/invitations').send({
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    });

    expect(response.status).toBe(401);
  });

  it('rechaza con 403 un token de rol guard', async () => {
    const response = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });

    expect(response.status).toBe(403);
  });
});

describe('GET /invitations', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;
  let residentToken: string;
  let guardToken: string;
  let residentId: number;
  let otherResidentId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-getinvitations-'));
    dbPath = join(tempDir, 'getinvitations-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    app = createApp(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentId = resident.id;
    residentToken = sign({ id: resident.id, role: 'resident' }, JWT_SECRET);

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardToken = sign({ id: guard.id, role: 'guard' }, JWT_SECRET);

    const otherUnitId = db.prepare('INSERT INTO units (label) VALUES (?)').run('202')
      .lastInsertRowid as number;
    otherResidentId = db
      .prepare('INSERT INTO residents (unitId, fullName, email, passwordHash) VALUES (?, ?, ?, ?)')
      .run(otherUnitId, 'Otro Residente', 'otro-resident@dev.local', 'hash-irrelevante')
      .lastInsertRowid as number;
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lista solo las invitaciones propias, excluyendo las de otro residente', async () => {
    await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Propia',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });

    const otherToken = sign({ id: otherResidentId, role: 'resident' }, JWT_SECRET);
    await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        visitorName: 'Visita Ajena',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });

    const response = await request(app)
      .get('/invitations')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invitations).toHaveLength(1);
    expect(response.body.invitations[0].visitorName).toBe('Visita Propia');
    expect(response.body.invitations[0].residentId).toBe(residentId);
  });

  it('cada invitación devuelta incluye un status válido y los campos requeridos', async () => {
    await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });

    const response = await request(app)
      .get('/invitations')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invitations).toHaveLength(1);
    const invitation = response.body.invitations[0];
    expect(['pending', 'used', 'expired']).toContain(invitation.status);
    expect(invitation).toMatchObject({
      id: expect.any(Number),
      code: expect.any(String),
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    });
  });

  it('una invitación con validUntil en el pasado aparece con status expired', async () => {
    await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Vencida',
        validFrom: '2020-01-01T10:00:00.000Z',
        validUntil: '2020-01-01T12:00:00.000Z',
      });

    const response = await request(app)
      .get('/invitations')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invitations[0].status).toBe('expired');
  });

  it('una invitación con validUntil en el futuro aparece con status pending', async () => {
    await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Futura',
        validFrom: '2099-01-01T10:00:00.000Z',
        validUntil: '2099-01-01T12:00:00.000Z',
      });

    const response = await request(app)
      .get('/invitations')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invitations[0].status).toBe('pending');
  });

  it('una invitación marcada usedAt directamente en la base aparece con status used', async () => {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Usada',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });
    const invitationId = createResponse.body.invitation.id;

    db.prepare('UPDATE invitations SET usedAt = ? WHERE id = ?').run(
      new Date().toISOString(),
      invitationId,
    );

    const response = await request(app)
      .get('/invitations')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invitations[0].status).toBe('used');
  });

  it('rechaza con 401 sin token de autenticación', async () => {
    const response = await request(app).get('/invitations');

    expect(response.status).toBe(401);
  });

  it('rechaza con 403 un token de rol guard', async () => {
    const response = await request(app)
      .get('/invitations')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(403);
  });
});
