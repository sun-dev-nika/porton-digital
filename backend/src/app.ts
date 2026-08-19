import express from 'express';

import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';

import { createAuthRouter } from './routes/authRoutes';
import { createInvitationRouter } from './routes/invitationRoutes';

export function createApp(db: DatabaseSync): Express {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(db));
  app.use('/invitations', createInvitationRouter(db));
  return app;
}
