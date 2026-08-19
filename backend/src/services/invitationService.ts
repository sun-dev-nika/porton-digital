import { randomBytes } from 'node:crypto';

import type { DatabaseSync } from 'node:sqlite';

import { findResidentById } from '../db/residents';
import {
  findInvitationByCode,
  findInvitationsByResidentId,
  insertInvitation,
} from '../db/invitations';
import type { InvitationRecord } from '../db/invitations';
import {
  InvalidInvitationInputError,
  InvalidInvitationWindowError,
  InvitationCodeGenerationError,
  ResidentNotFoundError,
} from './errors';

const INVITATION_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const INVITATION_CODE_LENGTH = 12;
const MAX_CODE_GENERATION_ATTEMPTS = 5;

export interface CreateInvitationInput {
  visitorName: unknown;
  validFrom: unknown;
  validUntil: unknown;
}

export function generateInvitationCode(): string {
  const bytes = randomBytes(INVITATION_CODE_LENGTH);
  let code = '';
  for (const byte of bytes) {
    code += INVITATION_CODE_ALPHABET[byte % INVITATION_CODE_ALPHABET.length];
  }
  return code;
}

function assertValidVisitorName(visitorName: unknown): string {
  if (typeof visitorName !== 'string' || visitorName.trim().length === 0) {
    throw new InvalidInvitationInputError('visitorName es requerido y no puede estar vacío');
  }
  return visitorName.trim();
}

function assertParseableDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new InvalidInvitationInputError(`${fieldName} debe ser una fecha ISO 8601 válida`);
  }
  return value;
}

export function createInvitation(
  db: DatabaseSync,
  residentId: number,
  input: CreateInvitationInput,
): InvitationRecord {
  const visitorName = assertValidVisitorName(input.visitorName);
  const validFrom = assertParseableDate(input.validFrom, 'validFrom');
  const validUntil = assertParseableDate(input.validUntil, 'validUntil');

  if (Date.parse(validUntil) <= Date.parse(validFrom)) {
    throw new InvalidInvitationWindowError('validUntil debe ser posterior a validFrom');
  }

  const resident = findResidentById(db, residentId);
  if (!resident) {
    throw new ResidentNotFoundError('El residente autenticado no existe');
  }

  let code: string | undefined;
  for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = generateInvitationCode();
    if (findInvitationByCode(db, candidate) === undefined) {
      code = candidate;
      break;
    }
  }

  if (code === undefined) {
    throw new InvitationCodeGenerationError(
      'No se pudo generar un código de invitación único tras varios intentos',
    );
  }

  return insertInvitation(db, {
    code,
    residentId: resident.id,
    unitId: resident.unitId,
    visitorName,
    validFrom,
    validUntil,
  });
}

export type InvitationStatus = 'pending' | 'used' | 'expired';

export interface InvitationWithStatus extends InvitationRecord {
  status: InvitationStatus;
}

export function deriveInvitationStatus(
  invitation: InvitationRecord,
  now: Date = new Date(),
): InvitationStatus {
  if (invitation.usedAt !== null) {
    return 'used';
  }
  if (now.getTime() > Date.parse(invitation.validUntil)) {
    return 'expired';
  }
  return 'pending';
}

export function listInvitationsForResident(
  db: DatabaseSync,
  residentId: number,
  now: Date = new Date(),
): InvitationWithStatus[] {
  return findInvitationsByResidentId(db, residentId).map((invitation) => ({
    ...invitation,
    status: deriveInvitationStatus(invitation, now),
  }));
}
