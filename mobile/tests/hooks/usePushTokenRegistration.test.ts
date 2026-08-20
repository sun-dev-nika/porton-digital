import * as Notifications from 'expo-notifications';

import { registerResidentPushToken } from '../../src/hooks/usePushTokenRegistration';
import { registerPushToken } from '../../src/api';

jest.mock('../../src/api', () => ({
  registerPushToken: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

const mockedRegisterPushToken = registerPushToken as jest.Mock;
const mockedRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
const mockedGetExpoPushTokenAsync = Notifications.getExpoPushTokenAsync as jest.Mock;

describe('registerResidentPushToken', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('con permiso concedido, llama a registerPushToken con el token obtenido (R6)', async () => {
    mockedRequestPermissionsAsync.mockResolvedValue({ granted: true });
    mockedGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
    mockedRegisterPushToken.mockResolvedValue({ pushToken: 'ExponentPushToken[abc]' });

    await registerResidentPushToken();

    expect(mockedRegisterPushToken).toHaveBeenCalledWith('ExponentPushToken[abc]');
  });

  it('con permiso denegado, no llama a registerPushToken y resuelve sin lanzar (R8)', async () => {
    mockedRequestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(registerResidentPushToken()).resolves.toBeUndefined();
    expect(mockedRegisterPushToken).not.toHaveBeenCalled();
  });

  it('con getExpoPushTokenAsync rechazando, resuelve sin lanzar (R8)', async () => {
    mockedRequestPermissionsAsync.mockResolvedValue({ granted: true });
    mockedGetExpoPushTokenAsync.mockRejectedValue(new Error('fallo de Expo'));

    await expect(registerResidentPushToken()).resolves.toBeUndefined();
    expect(mockedRegisterPushToken).not.toHaveBeenCalled();
  });

  it('con registerPushToken rechazando, resuelve sin lanzar (R8)', async () => {
    mockedRequestPermissionsAsync.mockResolvedValue({ granted: true });
    mockedGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
    mockedRegisterPushToken.mockRejectedValue(new Error('fallo de red'));

    await expect(registerResidentPushToken()).resolves.toBeUndefined();
  });
});
