import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCreateInvitation } from '../../src/hooks/useCreateInvitation';
import { createInvitation } from '../../src/api';

jest.mock('../../src/api', () => ({
  createInvitation: jest.fn(),
}));

const mockedCreateInvitation = createInvitation as jest.Mock;

describe('useCreateInvitation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('llena invitation con el código recibido cuando la creación resuelve exitosamente', async () => {
    const invitation = {
      id: 1,
      code: 'ABCDEFGHJKMN',
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    };
    mockedCreateInvitation.mockResolvedValue({ invitation });

    const { result } = renderHook(() => useCreateInvitation());

    await act(async () => {
      await result.current.submit(
        'Juan Pérez',
        '2026-01-01T10:00:00.000Z',
        '2026-01-01T12:00:00.000Z',
      );
    });

    await waitFor(() => expect(result.current.invitation).toEqual(invitation));
    expect(result.current.error).toBeNull();
    expect(mockedCreateInvitation).toHaveBeenCalledWith({
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    });
  });

  it('llena error y deja invitation en null cuando la creación falla', async () => {
    mockedCreateInvitation.mockRejectedValue(new Error('validUntil debe ser posterior a validFrom'));

    const { result } = renderHook(() => useCreateInvitation());

    await act(async () => {
      await result.current.submit(
        'Juan Pérez',
        '2026-01-01T12:00:00.000Z',
        '2026-01-01T10:00:00.000Z',
      );
    });

    await waitFor(() =>
      expect(result.current.error).toBe('validUntil debe ser posterior a validFrom'),
    );
    expect(result.current.invitation).toBeNull();
  });
});
