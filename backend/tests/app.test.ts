import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '../src/app';
import { createDatabase } from '../src/db/createDatabase';

describe('createApp CORS', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let app: Express;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-app-'));
    dbPath = join(tempDir, 'app-test.sqlite');
    db = createDatabase(dbPath);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('incluye el header access-control-allow-origin en las respuestas', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('Origin', 'https://example.com')
      .send({ email: 'nadie@dev.local', password: 'no-importa' });

    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});
