import express from 'express';

import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';

import { createAuthRouter } from './routes/authRoutes';
import { createInvitationRouter } from './routes/invitationRoutes';
import { createResidentRouter } from './routes/residentRoutes';

export function createApp(db: DatabaseSync): Express {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(db));
  app.use('/invitations', createInvitationRouter(db));
  app.use('/residents', createResidentRouter(db));
  return app;
}
