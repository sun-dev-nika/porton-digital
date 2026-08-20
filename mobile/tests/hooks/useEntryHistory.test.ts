import { renderHook, waitFor } from '@testing-library/react-native';

import { useEntryHistory } from '../../src/hooks/useEntryHistory';
import { listResidentEntries } from '../../src/api';

jest.mock('../../src/api', () => ({
  listResidentEntries: jest.fn(),
}));

const mockedListResidentEntries = listResidentEntries as jest.Mock;

describe('useEntryHistory', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('llama a listResidentEntries automáticamente al montar, sin invocar refetch manualmente', async () => {
    mockedListResidentEntries.mockResolvedValue({ entries: [] });

    renderHook(() => useEntryHistory());

    await waitFor(() => expect(mockedListResidentEntries).toHaveBeenCalledTimes(1));
  });

  it('llena entries con el array recibido cuando la llamada resuelve exitosamente', async () => {
    const entries = [
      {
        id: 1,
        invitationId: 1,
        visitorName: 'Juan Pérez',
        enteredAt: '2026-01-02T10:00:00.000Z',
      },
    ];
    mockedListResidentEntries.mockResolvedValue({ entries });

    const { result } = renderHook(() => useEntryHistory());

    await waitFor(() => expect(result.current.entries).toEqual(entries));
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('llena error y deja entries en [] cuando la llamada falla', async () => {
    mockedListResidentEntries.mockRejectedValue(new Error('Error de red'));

    const { result } = renderHook(() => useEntryHistory());

    await waitFor(() => expect(result.current.error).toBe('Error de red'));
    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
