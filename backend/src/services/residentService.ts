import type { DatabaseSync } from 'node:sqlite';

import type { ResidentRecord } from '../db/residents';
import { updateResidentPushToken } from '../db/residents';
import { InvalidPushTokenInputError } from './errors';

export function registerResidentPushToken(
  db: DatabaseSync,
  residentId: number,
  pushToken: unknown,
): ResidentRecord {
  if (typeof pushToken !== 'string' || pushToken.trim().length === 0) {
    throw new InvalidPushTokenInputError('pushToken es requerido y no puede estar vacío');
  }
  return updateResidentPushToken(db, residentId, pushToken.trim());
}
