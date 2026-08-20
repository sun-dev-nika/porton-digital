import type { DatabaseSync } from 'node:sqlite';

export interface EntryRecord {
  id: number;
  invitationId: number | null;
  unitId: number;
  guardId: number;
  visitorName: string;
  isManual: boolean;
  enteredAt: string;
}

export interface NewEntryInput {
  invitationId: number | null;
  unitId: number;
  guardId: number;
  visitorName: string;
  isManual: boolean;
}

export function insertEntry(db: DatabaseSync, input: NewEntryInput): EntryRecord {
  const result = db
    .prepare(
      'INSERT INTO entries (invitationId, unitId, guardId, visitorName, isManual) VALUES (?, ?, ?, ?, ?)',
    )
    .run(input.invitationId, input.unitId, input.guardId, input.visitorName, input.isManual ? 1 : 0);

  const row = db
    .prepare(
      'SELECT id, invitationId, unitId, guardId, visitorName, isManual, enteredAt FROM entries WHERE id = ?',
    )
    .get(result.lastInsertRowid);
  const rawEntry = row as unknown as EntryRecord;

  return { ...rawEntry, isManual: Boolean((row as unknown as { isManual: number }).isManual) };
}

export function findEntriesByResidentId(db: DatabaseSync, residentId: number): EntryRecord[] {
  const rows = db
    .prepare(
      `SELECT entries.id, entries.invitationId, entries.unitId, entries.guardId,
              entries.visitorName, entries.isManual, entries.enteredAt
       FROM entries
       INNER JOIN invitations ON entries.invitationId = invitations.id
       WHERE invitations.residentId = ?
       ORDER BY entries.enteredAt DESC`,
    )
    .all(residentId);
  return (rows as { isManual: number }[] & EntryRecord[]).map((row) => ({
    ...row,
    isManual: Boolean(row.isManual),
  })) as EntryRecord[];
}
