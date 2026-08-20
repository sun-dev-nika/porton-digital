import { Router } from 'express';

import type { DatabaseSync } from 'node:sqlite';

import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { listEntryHistoryForResident } from '../services/entryService';
import { InvalidPushTokenInputError } from '../services/errors';
import { registerResidentPushToken } from '../services/residentService';

export function createResidentRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/me/entries', requireAuth, requireRole('resident'), (req, res) => {
    const entries = listEntryHistoryForResident(db, req.user!.id);
    res.status(200).json({ entries });
  });

  router.post('/me/push-token', requireAuth, requireRole('resident'), (req, res) => {
    const { pushToken } = req.body as { pushToken?: unknown };

    try {
      const resident = registerResidentPushToken(db, req.user!.id, pushToken);
      res.status(200).json({ pushToken: resident.pushToken });
    } catch (error) {
      if (error instanceof InvalidPushTokenInputError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  return router;
}
