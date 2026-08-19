import express from 'express';

import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';

import { createAuthRouter } from './routes/authRoutes';

export function createApp(db: DatabaseSync): Express {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(db));
  return app;
}
