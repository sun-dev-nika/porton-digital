import type { DatabaseSync } from 'node:sqlite';

import { findEntriesByResidentId, insertEntry } from '../db/entries';
import type { EntryRecord } from '../db/entries';
import { findInvitationById, markInvitationUsed } from '../db/invitations';
import type { InvitationRecord } from '../db/invitations';
import { findResidentById } from '../db/residents';
import {
  InvitationAlreadyUsedError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationNotYetValidError,
} from './errors';
import { sendExpoPushNotification } from './pushService';

export function listEntryHistoryForResident(db: DatabaseSync, residentId: number): EntryRecord[] {
  return findEntriesByResidentId(db, residentId);
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
