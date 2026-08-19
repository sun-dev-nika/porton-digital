import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { CreateInvitationScreen } from '../../src/screens/CreateInvitationScreen';
import { createInvitation } from '../../src/api';

jest.mock('../../src/api', () => ({
  createInvitation: jest.fn(),
}));

const mockedCreateInvitation = createInvitation as jest.Mock;

// El primer render de RNTL en este proceso compila mocks pesados; bajo carga excede el timeout por defecto.
jest.setTimeout(15000);

function fillAndSubmit(
  visitorName: string,
  validFrom: string,
  validUntil: string,
): ReturnType<typeof render> {
  const view = render(<CreateInvitationScreen />);
  fireEvent.changeText(view.getByTestId('invitation-visitor-input'), visitorName);
  fireEvent.changeText(view.getByTestId('invitation-valid-from-input'), validFrom);
  fireEvent.changeText(view.getByTestId('invitation-valid-until-input'), validUntil);
  fireEvent.press(view.getByTestId('invitation-submit-button'));
  return view;
}

describe('CreateInvitationScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('muestra el código de la invitación tras un submit exitoso', async () => {
    mockedCreateInvitation.mockResolvedValue({
      invitation: {
        id: 1,
        code: 'ABCDEFGHJKMN',
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      },
    });

    const view = fillAndSubmit(
      'Juan Pérez',
      '2026-01-01T10:00:00.000Z',
      '2026-01-01T12:00:00.000Z',
    );

    await waitFor(() => expect(view.getByTestId('invitation-code')).toBeTruthy());
    expect(view.getByTestId('invitation-code').props.children).toBe('ABCDEFGHJKMN');
    expect(mockedCreateInvitation).toHaveBeenCalledWith({
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    });
  });

  it('muestra un error y no muestra código tras un submit fallido', async () => {
    mockedCreateInvitation.mockRejectedValue(new Error('validUntil debe ser posterior a validFrom'));

    const view = fillAndSubmit(
      'Juan Pérez',
      '2026-01-01T12:00:00.000Z',
      '2026-01-01T10:00:00.000Z',
    );

    await waitFor(() => expect(view.getByTestId('invitation-error')).toBeTruthy());
    expect(view.queryByTestId('invitation-code')).toBeNull();
  });
});
