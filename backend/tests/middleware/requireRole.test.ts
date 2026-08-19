import express from 'express';

import type { Express } from 'express';

import { sign } from 'jsonwebtoken';
import request from 'supertest';

import { JWT_SECRET } from '../../src/config';
import { requireAuth } from '../../src/middleware/requireAuth';
import { requireRole } from '../../src/middleware/requireRole';

function buildResidentOnlyApp(): Express {
  const app = express();
  app.get('/resident-only', requireAuth, requireRole('resident'), (req, res) => {
    res.status(200).json({ user: req.user });
  });
  return app;
}

describe('requireRole', () => {
  const app = buildResidentOnlyApp();

  it('permite el acceso cuando el rol coincide', async () => {
    const token = sign({ id: 1, role: 'resident' }, JWT_SECRET);

    const response = await request(app)
      .get('/resident-only')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('rechaza el acceso con 403 cuando el rol no coincide', async () => {
    const token = sign({ id: 1, role: 'guard' }, JWT_SECRET);

    const response = await request(app)
      .get('/resident-only')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('rechaza el acceso con 401 cuando no hay token, antes de evaluar el rol', async () => {
    const response = await request(app).get('/resident-only');

    expect(response.status).toBe(401);
  });
});
