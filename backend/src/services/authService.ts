import { sign } from 'jsonwebtoken';

import type { DatabaseSync } from 'node:sqlite';

import { JWT_EXPIRES_IN, JWT_SECRET } from '../config';
import { findGuardByEmail } from '../db/guards';
import { findResidentByEmail } from '../db/residents';
import { verifyPassword } from '../utils/passwordHash';
import { InvalidCredentialsError } from './errors';

export type UserRole = 'resident' | 'guard';

export interface AuthenticatedUser {
  id: number;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: AuthenticatedUser;
}

export function login(db: DatabaseSync, email: string, password: string): LoginResult {
  const resident = findResidentByEmail(db, email);
  if (resident && verifyPassword(password, resident.passwordHash)) {
    const user: AuthenticatedUser = { id: resident.id, role: 'resident' };
    return { token: signToken(user), user };
  }

  const guard = findGuardByEmail(db, email);
  if (guard && verifyPassword(password, guard.passwordHash)) {
    const user: AuthenticatedUser = { id: guard.id, role: 'guard' };
    return { token: signToken(user), user };
  }

  throw new InvalidCredentialsError('Email o contraseña incorrectos');
}

function signToken(user: AuthenticatedUser): string {
  return sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
