import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// El branching web/nativo de tokenStorage se decide a nivel de módulo (lee
// Platform.OS al importarse), así que fijamos la plataforma antes del
// require en este archivo dedicado a la rama nativa.
Platform.OS = 'ios';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { saveToken, getToken, clearToken } = require('../../src/api/tokenStorage');

const TOKEN_KEY = 'porton-digital.auth-token';

describe('tokenStorage en nativo (ios/android)', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('guarda el token vía expo-secure-store', async () => {
    secureStore.setItemAsync.mockResolvedValue(undefined);

    await saveToken('jwt-native');

    expect(secureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'jwt-native');
  });

  it('lee el token vía expo-secure-store', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-native');

    await expect(getToken()).resolves.toBe('stored-native');
    expect(secureStore.getItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it('borra el token vía expo-secure-store', async () => {
    secureStore.deleteItemAsync.mockResolvedValue(undefined);

    await clearToken();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });
});
