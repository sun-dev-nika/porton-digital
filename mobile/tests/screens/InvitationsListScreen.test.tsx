import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { InvitationsListScreen } from '../../src/screens/InvitationsListScreen';
import { listInvitations } from '../../src/api';

jest.mock('../../src/api', () => ({
  listInvitations: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockedListInvitations = listInvitations as jest.Mock;

// El primer render de RNTL en este proceso compila mocks pesados; bajo carga excede el timeout por defecto.
jest.setTimeout(15000);

describe('InvitationsListScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renderiza un invitation-item por cada invitación tras un mount exitoso', async () => {
    mockedListInvitations.mockResolvedValue({
      invitations: [
        {
          id: 1,
          code: 'ABCDEFGHJKMN',
          visitorName: 'Juan Pérez',
          validFrom: '2026-01-01T10:00:00.000Z',
          validUntil: '2026-01-01T12:00:00.000Z',
          status: 'pending',
        },
        {
          id: 2,
          code: 'ZYXWVUTSRQPN',
          visitorName: 'María López',
          validFrom: '2020-01-01T10:00:00.000Z',
          validUntil: '2020-01-01T12:00:00.000Z',
          status: 'expired',
        },
      ],
    });

    const view = render(<InvitationsListScreen />);

    await waitFor(() => expect(view.getByTestId('invitation-item-1')).toBeTruthy());
    expect(view.getByTestId('invitation-visitor-1').props.children).toBe('Juan Pérez');
    expect(view.getByTestId('invitation-status-1').props.children).toBe('pending');
    expect(view.getByTestId('invitation-item-2')).toBeTruthy();
    expect(view.getByTestId('invitation-visitor-2').props.children).toBe('María López');
    expect(view.getByTestId('invitation-status-2').props.children).toBe('expired');
  });

  it('muestra invitations-error y ningún invitation-item tras un mount fallido', async () => {
    mockedListInvitations.mockRejectedValue(new Error('Error de red'));

    const view = render(<InvitationsListScreen />);

    await waitFor(() => expect(view.getByTestId('invitations-error')).toBeTruthy());
    expect(view.queryByTestId('invitation-item-1')).toBeNull();
  });

  it('navega al detalle de la invitación al tocar un ítem de la lista', async () => {
    mockedListInvitations.mockResolvedValue({
      invitations: [
        {
          id: 1,
          code: 'ABCDEFGHJKMN',
          visitorName: 'Juan Pérez',
          validFrom: '2026-01-01T10:00:00.000Z',
          validUntil: '2026-01-01T12:00:00.000Z',
          status: 'pending',
        },
      ],
    });

    const view = render(<InvitationsListScreen />);

    await waitFor(() => expect(view.getByTestId('invitation-item-1')).toBeTruthy());
    fireEvent.press(view.getByTestId('invitation-item-1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/invitationDetail',
      params: { id: '1' },
    });
  });
});
