import { randomBytes } from 'node:crypto';

import type { DatabaseSync } from 'node:sqlite';

import { findResidentById } from '../db/residents';
import {
  findInvitationByCode,
  findInvitationById,
  findInvitationsByResidentId,
  insertInvitation,
} from '../db/invitations';
import type { InvitationRecord } from '../db/invitations';
import {
  InvalidInvitationInputError,
  InvalidInvitationWindowError,
  InvitationAccessDeniedError,
  InvitationCodeGenerationError,
  InvitationNotFoundError,
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

export function getInvitationForResident(
  db: DatabaseSync,
  residentId: number,
  invitationId: number,
  now: Date = new Date(),
): InvitationWithStatus {
  const invitation = findInvitationById(db, invitationId);
  if (!invitation) {
    throw new InvitationNotFoundError('La invitación solicitada no existe');
  }
  if (invitation.residentId !== residentId) {
    throw new InvitationAccessDeniedError(
      'La invitación no pertenece al residente autenticado',
    );
  }
  return { ...invitation, status: deriveInvitationStatus(invitation, now) };
}

export type InvitationValidationStatus =
  | 'valid'
  | 'not_yet_valid'
  | 'used'
  | 'expired'
  | 'not_found';

export interface InvitationValidationSummary {
  id: number;
  visitorName: string;
  validFrom: string;
  validUntil: string;
}

export interface InvitationValidationResult {
  status: InvitationValidationStatus;
  invitation: InvitationValidationSummary | null;
}

export function validateInvitationByCode(
  db: DatabaseSync,
  code: string,
  now: Date = new Date(),
): InvitationValidationResult {
  const invitation = findInvitationByCode(db, code);
  if (!invitation) {
    return { status: 'not_found', invitation: null };
  }

  let status: InvitationValidationStatus;
  if (invitation.usedAt === null && now.getTime() < Date.parse(invitation.validFrom)) {
    status = 'not_yet_valid';
  } else {
    const derivedStatus = deriveInvitationStatus(invitation, now);
    status = derivedStatus === 'pending' ? 'valid' : derivedStatus;
  }

  return {
    status,
    invitation: {
      id: invitation.id,
      visitorName: invitation.visitorName,
      validFrom: invitation.validFrom,
      validUntil: invitation.validUntil,
    },
  };
}
