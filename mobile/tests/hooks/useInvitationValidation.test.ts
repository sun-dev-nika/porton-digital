import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useInvitationValidation } from '../../src/hooks/useInvitationValidation';
import { validateInvitationByCode } from '../../src/api';

jest.mock('../../src/api', () => ({
  validateInvitationByCode: jest.fn(),
}));

const mockedValidateInvitationByCode = validateInvitationByCode as jest.Mock;

describe('useInvitationValidation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('llena result con la respuesta recibida cuando la validación resuelve exitosamente', async () => {
    const response = {
      status: 'valid',
      invitation: {
        id: 1,
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      },
    };
    mockedValidateInvitationByCode.mockResolvedValue(response);

    const { result } = renderHook(() => useInvitationValidation());

    await act(async () => {
      await result.current.validate('CODE1234');
    });

    await waitFor(() => expect(result.current.result).toEqual(response));
    expect(result.current.error).toBeNull();
    expect(mockedValidateInvitationByCode).toHaveBeenCalledWith('CODE1234');
  });

  it('llena result con status not_yet_valid cuando la validación resuelve con ese estado', async () => {
    const response = {
      status: 'not_yet_valid',
      invitation: {
        id: 2,
        visitorName: 'María López',
        validFrom: '2099-01-01T10:00:00.000Z',
        validUntil: '2099-01-01T12:00:00.000Z',
      },
    };
    mockedValidateInvitationByCode.mockResolvedValue(response);

    const { result } = renderHook(() => useInvitationValidation());

    await act(async () => {
      await result.current.validate('CODE5678');
    });

    await waitFor(() => expect(result.current.result).toEqual(response));
  });

  it('llena error y deja result en null cuando la validación falla', async () => {
    mockedValidateInvitationByCode.mockRejectedValue(new Error('Error de red'));

    const { result } = renderHook(() => useInvitationValidation());

    await act(async () => {
      await result.current.validate('CODE9999');
    });

    await waitFor(() => expect(result.current.error).toBe('Error de red'));
    expect(result.current.result).toBeNull();
  });

  it('reset() limpia result y error a null', async () => {
    mockedValidateInvitationByCode.mockResolvedValue({
      status: 'valid',
      invitation: {
        id: 1,
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      },
    });

    const { result } = renderHook(() => useInvitationValidation());

    await act(async () => {
      await result.current.validate('CODE1234');
    });

    await waitFor(() => expect(result.current.result).not.toBeNull());

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
