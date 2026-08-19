import { render, waitFor } from '@testing-library/react-native';

import { InvitationDetailScreen } from '../../src/screens/InvitationDetailScreen';
import { getInvitation } from '../../src/api';

jest.mock('../../src/api', () => ({
  getInvitation: jest.fn(),
}));

jest.mock('react-native-qrcode-svg', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ value }: { value: string }) => (
      <MockText testID="invitation-qr-value">{value}</MockText>
    ),
  };
});

const mockedGetInvitation = getInvitation as jest.Mock;

// El primer render de RNTL en este proceso compila mocks pesados; bajo carga excede el timeout por defecto.
jest.setTimeout(15000);

describe('InvitationDetailScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renderiza invitation-qr con el code recibido como valor codificado tras un mount exitoso', async () => {
    mockedGetInvitation.mockResolvedValue({
      invitation: {
        id: 1,
        code: 'ABCDEFGHJKMN',
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
        status: 'pending',
      },
    });

    const view = render(<InvitationDetailScreen invitationId={1} />);

    await waitFor(() => expect(view.getByTestId('invitation-qr')).toBeTruthy());
    expect(view.getByTestId('invitation-qr-value').props.children).toBe('ABCDEFGHJKMN');
    expect(view.getByTestId('invitation-detail-visitor').props.children).toBe('Juan Pérez');
  });

  it('muestra invitation-detail-error y ningún invitation-qr tras un mount fallido', async () => {
    mockedGetInvitation.mockRejectedValue(new Error('Error de red'));

    const view = render(<InvitationDetailScreen invitationId={1} />);

    await waitFor(() => expect(view.getByTestId('invitation-detail-error')).toBeTruthy());
    expect(view.queryByTestId('invitation-qr')).toBeNull();
  });
});
