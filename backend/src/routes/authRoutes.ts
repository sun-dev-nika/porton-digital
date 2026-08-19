import { Router } from 'express';

import type { DatabaseSync } from 'node:sqlite';

import { login } from '../services/authService';
import { InvalidCredentialsError } from '../services/errors';

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

export function createAuthRouter(db: DatabaseSync): Router {
  const router = Router();

  router.post('/login', (req, res) => {
    const { email, password } = req.body as LoginRequestBody;

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'email y password son requeridos' });
      return;
    }

    try {
      const { token, user } = login(db, email, password);
      res.status(200).json({ token, user });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(401).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  return router;
}
