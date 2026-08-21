import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// El branching web/nativo de tokenStorage se decide a nivel de módulo (lee
// Platform.OS al importarse), así que fijamos la plataforma antes del
// require en este archivo dedicado a la rama web.
Platform.OS = 'web';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { saveToken, getToken, clearToken } = require('../../src/api/tokenStorage');

const TOKEN_KEY = 'porton-digital.auth-token';

describe('tokenStorage en web', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    jest.resetAllMocks();
    store = {};
    (global as unknown as { localStorage: Storage }).localStorage = {
      getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      key: jest.fn(),
      length: 0,
    } as unknown as Storage;
  });

  it('guarda el token en localStorage sin llamar a expo-secure-store', async () => {
    await saveToken('jwt-web');

    expect(store[TOKEN_KEY]).toBe('jwt-web');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('lee el token desde localStorage sin llamar a expo-secure-store', async () => {
    store[TOKEN_KEY] = 'stored-web';

    await expect(getToken()).resolves.toBe('stored-web');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('devuelve null si no hay token guardado en localStorage', async () => {
    await expect(getToken()).resolves.toBeNull();
  });

  it('borra el token de localStorage sin llamar a expo-secure-store', async () => {
    store[TOKEN_KEY] = 'to-remove';

    await clearToken();

    expect(store[TOKEN_KEY]).toBeUndefined();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
