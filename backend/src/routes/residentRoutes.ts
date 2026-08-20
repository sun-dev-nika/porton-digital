import { Router } from 'express';

import type { DatabaseSync } from 'node:sqlite';

import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { listEntryHistoryForResident } from '../services/entryService';

export function createResidentRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/me/entries', requireAuth, requireRole('resident'), (req, res) => {
    const entries = listEntryHistoryForResident(db, req.user!.id);
    res.status(200).json({ entries });
  });

  return router;
}
