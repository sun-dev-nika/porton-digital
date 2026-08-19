import express from 'express';

import type { Express } from 'express';

import { sign } from 'jsonwebtoken';
import request from 'supertest';

import { JWT_SECRET } from '../../src/config';
import { requireAuth } from '../../src/middleware/requireAuth';

function buildProtectedApp(): Express {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => {
    res.status(200).json({ user: req.user });
  });
  return app;
}

describe('requireAuth', () => {
  const app = buildProtectedApp();

  it('rechaza una request sin header de autorización con 401', async () => {
    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
  });

  it('rechaza un token inválido con 401', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer token-invalido');

    expect(response.status).toBe(401);
  });

  it('permite el acceso y adjunta req.user con un token válido', async () => {
    const token = sign({ id: 1, role: 'resident' }, JWT_SECRET);

    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 1, role: 'resident' });
  });
});
