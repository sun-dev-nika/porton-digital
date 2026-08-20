import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { DatabaseSync } from 'node:sqlite';

import { createDatabase } from '../../src/db/createDatabase';
import { findGuardByEmail } from '../../src/db/guards';
import { findResidentByEmail } from '../../src/db/residents';
import { seedDevelopmentData } from '../../src/db/seed';
import {
  InvitationAlreadyUsedError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationNotYetValidError,
} from '../../src/services/errors';
import { confirmInvitationEntry, listEntryHistoryForResident } from '../../src/services/entryService';

describe('entryService.listEntryHistoryForResident', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let residentId: number;
  let unitId: number;
  let guardId: number;
  let otherResidentId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-entry-service-'));
    dbPath = join(tempDir, 'entry-service-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentId = resident.id;
    unitId = resident.unitId;

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardId = guard.id;

    const otherUnitId = db.prepare('INSERT INTO units (label) VALUES (?)').run('202')
      .lastInsertRowid as number;
    otherResidentId = db
      .prepare('INSERT INTO residents (unitId, fullName, email, passwordHash) VALUES (?, ?, ?, ?)')
      .run(otherUnitId, 'Otro Residente', 'otro-resident-entries@dev.local', 'hash-irrelevante')
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

  it('devuelve solo los ingresos cuya invitación pertenece al residente pedido (R1)', () => {
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

    const result = listEntryHistoryForResident(db, residentId);

    expect(result).toHaveLength(1);
    expect(result[0]!.visitorName).toBe('Visita Propia');
    expect(result[0]!.invitationId).toBe(ownInvitationId);
  });

  it('excluye ingresos manuales sin invitación asociada (R2)', () => {
    insertEntry({
      invitationId: null,
      forUnitId: unitId,
      visitorName: 'Visita Manual',
      isManual: 1,
      enteredAt: '2026-01-02T10:00:00.000Z',
    });

    const result = listEntryHistoryForResident(db, residentId);

    expect(result).toEqual([]);
  });

  it('ordena el resultado por enteredAt descendente (R3)', () => {
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
    insertEntry({
      invitationId,
      forUnitId: unitId,
      visitorName: 'Visita Intermedia',
      isManual: 0,
      enteredAt: '2026-01-02T09:00:00.000Z',
    });

    const result = listEntryHistoryForResident(db, residentId);

    expect(result.map((entry) => entry.visitorName)).toEqual([
      'Visita Reciente',
      'Visita Intermedia',
      'Visita Antigua',
    ]);
  });

  it('cada elemento incluye id, invitationId, visitorName y enteredAt (R4)', () => {
    const invitationId = insertInvitation(residentId, unitId, 'Visita Completa');
    insertEntry({
      invitationId,
      forUnitId: unitId,
      visitorName: 'Visita Completa',
      isManual: 0,
      enteredAt: '2026-01-02T10:00:00.000Z',
    });

    const result = listEntryHistoryForResident(db, residentId);

    expect(result[0]).toMatchObject({
      id: expect.any(Number),
      invitationId,
      visitorName: 'Visita Completa',
      enteredAt: '2026-01-02T10:00:00.000Z',
    });
  });

  it('devuelve un array vacío cuando el residente no tiene ingresos (R7)', () => {
    const result = listEntryHistoryForResident(db, residentId);

    expect(result).toEqual([]);
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

describe('entryService.confirmInvitationEntry', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let residentId: number;
  let unitId: number;
  let guardId: number;
  let stubServer: Server | undefined;
  const previousExpoPushApiUrl = process.env.EXPO_PUSH_API_URL;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-confirm-entry-service-'));
    dbPath = join(tempDir, 'confirm-entry-service-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);

    const resident = findResidentByEmail(db, 'resident@dev.local')!;
    residentId = resident.id;
    unitId = resident.unitId;

    const guard = findGuardByEmail(db, 'guard@dev.local')!;
    guardId = guard.id;
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

  function insertInvitation(params: { validFrom: string; validUntil: string; visitorName?: string }): number {
    const visitorName = params.visitorName ?? 'Visita Confirmable';
    return db
      .prepare(
        'INSERT INTO invitations (code, residentId, unitId, visitorName, validFrom, validUntil) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(`CODE-${Date.now()}-${Math.random()}`, residentId, unitId, visitorName, params.validFrom, params.validUntil)
      .lastInsertRowid as number;
  }

  it('marca usedAt y crea el entry esperado para una invitación activa (R1)', async () => {
    const invitationId = insertInvitation({
      validFrom: '2020-01-01T10:00:00.000Z',
      validUntil: '2099-01-01T12:00:00.000Z',
      visitorName: 'Visita Activa',
    });

    const result = await confirmInvitationEntry(db, guardId, invitationId);

    expect(result.invitation.usedAt).not.toBeNull();
    expect(result.entry).toMatchObject({
      invitationId,
      unitId,
      guardId,
      visitorName: 'Visita Activa',
      isManual: false,
    });
  });

  it('lanza InvitationNotFoundError para un id inexistente (R2)', async () => {
    await expect(confirmInvitationEntry(db, guardId, 999999)).rejects.toBeInstanceOf(
      InvitationNotFoundError,
    );
  });

  it('lanza InvitationAlreadyUsedError para una invitación ya usada (R3)', async () => {
    const invitationId = insertInvitation({
      validFrom: '2020-01-01T10:00:00.000Z',
      validUntil: '2099-01-01T12:00:00.000Z',
    });
    db.prepare('UPDATE invitations SET usedAt = ? WHERE id = ?').run(
      new Date().toISOString(),
      invitationId,
    );

    await expect(confirmInvitationEntry(db, guardId, invitationId)).rejects.toBeInstanceOf(
      InvitationAlreadyUsedError,
    );
  });

  it('lanza InvitationExpiredError para una invitación con validUntil pasado (R4)', async () => {
    const invitationId = insertInvitation({
      validFrom: '2020-01-01T10:00:00.000Z',
      validUntil: '2020-01-01T12:00:00.000Z',
    });

    await expect(confirmInvitationEntry(db, guardId, invitationId)).rejects.toBeInstanceOf(
      InvitationExpiredError,
    );
  });

  it('lanza InvitationNotYetValidError para una invitación con validFrom futuro (R5)', async () => {
    const invitationId = insertInvitation({
      validFrom: '2099-01-01T10:00:00.000Z',
      validUntil: '2099-01-01T12:00:00.000Z',
    });

    await expect(confirmInvitationEntry(db, guardId, invitationId)).rejects.toBeInstanceOf(
      InvitationNotYetValidError,
    );
  });

  it('con pushToken fijado por SQL directo, el stub recibe la petición esperada (R8)', async () => {
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
    const invitationId = insertInvitation({
      validFrom: '2020-01-01T10:00:00.000Z',
      validUntil: '2099-01-01T12:00:00.000Z',
      visitorName: 'Visita Con Push',
    });

    await confirmInvitationEntry(db, guardId, invitationId);

    expect(receivedBody).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[resident-token]',
        data: { invitationId },
      }),
    ]);
  });

  it('sin pushToken, el stub no recibe ninguna petición y la función igual confirma el ingreso (R9)', async () => {
    let requestCount = 0;
    const started = await startStubServer((_req, res) => {
      requestCount += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ status: 'ok', id: 'stub-id' }] }));
    });
    stubServer = started.server;
    process.env.EXPO_PUSH_API_URL = started.baseUrl;

    const invitationId = insertInvitation({
      validFrom: '2020-01-01T10:00:00.000Z',
      validUntil: '2099-01-01T12:00:00.000Z',
    });

    const result = await confirmInvitationEntry(db, guardId, invitationId);

    expect(requestCount).toBe(0);
    expect(result.invitation.usedAt).not.toBeNull();
    expect(result.entry.invitationId).toBe(invitationId);
  });

  it('con el stub respondiendo error, la función igual confirma el ingreso sin lanzar (R10)', async () => {
    const started = await startStubServer((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal' }));
    });
    stubServer = started.server;
    process.env.EXPO_PUSH_API_URL = started.baseUrl;

    db.prepare('UPDATE residents SET pushToken = ? WHERE id = ?').run(
      'ExponentPushToken[resident-token]',
      residentId,
    );
    const invitationId = insertInvitation({
      validFrom: '2020-01-01T10:00:00.000Z',
      validUntil: '2099-01-01T12:00:00.000Z',
    });

    const result = await confirmInvitationEntry(db, guardId, invitationId);

    expect(result.invitation.usedAt).not.toBeNull();
    expect(result.entry.invitationId).toBe(invitationId);
  });
});
