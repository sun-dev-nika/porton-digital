import { act, renderHook } from '@testing-library/react-native';

import { getRoleHomeRoute, useLogin } from '../../src/hooks/useLogin';
import { login } from '../../src/api';
import { registerResidentPushToken } from '../../src/hooks/usePushTokenRegistration';

describe('getRoleHomeRoute', () => {
  it('devuelve /residentHome para el rol resident', () => {
    expect(getRoleHomeRoute('resident')).toBe('/residentHome');
  });

  it('devuelve /guardHome para el rol guard', () => {
    expect(getRoleHomeRoute('guard')).toBe('/guardHome');
  });
});

jest.mock('../../src/api', () => ({
  login: jest.fn(),
}));

jest.mock('../../src/hooks/usePushTokenRegistration', () => ({
  registerResidentPushToken: jest.fn(),
}));

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockedLogin = login as jest.Mock;
const mockedRegisterResidentPushToken = registerResidentPushToken as jest.Mock;

describe('useLogin', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedRegisterResidentPushToken.mockResolvedValue(undefined);
  });

  it('tras un login exitoso de un resident, llama a registerResidentPushToken (R6)', async () => {
    mockedLogin.mockResolvedValue({ token: 'jwt-resident', user: { id: 1, role: 'resident' } });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.submit('resident@example.com', 'secret');
    });

    expect(mockedRegisterResidentPushToken).toHaveBeenCalled();
  });

  it('tras un login exitoso de un guard, no llama a registerResidentPushToken (R7)', async () => {
    mockedLogin.mockResolvedValue({ token: 'jwt-guard', user: { id: 2, role: 'guard' } });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.submit('guard@example.com', 'secret');
    });

    expect(mockedRegisterResidentPushToken).not.toHaveBeenCalled();
  });
});
