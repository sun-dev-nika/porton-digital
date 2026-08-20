import type { DatabaseSync } from 'node:sqlite';

export interface InvitationRecord {
  id: number;
  code: string;
  residentId: number;
  unitId: number;
  visitorName: string;
  validFrom: string;
  validUntil: string;
  usedAt: string | null;
  createdAt: string;
}

export interface NewInvitationInput {
  code: string;
  residentId: number;
  unitId: number;
  visitorName: string;
  validFrom: string;
  validUntil: string;
}

export function insertInvitation(db: DatabaseSync, input: NewInvitationInput): InvitationRecord {
  const result = db
    .prepare(
      'INSERT INTO invitations (code, residentId, unitId, visitorName, validFrom, validUntil) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(
      input.code,
      input.residentId,
      input.unitId,
      input.visitorName,
      input.validFrom,
      input.validUntil,
    );

  const row = db
    .prepare(
      'SELECT id, code, residentId, unitId, visitorName, validFrom, validUntil, usedAt, createdAt FROM invitations WHERE id = ?',
    )
    .get(result.lastInsertRowid);

  return row as unknown as InvitationRecord;
}

export function findInvitationById(db: DatabaseSync, id: number): InvitationRecord | undefined {
  const row = db
    .prepare(
      'SELECT id, code, residentId, unitId, visitorName, validFrom, validUntil, usedAt, createdAt FROM invitations WHERE id = ?',
    )
    .get(id);
  return row as unknown as InvitationRecord | undefined;
}

export function findInvitationByCode(db: DatabaseSync, code: string): InvitationRecord | undefined {
  const row = db
    .prepare(
      'SELECT id, code, residentId, unitId, visitorName, validFrom, validUntil, usedAt, createdAt FROM invitations WHERE code = ?',
    )
    .get(code);
  return row as unknown as InvitationRecord | undefined;
}

export function markInvitationUsed(
  db: DatabaseSync,
  id: number,
  usedAt: string,
): InvitationRecord {
  db.prepare('UPDATE invitations SET usedAt = ? WHERE id = ?').run(usedAt, id);
  return findInvitationById(db, id)!;
}

export function findInvitationsByResidentId(
  db: DatabaseSync,
  residentId: number,
): InvitationRecord[] {
  const rows = db
    .prepare(
      'SELECT id, code, residentId, unitId, visitorName, validFrom, validUntil, usedAt, createdAt FROM invitations WHERE residentId = ?',
    )
    .all(residentId);
  return rows as unknown as InvitationRecord[];
}
