import { renderHook, waitFor } from '@testing-library/react-native';

import { useInvitations } from '../../src/hooks/useInvitations';
import { listInvitations } from '../../src/api';

jest.mock('../../src/api', () => ({
  listInvitations: jest.fn(),
}));

const mockedListInvitations = listInvitations as jest.Mock;

describe('useInvitations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('llama a listInvitations automáticamente al montar, sin invocar refetch manualmente', async () => {
    mockedListInvitations.mockResolvedValue({ invitations: [] });

    renderHook(() => useInvitations());

    await waitFor(() => expect(mockedListInvitations).toHaveBeenCalledTimes(1));
  });

  it('llena invitations con el array recibido cuando la llamada resuelve exitosamente', async () => {
    const invitations = [
      {
        id: 1,
        code: 'ABCDEFGHJKMN',
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
        status: 'pending',
      },
    ];
    mockedListInvitations.mockResolvedValue({ invitations });

    const { result } = renderHook(() => useInvitations());

    await waitFor(() => expect(result.current.invitations).toEqual(invitations));
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('llena error y deja invitations en [] cuando la llamada falla', async () => {
    mockedListInvitations.mockRejectedValue(new Error('Error de red'));

    const { result } = renderHook(() => useInvitations());

    await waitFor(() => expect(result.current.error).toBe('Error de red'));
    expect(result.current.invitations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
