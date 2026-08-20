import type { DatabaseSync } from 'node:sqlite';

import { findEntriesByResidentId, insertEntry } from '../db/entries';
import type { EntryRecord } from '../db/entries';
import { findInvitationById, markInvitationUsed } from '../db/invitations';
import type { InvitationRecord } from '../db/invitations';
import { findResidentById } from '../db/residents';
import { findUnitByLabel } from '../db/units';
import {
  InvalidManualEntryInputError,
  InvitationAlreadyUsedError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationNotYetValidError,
  UnitNotFoundError,
} from './errors';
import { sendExpoPushNotification } from './pushService';

export function listEntryHistoryForResident(db: DatabaseSync, residentId: number): EntryRecord[] {
  return findEntriesByResidentId(db, residentId);
}

export interface CreateManualEntryInput {
  visitorName: unknown;
  unitLabel: unknown;
}

function assertValidVisitorName(visitorName: unknown): string {
  if (typeof visitorName !== 'string' || visitorName.trim().length === 0) {
    throw new InvalidManualEntryInputError('visitorName es requerido y no puede estar vacío');
  }
  return visitorName.trim();
}

function assertValidUnitLabel(unitLabel: unknown): string {
  if (typeof unitLabel !== 'string' || unitLabel.trim().length === 0) {
    throw new InvalidManualEntryInputError('unitLabel es requerido y no puede estar vacío');
  }
  return unitLabel.trim();
}

export function createManualEntry(
  db: DatabaseSync,
  guardId: number,
  input: CreateManualEntryInput,
): EntryRecord {
  const visitorName = assertValidVisitorName(input.visitorName);
  const unitLabel = assertValidUnitLabel(input.unitLabel);

  const unit = findUnitByLabel(db, unitLabel);
  if (!unit) {
    throw new UnitNotFoundError('La unidad indicada no existe');
  }

  return insertEntry(db, {
    invitationId: null,
    unitId: unit.id,
    guardId,
    visitorName,
    isManual: true,
  });
}

export interface ConfirmInvitationEntryResult {
  invitation: InvitationRecord;
  entry: EntryRecord;
}

export async function confirmInvitationEntry(
  db: DatabaseSync,
  guardId: number,
  invitationId: number,
  now: Date = new Date(),
): Promise<ConfirmInvitationEntryResult> {
  const invitation = findInvitationById(db, invitationId);
  if (!invitation) {
    throw new InvitationNotFoundError('La invitación solicitada no existe');
  }
  if (invitation.usedAt !== null) {
    throw new InvitationAlreadyUsedError('La invitación ya fue utilizada');
  }
  if (now.getTime() > Date.parse(invitation.validUntil)) {
    throw new InvitationExpiredError('La invitación ya venció');
  }
  if (now.getTime() < Date.parse(invitation.validFrom)) {
    throw new InvitationNotYetValidError('La invitación todavía no comienza su ventana de validez');
  }

  const updatedInvitation = markInvitationUsed(db, invitation.id, now.toISOString());
  const entry = insertEntry(db, {
    invitationId: invitation.id,
    unitId: invitation.unitId,
    guardId,
    visitorName: invitation.visitorName,
    isManual: false,
  });

  const resident = findResidentById(db, invitation.residentId);
  if (resident?.pushToken) {
    await sendExpoPushNotification({
      to: resident.pushToken,
      title: 'Ingreso confirmado',
      body: `${invitation.visitorName} acaba de ingresar`,
      data: { invitationId: invitation.id },
    });
  }

  return { invitation: updatedInvitation, entry };
}
