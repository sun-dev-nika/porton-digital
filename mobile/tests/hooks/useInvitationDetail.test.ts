import { renderHook, waitFor } from '@testing-library/react-native';

import { useInvitationDetail } from '../../src/hooks/useInvitationDetail';
import { getInvitation } from '../../src/api';

jest.mock('../../src/api', () => ({
  getInvitation: jest.fn(),
}));

const mockedGetInvitation = getInvitation as jest.Mock;

describe('useInvitationDetail', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('llama a getInvitation automáticamente al montar con el id recibido', async () => {
    mockedGetInvitation.mockResolvedValue({
      invitation: {
        id: 7,
        code: 'ABCDEFGHJKMN',
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
        status: 'pending',
      },
    });

    renderHook(() => useInvitationDetail(7));

    await waitFor(() => expect(mockedGetInvitation).toHaveBeenCalledWith(7));
    expect(mockedGetInvitation).toHaveBeenCalledTimes(1);
  });

  it('llena invitation con el objeto recibido cuando la llamada resuelve exitosamente', async () => {
    const invitation = {
      id: 7,
      code: 'ABCDEFGHJKMN',
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
      status: 'pending',
    };
    mockedGetInvitation.mockResolvedValue({ invitation });

    const { result } = renderHook(() => useInvitationDetail(7));

    await waitFor(() => expect(result.current.invitation).toEqual(invitation));
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('llena error y deja invitation en null cuando la llamada falla', async () => {
    mockedGetInvitation.mockRejectedValue(new Error('Error de red'));

    const { result } = renderHook(() => useInvitationDetail(7));

    await waitFor(() => expect(result.current.error).toBe('Error de red'));
    expect(result.current.invitation).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
