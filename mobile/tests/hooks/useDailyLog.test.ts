import { renderHook, waitFor } from '@testing-library/react-native';

import { useDailyLog } from '../../src/hooks/useDailyLog';
import { listTodayEntries } from '../../src/api';

jest.mock('../../src/api', () => ({
  listTodayEntries: jest.fn(),
}));

const mockedListTodayEntries = listTodayEntries as jest.Mock;

describe('useDailyLog', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('llama a listTodayEntries automáticamente al montar, sin argumentos', async () => {
    mockedListTodayEntries.mockResolvedValue({ entries: [] });

    renderHook(() => useDailyLog());

    await waitFor(() => expect(mockedListTodayEntries).toHaveBeenCalledTimes(1));
    expect(mockedListTodayEntries).toHaveBeenCalledWith();
  });

  it('llena entries (incluido unitLabel por elemento) con el resultado en éxito (R8, R9)', async () => {
    const entries = [
      {
        id: 1,
        invitationId: null,
        unitId: 1,
        guardId: 1,
        visitorName: 'Juan Pérez',
        isManual: true,
        enteredAt: '2026-01-02T10:00:00.000Z',
        unitLabel: '101',
      },
    ];
    mockedListTodayEntries.mockResolvedValue({ entries });

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => expect(result.current.entries).toEqual(entries));
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('llena error y deja entries en [] cuando la llamada rechaza (R10)', async () => {
    mockedListTodayEntries.mockRejectedValue(new Error('Error de red'));

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => expect(result.current.error).toBe('Error de red'));
    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
