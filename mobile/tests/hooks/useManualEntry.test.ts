import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useManualEntry } from '../../src/hooks/useManualEntry';
import { createManualEntry } from '../../src/api';

jest.mock('../../src/api', () => ({
  createManualEntry: jest.fn(),
}));

const mockedCreateManualEntry = createManualEntry as jest.Mock;

describe('useManualEntry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('llena entry con el registro recibido cuando la creación resuelve exitosamente (R8, R9)', async () => {
    const entry = {
      id: 1,
      invitationId: null,
      unitId: 1,
      guardId: 1,
      visitorName: 'Juan Pérez',
      isManual: true,
      enteredAt: '2026-01-02T10:00:00.000Z',
    };
    mockedCreateManualEntry.mockResolvedValue({ entry });

    const { result } = renderHook(() => useManualEntry());

    await act(async () => {
      await result.current.submit('Juan Pérez', '101');
    });

    await waitFor(() => expect(result.current.entry).toEqual(entry));
    expect(result.current.error).toBeNull();
    expect(mockedCreateManualEntry).toHaveBeenCalledWith({
      visitorName: 'Juan Pérez',
      unitLabel: '101',
    });
  });

  it('llena error y deja entry en null cuando la creación falla (R10)', async () => {
    mockedCreateManualEntry.mockRejectedValue(new Error('La unidad indicada no existe'));

    const { result } = renderHook(() => useManualEntry());

    await act(async () => {
      await result.current.submit('Juan Pérez', 'unidad-inexistente');
    });

    await waitFor(() => expect(result.current.error).toBe('La unidad indicada no existe'));
    expect(result.current.entry).toBeNull();
  });
});
