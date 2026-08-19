import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '../../src/app';
import { createDatabase } from '../../src/db/createDatabase';
import { DEV_SEED_PASSWORD, seedDevelopmentData } from '../../src/db/seed';

describe('POST /auth/login', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-authroutes-'));
    dbPath = join(tempDir, 'authroutes-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('autentica a un resident con credenciales correctas y devuelve un JWT con { id, role }', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'resident@dev.local', password: DEV_SEED_PASSWORD });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user).toEqual({ id: expect.any(Number), role: 'resident' });
  });

  it('autentica a un guard con credenciales correctas y devuelve un JWT con { id, role }', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'guard@dev.local', password: DEV_SEED_PASSWORD });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user).toEqual({ id: expect.any(Number), role: 'guard' });
  });

  it('rechaza un login con contraseña incorrecta', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'resident@dev.local', password: 'contraseña-incorrecta' });

    expect(response.status).toBe(401);
    expect(response.body.token).toBeUndefined();
  });

  it('rechaza un login con un email que no existe', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'nadie@dev.local', password: DEV_SEED_PASSWORD });

    expect(response.status).toBe(401);
  });
});
