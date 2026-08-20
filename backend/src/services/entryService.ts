import type { DatabaseSync } from 'node:sqlite';

import { findEntriesByResidentId } from '../db/entries';
import type { EntryRecord } from '../db/entries';

export function listEntryHistoryForResident(db: DatabaseSync, residentId: number): EntryRecord[] {
  return findEntriesByResidentId(db, residentId);
}
