import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import { verify } from 'jsonwebtoken';

import { JWT_SECRET } from '../../src/config';
import { createDatabase } from '../../src/db/createDatabase';
import { DEV_SEED_PASSWORD, seedDevelopmentData } from '../../src/db/seed';
import { login } from '../../src/services/authService';
import { InvalidCredentialsError } from '../../src/services/errors';

describe('authService.login', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-auth-'));
    dbPath = join(tempDir, 'auth-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('autentica a un resident con credenciales correctas y firma un JWT con { id, role }', () => {
    const result = login(db, 'resident@dev.local', DEV_SEED_PASSWORD);

    expect(result.user.role).toBe('resident');
    const decoded = verify(result.token, JWT_SECRET) as { id: number; role: string };
    expect(decoded.id).toBe(result.user.id);
    expect(decoded.role).toBe('resident');
  });

  it('autentica a un guard con credenciales correctas y firma un JWT con { id, role }', () => {
    const result = login(db, 'guard@dev.local', DEV_SEED_PASSWORD);

    expect(result.user.role).toBe('guard');
    const decoded = verify(result.token, JWT_SECRET) as { id: number; role: string };
    expect(decoded.id).toBe(result.user.id);
    expect(decoded.role).toBe('guard');
  });

  it('lanza InvalidCredentialsError con una contraseña incorrecta', () => {
    expect(() => login(db, 'resident@dev.local', 'contraseña-incorrecta')).toThrow(
      InvalidCredentialsError,
    );
  });

  it('lanza InvalidCredentialsError con un email inexistente', () => {
    expect(() => login(db, 'nadie@dev.local', DEV_SEED_PASSWORD)).toThrow(
      InvalidCredentialsError,
    );
  });
});
