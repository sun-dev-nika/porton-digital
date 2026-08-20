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
