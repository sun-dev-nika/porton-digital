import * as SecureStore from 'expo-secure-store';

import { login, logout } from '../../src/api/auth';
import { ApiError } from '../../src/api/errors';

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

describe('login', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('llama a POST /auth/login y guarda el token recibido vía expo-secure-store', async () => {
    secureStore.getItemAsync.mockResolvedValue(null);
    secureStore.setItemAsync.mockResolvedValue(undefined);
    const loginResponse = { token: 'jwt-abc', user: { id: 1, role: 'resident' as const } };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, loginResponse));

    const result = await login('resident@example.com', 'secret');

    expect(result).toEqual(loginResponse);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:3000/auth/login');
    expect(JSON.parse(init.body)).toEqual({ email: 'resident@example.com', password: 'secret' });
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('porton-digital.auth-token', 'jwt-abc');
  });

  it('propaga un ApiError y no guarda ningún token si las credenciales son inválidas', async () => {
    secureStore.getItemAsync.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(401, { error: 'Email o contraseña incorrectos' })
    );

    await expect(login('resident@example.com', 'wrong')).rejects.toBeInstanceOf(ApiError);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('borra el token guardado vía expo-secure-store', async () => {
    secureStore.deleteItemAsync.mockResolvedValue(undefined);

    await logout();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('porton-digital.auth-token');
  });
});
