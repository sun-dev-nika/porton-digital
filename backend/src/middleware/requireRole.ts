import type { NextFunction, Request, Response } from 'express';

import type { UserRole } from '../services/authService';

export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Token de autenticación requerido' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ error: 'Rol no autorizado para este recurso' });
      return;
    }

    next();
  };
}
