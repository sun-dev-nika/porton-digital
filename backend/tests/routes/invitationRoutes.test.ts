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
