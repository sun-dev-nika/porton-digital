import { verify } from 'jsonwebtoken';

import type { NextFunction, Request, Response } from 'express';

import { JWT_SECRET } from '../config';
import type { AuthenticatedUser } from '../services/authService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length);

  try {
    const payload = verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Token de autenticación inválido' });
  }
}
