import { render, waitFor } from '@testing-library/react-native';

import { DailyLogScreen } from '../../src/screens/DailyLogScreen';
import { listTodayEntries } from '../../src/api';

jest.mock('../../src/api', () => ({
  listTodayEntries: jest.fn(),
}));

const mockedListTodayEntries = listTodayEntries as jest.Mock;

// El primer render de RNTL en este proceso compila mocks pesados; bajo carga excede el timeout por defecto.
jest.setTimeout(15000);

describe('DailyLogScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renderiza un daily-log-item por cada entry, distinguiendo QR de Manual (R9)', async () => {
    mockedListTodayEntries.mockResolvedValue({
      entries: [
        {
          id: 1,
          invitationId: 1,
          unitId: 1,
          guardId: 1,
          visitorName: 'Juan Pérez',
          isManual: false,
          enteredAt: '2026-01-02T10:00:00.000Z',
          unitLabel: '101',
        },
        {
          id: 2,
          invitationId: null,
          unitId: 2,
          guardId: 1,
          visitorName: 'María López',
          isManual: true,
          enteredAt: '2026-01-02T11:00:00.000Z',
          unitLabel: '202',
        },
      ],
    });

    const view = render(<DailyLogScreen />);

    await waitFor(() => expect(view.getByTestId('daily-log-item-1')).toBeTruthy());
    expect(view.getByTestId('daily-log-unit-1').props.children).toBe('101');
    expect(view.getByTestId('daily-log-visitor-1').props.children).toBe('Juan Pérez');
    expect(view.getByTestId('daily-log-time-1').props.children).toBe('2026-01-02T10:00:00.000Z');
    expect(view.getByTestId('daily-log-source-1').props.children).toBe('QR');

    expect(view.getByTestId('daily-log-item-2')).toBeTruthy();
    expect(view.getByTestId('daily-log-unit-2').props.children).toBe('202');
    expect(view.getByTestId('daily-log-source-2').props.children).toBe('Manual');
  });

  it('muestra daily-log-error y ningún daily-log-item tras un mount fallido (R10)', async () => {
    mockedListTodayEntries.mockRejectedValue(new Error('Error de red'));

    const view = render(<DailyLogScreen />);

    await waitFor(() => expect(view.getByTestId('daily-log-error')).toBeTruthy());
    expect(view.queryByTestId('daily-log-item-1')).toBeNull();
  });
});
