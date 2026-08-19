import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import { createDatabase } from '../../src/db/createDatabase';
import { findResidentByEmail } from '../../src/db/residents';
import { seedDevelopmentData } from '../../src/db/seed';
import {
  InvalidInvitationInputError,
  InvalidInvitationWindowError,
} from '../../src/services/errors';
import {
  createInvitation,
  generateInvitationCode,
} from '../../src/services/invitationService';

describe('invitationService.generateInvitationCode', () => {
  it('genera un código de 12 caracteres del alfabeto Crockford Base32', () => {
    const code = generateInvitationCode();

    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
    expect(code).toHaveLength(12);
  });

  it('genera 100 códigos sin duplicados (verificación estadística)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      codes.add(generateInvitationCode());
    }

    expect(codes.size).toBe(100);
  });
});

describe('invitationService.createInvitation', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;
  let residentId: number;
  let unitId: number;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'porton-digital-invitation-service-'));
    dbPath = join(tempDir, 'invitation-service-test.sqlite');
    db = createDatabase(dbPath);
    seedDevelopmentData(db);
    const resident = findResidentByEmail(db, 'resident@dev.local');
    residentId = resident!.id;
    unitId = resident!.unitId;
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('crea una invitación con el residentId y unitId del residente autenticado', () => {
    const invitation = createInvitation(db, residentId, {
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    });

    expect(invitation.residentId).toBe(residentId);
    expect(invitation.unitId).toBe(unitId);
    expect(invitation.visitorName).toBe('Juan Pérez');
    expect(invitation.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
  });

  it('rechaza un visitorName vacío con InvalidInvitationInputError', () => {
    expect(() =>
      createInvitation(db, residentId, {
        visitorName: '   ',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      }),
    ).toThrow(InvalidInvitationInputError);
  });

  it('rechaza un visitorName ausente con InvalidInvitationInputError', () => {
    expect(() =>
      createInvitation(db, residentId, {
        visitorName: undefined,
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      }),
    ).toThrow(InvalidInvitationInputError);
  });

  it('rechaza validFrom no parseable con InvalidInvitationInputError', () => {
    expect(() =>
      createInvitation(db, residentId, {
        visitorName: 'Juan Pérez',
        validFrom: 'no-es-una-fecha',
        validUntil: '2026-01-01T12:00:00.000Z',
      }),
    ).toThrow(InvalidInvitationInputError);
  });

  it('rechaza validUntil no parseable con InvalidInvitationInputError', () => {
    expect(() =>
      createInvitation(db, residentId, {
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: 'no-es-una-fecha',
      }),
    ).toThrow(InvalidInvitationInputError);
  });

  it('rechaza validUntil no posterior a validFrom con InvalidInvitationWindowError', () => {
    expect(() =>
      createInvitation(db, residentId, {
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T12:00:00.000Z',
        validUntil: '2026-01-01T10:00:00.000Z',
      }),
    ).toThrow(InvalidInvitationWindowError);
  });
});
