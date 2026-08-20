import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { LoginScreen } from '../../src/screens/LoginScreen';
import { login } from '../../src/api';
import { registerResidentPushToken } from '../../src/hooks/usePushTokenRegistration';

jest.mock('../../src/api', () => ({
  login: jest.fn(),
}));

jest.mock('../../src/hooks/usePushTokenRegistration', () => ({
  registerResidentPushToken: jest.fn().mockResolvedValue(undefined),
}));

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockedLogin = login as jest.Mock;
const mockedRegisterResidentPushToken = registerResidentPushToken as jest.Mock;

// El primer render de RNTL en este proceso compila mocks pesados; bajo carga excede el timeout por defecto.
jest.setTimeout(15000);

function fillAndSubmit(email: string, password: string): ReturnType<typeof render> {
  const view = render(<LoginScreen />);
  fireEvent.changeText(view.getByTestId('login-email-input'), email);
  fireEvent.changeText(view.getByTestId('login-password-input'), password);
  fireEvent.press(view.getByTestId('login-submit-button'));
  return view;
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedRegisterResidentPushToken.mockResolvedValue(undefined);
  });

  it('redirige a /residentHome tras un login exitoso de un resident', async () => {
    mockedLogin.mockResolvedValue({
      token: 'jwt-resident',
      user: { id: 1, role: 'resident' },
    });

    fillAndSubmit('resident@example.com', 'secret');

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/residentHome'));
    expect(mockedLogin).toHaveBeenCalledWith('resident@example.com', 'secret');
  });

  it('redirige a /guardHome tras un login exitoso de un guard', async () => {
    mockedLogin.mockResolvedValue({
      token: 'jwt-guard',
      user: { id: 2, role: 'guard' },
    });

    fillAndSubmit('guard@example.com', 'secret');

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/guardHome'));
  });

  it('no redirige y muestra un error si el login falla', async () => {
    mockedLogin.mockRejectedValue(new Error('Email o contraseña incorrectos'));

    const view = fillAndSubmit('resident@example.com', 'wrong');

    await waitFor(() => expect(view.getByTestId('login-error')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirige sin esperar a que registerResidentPushToken resuelva (R8)', async () => {
    mockedLogin.mockResolvedValue({
      token: 'jwt-resident',
      user: { id: 1, role: 'resident' },
    });
    mockedRegisterResidentPushToken.mockReturnValue(new Promise(() => {}));

    fillAndSubmit('resident@example.com', 'secret');

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/residentHome'));
  });
});
