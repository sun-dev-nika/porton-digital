import * as SecureStore from 'expo-secure-store';

import { request } from '../../src/api/client';
import { UnauthorizedError } from '../../src/api/errors';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('request', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('adjunta el JWT guardado en el header Authorization de un request autenticado', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-jwt-token');
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));

    await request('/invitations', { method: 'GET' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:3000/invitations');
    expect(init.headers.Authorization).toBe('Bearer stored-jwt-token');
  });

  it('no adjunta Authorization cuando no hay token guardado', async () => {
    secureStore.getItemAsync.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));

    await request('/auth/login', { method: 'POST', body: { email: 'a@b.cl', password: 'x' } });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('ante una respuesta 401 limpia el token guardado y lanza UnauthorizedError', async () => {
    secureStore.getItemAsync.mockResolvedValue('expired-token');
    secureStore.deleteItemAsync.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(401, { error: 'Token inválido o expirado' })
    );

    await expect(request('/residents/me/entries')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('porton-digital.auth-token');
  });
});
