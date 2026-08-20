import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IncomingMessage, Server, ServerResponse } from 'node:http';
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

describe('GET /invitations/:id', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;
  let residentToken: string;
  let guardToken: string;
  let residentId: number;
  let otherResidentId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-getinvitationdetail-'));
    dbPath = join(tempDir, 'getinvitationdetail-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    app = createApp(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentId = resident.id;
    residentToken = sign({ id: resident.id, role: 'resident' }, JWT_SECRET);

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardToken = sign({ id: guard.id, role: 'guard' }, JWT_SECRET);

    const otherUnitId = db.prepare('INSERT INTO units (label) VALUES (?)').run('404')
      .lastInsertRowid as number;
    otherResidentId = db
      .prepare('INSERT INTO residents (unitId, fullName, email, passwordHash) VALUES (?, ?, ?, ?)')
      .run(otherUnitId, 'Otro Residente Detalle', 'otro-detalle@dev.local', 'hash-irrelevante')
      .lastInsertRowid as number;
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('devuelve 200 con el detalle cuando la invitación pertenece al residente autenticado', async () => {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Propia',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });
    const invitationId = createResponse.body.invitation.id;

    const response = await request(app)
      .get(`/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invitation).toMatchObject({
      id: invitationId,
      visitorName: 'Visita Propia',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
      residentId,
    });
    expect(typeof response.body.invitation.code).toBe('string');
  });

  it('rechaza con 403 cuando la invitación pertenece a otro residente', async () => {
    const otherToken = sign({ id: otherResidentId, role: 'resident' }, JWT_SECRET);
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        visitorName: 'Visita Ajena',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });
    const invitationId = createResponse.body.invitation.id;

    const response = await request(app)
      .get(`/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(403);
    expect(response.body.invitation).toBeUndefined();
  });

  it('rechaza con 404 cuando el id no corresponde a ninguna invitación existente', async () => {
    const response = await request(app)
      .get('/invitations/999999')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(404);
    expect(response.body.invitation).toBeUndefined();
  });

  it('rechaza con 404 cuando el id no es numérico', async () => {
    const response = await request(app)
      .get('/invitations/abc')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(404);
    expect(response.body.invitation).toBeUndefined();
  });

  it('rechaza con 401 sin token de autenticación', async () => {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Propia',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });
    const invitationId = createResponse.body.invitation.id;

    const response = await request(app).get(`/invitations/${invitationId}`);

    expect(response.status).toBe(401);
  });

  it('rechaza con 403 un token de rol guard', async () => {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Propia',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      });
    const invitationId = createResponse.body.invitation.id;

    const response = await request(app)
      .get(`/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(403);
  });
});

describe('GET /invitations/by-code/:code', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;
  let residentToken: string;
  let guardToken: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-getinvitationbycode-'));
    dbPath = join(tempDir, 'getinvitationbycode-test.sqlite');
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

  it('devuelve 200 status valid para una invitación con ventana que ya empezó y no ha terminado', async () => {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Activa',
        validFrom: '2020-01-01T10:00:00.000Z',
        validUntil: '2099-01-01T12:00:00.000Z',
      });
    const code = createResponse.body.invitation.code as string;

    const response = await request(app)
      .get(`/invitations/by-code/${code}`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('valid');
    expect(response.body.invitation).toMatchObject({ visitorName: 'Visita Activa' });
  });

  it('devuelve 200 status not_yet_valid para una invitación creada con validFrom futuro', async () => {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Futura',
        validFrom: '2099-01-01T10:00:00.000Z',
        validUntil: '2099-01-01T12:00:00.000Z',
      });
    const code = createResponse.body.invitation.code as string;

    const response = await request(app)
      .get(`/invitations/by-code/${code}`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('not_yet_valid');
  });

  it('devuelve 200 status used tras marcar usedAt directo por SQL', async () => {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Usada',
        validFrom: '2020-01-01T10:00:00.000Z',
        validUntil: '2099-01-01T12:00:00.000Z',
      });
    const invitationId = createResponse.body.invitation.id;
    const code = createResponse.body.invitation.code as string;

    db.prepare('UPDATE invitations SET usedAt = ? WHERE id = ?').run(
      new Date().toISOString(),
      invitationId,
    );

    const response = await request(app)
      .get(`/invitations/by-code/${code}`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('used');
  });

  it('devuelve 200 status expired para una invitación con validUntil pasado', async () => {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Vencida',
        validFrom: '2020-01-01T10:00:00.000Z',
        validUntil: '2020-01-01T12:00:00.000Z',
      });
    const code = createResponse.body.invitation.code as string;

    const response = await request(app)
      .get(`/invitations/by-code/${code}`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('expired');
  });

  it('devuelve 200 status not_found con invitation null para un code inexistente', async () => {
    const response = await request(app)
      .get('/invitations/by-code/NOEXISTE1234')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'not_found', invitation: null });
  });

  it('rechaza con 401 sin token de autenticación', async () => {
    const response = await request(app).get('/invitations/by-code/NOEXISTE1234');

    expect(response.status).toBe(401);
  });

  it('rechaza con 403 un token de rol resident', async () => {
    const response = await request(app)
      .get('/invitations/by-code/NOEXISTE1234')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(403);
  });
});

function startStubServer(
  handler: (req: IncomingMessage, res: ServerResponse, body: string) => void,
): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        handler(req, res, body);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/push` });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

describe('POST /invitations/:id/confirm-entry', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;
  let residentToken: string;
  let guardToken: string;
  let residentId: number;
  let stubServer: Server | undefined;
  const previousExpoPushApiUrl = process.env.EXPO_PUSH_API_URL;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-confirmentry-'));
    dbPath = join(tempDir, 'confirmentry-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    app = createApp(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentId = resident.id;
    residentToken = sign({ id: resident.id, role: 'resident' }, JWT_SECRET);

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardToken = sign({ id: guard.id, role: 'guard' }, JWT_SECRET);
  });

  afterEach(async () => {
    if (stubServer) {
      await closeServer(stubServer);
      stubServer = undefined;
    }
    if (previousExpoPushApiUrl === undefined) {
      delete process.env.EXPO_PUSH_API_URL;
    } else {
      process.env.EXPO_PUSH_API_URL = previousExpoPushApiUrl;
    }
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function createInvitationWithWindow(validFrom: string, validUntil: string): Promise<number> {
    const createResponse = await request(app)
      .post('/invitations')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Visita Confirmable',
        validFrom,
        validUntil,
      });
    return createResponse.body.invitation.id as number;
  }

  it('devuelve 200 con la invitación marcada usada y el entry creado (R1)', async () => {
    const invitationId = await createInvitationWithWindow(
      '2020-01-01T10:00:00.000Z',
      '2099-01-01T12:00:00.000Z',
    );

    const response = await request(app)
      .post(`/invitations/${invitationId}/confirm-entry`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invitation.usedAt).not.toBeNull();
    expect(response.body.entry).toMatchObject({
      invitationId,
      visitorName: 'Visita Confirmable',
      isManual: false,
    });
  });

  it('rechaza con 404 cuando el id no corresponde a ninguna invitación existente (R2)', async () => {
    const response = await request(app)
      .post('/invitations/999999/confirm-entry')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(404);
  });

  it("rechaza con 409 reason 'used' tras marcar usedAt por SQL directo (R3)", async () => {
    const invitationId = await createInvitationWithWindow(
      '2020-01-01T10:00:00.000Z',
      '2099-01-01T12:00:00.000Z',
    );
    db.prepare('UPDATE invitations SET usedAt = ? WHERE id = ?').run(
      new Date().toISOString(),
      invitationId,
    );

    const response = await request(app)
      .post(`/invitations/${invitationId}/confirm-entry`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(409);
    expect(response.body.reason).toBe('used');
  });

  it("rechaza con 409 reason 'expired' para una invitación con validUntil pasado (R4)", async () => {
    const invitationId = await createInvitationWithWindow(
      '2020-01-01T10:00:00.000Z',
      '2020-01-01T12:00:00.000Z',
    );

    const response = await request(app)
      .post(`/invitations/${invitationId}/confirm-entry`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(409);
    expect(response.body.reason).toBe('expired');
  });

  it("rechaza con 409 reason 'not_yet_valid' para una invitación con validFrom futuro (R5)", async () => {
    const invitationId = await createInvitationWithWindow(
      '2099-01-01T10:00:00.000Z',
      '2099-01-01T12:00:00.000Z',
    );

    const response = await request(app)
      .post(`/invitations/${invitationId}/confirm-entry`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(409);
    expect(response.body.reason).toBe('not_yet_valid');
  });

  it('rechaza con 401 sin token de autenticación (R6)', async () => {
    const invitationId = await createInvitationWithWindow(
      '2020-01-01T10:00:00.000Z',
      '2099-01-01T12:00:00.000Z',
    );

    const response = await request(app).post(`/invitations/${invitationId}/confirm-entry`);

    expect(response.status).toBe(401);
  });

  it('rechaza con 403 un token de rol resident (R7)', async () => {
    const invitationId = await createInvitationWithWindow(
      '2020-01-01T10:00:00.000Z',
      '2099-01-01T12:00:00.000Z',
    );

    const response = await request(app)
      .post(`/invitations/${invitationId}/confirm-entry`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(403);
  });

  it('con pushToken fijado y EXPO_PUSH_API_URL apuntando al stub, el stub recibe la petición durante la llamada end-to-end (R8, R11)', async () => {
    let receivedBody: unknown;
    const started = await startStubServer((_req, res, body) => {
      receivedBody = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ status: 'ok', id: 'stub-id' }] }));
    });
    stubServer = started.server;
    process.env.EXPO_PUSH_API_URL = started.baseUrl;

    db.prepare('UPDATE residents SET pushToken = ? WHERE id = ?').run(
      'ExponentPushToken[resident-token]',
      residentId,
    );
    const invitationId = await createInvitationWithWindow(
      '2020-01-01T10:00:00.000Z',
      '2099-01-01T12:00:00.000Z',
    );

    const response = await request(app)
      .post(`/invitations/${invitationId}/confirm-entry`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(200);
    expect(receivedBody).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[resident-token]',
        data: { invitationId },
      }),
    ]);
  });
});
