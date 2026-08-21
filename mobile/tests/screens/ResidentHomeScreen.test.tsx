import { fireEvent, render } from '@testing-library/react-native';

import { ResidentHomeScreen } from '../../src/screens/ResidentHomeScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('ResidentHomeScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('navega a /createInvitation al presionar el control de crear invitación', () => {
    const view = render(<ResidentHomeScreen />);

    fireEvent.press(view.getByTestId('resident-home-create-invitation-button'));

    expect(mockPush).toHaveBeenCalledWith('/createInvitation');
  });

  it('navega a /invitations al presionar el control de mis invitaciones', () => {
    const view = render(<ResidentHomeScreen />);

    fireEvent.press(view.getByTestId('resident-home-invitations-button'));

    expect(mockPush).toHaveBeenCalledWith('/invitations');
  });

  it('navega a /entryHistory al presionar el control de historial de ingresos', () => {
    const view = render(<ResidentHomeScreen />);

    fireEvent.press(view.getByTestId('resident-home-entry-history-button'));

    expect(mockPush).toHaveBeenCalledWith('/entryHistory');
  });
});
