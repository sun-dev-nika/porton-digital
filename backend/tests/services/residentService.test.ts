import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import { createDatabase } from '../../src/db/createDatabase';
import { findResidentByEmail, findResidentById } from '../../src/db/residents';
import { seedDevelopmentData } from '../../src/db/seed';
import { InvalidPushTokenInputError } from '../../src/services/errors';
import { registerResidentPushToken } from '../../src/services/residentService';

describe('residentService.registerResidentPushToken', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let residentId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-resident-service-'));
    dbPath = join(tempDir, 'resident-service-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentId = resident.id;
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('guarda el pushToken recibido y lo refleja en el ResidentRecord devuelto (R1)', () => {
    const result = registerResidentPushToken(db, residentId, 'ExponentPushToken[abc]');

    expect(result.pushToken).toBe('ExponentPushToken[abc]');
    expect(findResidentById(db, residentId)!.pushToken).toBe('ExponentPushToken[abc]');
  });

  it('lanza InvalidPushTokenInputError para pushToken undefined, sin modificar la columna (R2)', () => {
    expect(() => registerResidentPushToken(db, residentId, undefined)).toThrow(
      InvalidPushTokenInputError,
    );
    expect(findResidentById(db, residentId)!.pushToken).toBeNull();
  });

  it('lanza InvalidPushTokenInputError para pushToken no-string, sin modificar la columna (R2)', () => {
    expect(() => registerResidentPushToken(db, residentId, 12345)).toThrow(
      InvalidPushTokenInputError,
    );
    expect(findResidentById(db, residentId)!.pushToken).toBeNull();
  });

  it('lanza InvalidPushTokenInputError para pushToken vacío o solo espacios, sin modificar la columna (R2)', () => {
    expect(() => registerResidentPushToken(db, residentId, '')).toThrow(
      InvalidPushTokenInputError,
    );
    expect(() => registerResidentPushToken(db, residentId, '   ')).toThrow(
      InvalidPushTokenInputError,
    );
    expect(findResidentById(db, residentId)!.pushToken).toBeNull();
  });

  it('invocado dos veces con valores distintos, el segundo reemplaza al primero (R3)', () => {
    registerResidentPushToken(db, residentId, 'ExponentPushToken[primero]');
    expect(findResidentById(db, residentId)!.pushToken).toBe('ExponentPushToken[primero]');

    const result = registerResidentPushToken(db, residentId, 'ExponentPushToken[segundo]');

    expect(result.pushToken).toBe('ExponentPushToken[segundo]');
    expect(findResidentById(db, residentId)!.pushToken).toBe('ExponentPushToken[segundo]');
  });
});
