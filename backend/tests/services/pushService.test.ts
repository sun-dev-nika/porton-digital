import { createServer } from 'node:http';

import type { IncomingMessage, Server, ServerResponse } from 'node:http';

import { sendExpoPushNotification } from '../../src/services/pushService';

function startStubServer(
  handler: (req: IncomingMessage, res: ServerResponse, body: string) => void,
): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        handler(req, res, body);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/push` });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

describe('pushService.sendExpoPushNotification', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await closeServer(server);
      server = undefined;
    }
  });

  it('envía el payload esperado al stub y devuelve { ok: true } ante una respuesta ok (R8, R11)', async () => {
    let receivedBody: unknown;
    let receivedPath: string | undefined;
    const started = await startStubServer((req, res, body) => {
      receivedPath = req.url;
      receivedBody = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ status: 'ok', id: 'stub-id-1' }] }));
    });
    server = started.server;

    const result = await sendExpoPushNotification(
      {
        to: 'ExponentPushToken[abc123]',
        title: 'Ingreso confirmado',
        body: 'Juan Pérez acaba de ingresar',
        data: { invitationId: 42 },
      },
      started.baseUrl,
    );

    expect(result).toEqual({ ok: true });
    expect(receivedPath).toBe('/push');
    expect(receivedBody).toEqual([
      {
        to: 'ExponentPushToken[abc123]',
        title: 'Ingreso confirmado',
        body: 'Juan Pérez acaba de ingresar',
        data: { invitationId: 42 },
      },
    ]);
  });

  it('devuelve { ok: false } sin lanzar cuando el stub responde con status no-2xx (R10)', async () => {
    const started = await startStubServer((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal' }));
    });
    server = started.server;

    const result = await sendExpoPushNotification(
      { to: 'ExponentPushToken[abc123]', title: 'T', body: 'B' },
      started.baseUrl,
    );

    expect(result).toEqual({ ok: false });
  });

  it('devuelve { ok: false } sin lanzar cuando no hay ningún servidor escuchando (R10)', async () => {
    const result = await sendExpoPushNotification(
      { to: 'ExponentPushToken[abc123]', title: 'T', body: 'B' },
      'http://127.0.0.1:1/no-server-here',
    );

    expect(result).toEqual({ ok: false });
  });
});
