import { Router } from 'express';

import type { DatabaseSync } from 'node:sqlite';

import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { confirmInvitationEntry } from '../services/entryService';
import {
  createInvitation,
  getInvitationForResident,
  listInvitationsForResident,
  validateInvitationByCode,
} from '../services/invitationService';
import type { CreateInvitationInput } from '../services/invitationService';
import {
  InvalidInvitationInputError,
  InvalidInvitationWindowError,
  InvitationAccessDeniedError,
  InvitationAlreadyUsedError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationNotYetValidError,
  ResidentNotFoundError,
} from '../services/errors';

interface CreateInvitationRequestBody {
  visitorName?: unknown;
  validFrom?: unknown;
  validUntil?: unknown;
}

export function createInvitationRouter(db: DatabaseSync): Router {
  const router = Router();

  router.post('/', requireAuth, requireRole('resident'), (req, res) => {
    const body = req.body as CreateInvitationRequestBody;

    try {
      const invitation = createInvitation(db, req.user!.id, body as CreateInvitationInput);
      res.status(201).json({ invitation });
    } catch (error) {
      if (
        error instanceof InvalidInvitationInputError ||
        error instanceof InvalidInvitationWindowError
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof ResidentNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.get('/', requireAuth, requireRole('resident'), (req, res) => {
    const invitations = listInvitationsForResident(db, req.user!.id);
    res.status(200).json({ invitations });
  });

  router.get('/by-code/:code', requireAuth, requireRole('guard'), (req, res) => {
    const result = validateInvitationByCode(db, req.params.code ?? '');
    res.status(200).json(result);
  });

  router.post('/:id/confirm-entry', requireAuth, requireRole('guard'), async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (Number.isNaN(id)) {
        throw new InvitationNotFoundError('La invitación solicitada no existe');
      }
      const result = await confirmInvitationEntry(db, req.user!.id, id);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvitationNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof InvitationAlreadyUsedError) {
        res.status(409).json({ error: error.message, reason: 'used' });
        return;
      }
      if (error instanceof InvitationExpiredError) {
        res.status(409).json({ error: error.message, reason: 'expired' });
        return;
      }
      if (error instanceof InvitationNotYetValidError) {
        res.status(409).json({ error: error.message, reason: 'not_yet_valid' });
        return;
      }
      throw error;
    }
  });

  router.get('/:id', requireAuth, requireRole('resident'), (req, res) => {
    const id = Number(req.params.id);

    try {
      if (Number.isNaN(id)) {
        throw new InvitationNotFoundError('La invitación solicitada no existe');
      }
      const invitation = getInvitationForResident(db, req.user!.id, id);
      res.status(200).json({ invitation });
    } catch (error) {
      if (error instanceof InvitationNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof InvitationAccessDeniedError) {
        res.status(403).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  return router;
}
