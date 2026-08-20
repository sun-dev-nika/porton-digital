import { Router } from 'express';

import type { DatabaseSync } from 'node:sqlite';

import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { createManualEntry } from '../services/entryService';
import type { CreateManualEntryInput } from '../services/entryService';
import { InvalidManualEntryInputError, UnitNotFoundError } from '../services/errors';

interface CreateManualEntryRequestBody {
  visitorName?: unknown;
  unitLabel?: unknown;
}

export function createEntryRouter(db: DatabaseSync): Router {
  const router = Router();

  router.post('/manual', requireAuth, requireRole('guard'), (req, res) => {
    const body = req.body as CreateManualEntryRequestBody;

    try {
      const entry = createManualEntry(db, req.user!.id, body as CreateManualEntryInput);
      res.status(201).json({ entry });
    } catch (error) {
      if (error instanceof InvalidManualEntryInputError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof UnitNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  return router;
}
