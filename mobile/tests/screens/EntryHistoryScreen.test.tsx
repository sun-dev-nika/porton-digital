import { render, waitFor } from '@testing-library/react-native';

import { EntryHistoryScreen } from '../../src/screens/EntryHistoryScreen';
import { listResidentEntries } from '../../src/api';

jest.mock('../../src/api', () => ({
  listResidentEntries: jest.fn(),
}));

const mockedListResidentEntries = listResidentEntries as jest.Mock;

// El primer render de RNTL en este proceso compila mocks pesados; bajo carga excede el timeout por defecto.
jest.setTimeout(15000);

describe('EntryHistoryScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renderiza un entry-item por cada ingreso tras un mount exitoso', async () => {
    mockedListResidentEntries.mockResolvedValue({
      entries: [
        {
          id: 1,
          invitationId: 1,
          visitorName: 'Juan Pérez',
          enteredAt: '2026-01-02T10:00:00.000Z',
        },
        {
          id: 2,
          invitationId: 2,
          visitorName: 'María López',
          enteredAt: '2026-01-01T10:00:00.000Z',
        },
      ],
    });

    const view = render(<EntryHistoryScreen />);

    await waitFor(() => expect(view.getByTestId('entry-item-1')).toBeTruthy());
    expect(view.getByTestId('entry-visitor-1').props.children).toBe('Juan Pérez');
    expect(view.getByTestId('entry-date-1').props.children).toBe('2026-01-02T10:00:00.000Z');
    expect(view.getByTestId('entry-item-2')).toBeTruthy();
    expect(view.getByTestId('entry-visitor-2').props.children).toBe('María López');
    expect(view.getByTestId('entry-date-2').props.children).toBe('2026-01-01T10:00:00.000Z');
  });

  it('muestra entry-history-error y ningún entry-item tras un mount fallido', async () => {
    mockedListResidentEntries.mockRejectedValue(new Error('Error de red'));

    const view = render(<EntryHistoryScreen />);

    await waitFor(() => expect(view.getByTestId('entry-history-error')).toBeTruthy());
    expect(view.queryByTestId('entry-item-1')).toBeNull();
  });
});
