import { Router } from 'express';

import type { DatabaseSync } from 'node:sqlite';

import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import {
  createInvitation,
  getInvitationForResident,
  listInvitationsForResident,
} from '../services/invitationService';
import type { CreateInvitationInput } from '../services/invitationService';
import {
  InvalidInvitationInputError,
  InvalidInvitationWindowError,
  InvitationAccessDeniedError,
  InvitationNotFoundError,
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
