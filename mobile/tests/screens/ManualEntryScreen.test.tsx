import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ManualEntryScreen } from '../../src/screens/ManualEntryScreen';
import { createManualEntry } from '../../src/api';

jest.mock('../../src/api', () => ({
  createManualEntry: jest.fn(),
}));

const mockedCreateManualEntry = createManualEntry as jest.Mock;

// El primer render de RNTL en este proceso compila mocks pesados; bajo carga excede el timeout por defecto.
jest.setTimeout(15000);

function fillAndSubmit(visitorName: string, unitLabel: string): ReturnType<typeof render> {
  const view = render(<ManualEntryScreen />);
  fireEvent.changeText(view.getByTestId('manual-entry-visitor-input'), visitorName);
  fireEvent.changeText(view.getByTestId('manual-entry-unit-input'), unitLabel);
  fireEvent.press(view.getByTestId('manual-entry-submit-button'));
  return view;
}

describe('ManualEntryScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renderiza los campos visitorName/unitLabel y el botón de confirmación (R7)', () => {
    const view = render(<ManualEntryScreen />);

    expect(view.getByTestId('manual-entry-visitor-input')).toBeTruthy();
    expect(view.getByTestId('manual-entry-unit-input')).toBeTruthy();
    expect(view.getByTestId('manual-entry-submit-button')).toBeTruthy();
  });

  it('muestra la confirmación tras un submit exitoso (R9)', async () => {
    mockedCreateManualEntry.mockResolvedValue({
      entry: {
        id: 1,
        invitationId: null,
        unitId: 1,
        guardId: 1,
        visitorName: 'Juan Pérez',
        isManual: true,
        enteredAt: '2026-01-02T10:00:00.000Z',
      },
    });

    const view = fillAndSubmit('Juan Pérez', '101');

    await waitFor(() => expect(view.getByTestId('manual-entry-success')).toBeTruthy());
    expect(mockedCreateManualEntry).toHaveBeenCalledWith({
      visitorName: 'Juan Pérez',
      unitLabel: '101',
    });
  });

  it('muestra un error y no muestra la confirmación tras un submit fallido (R10)', async () => {
    mockedCreateManualEntry.mockRejectedValue(new Error('La unidad indicada no existe'));

    const view = fillAndSubmit('Juan Pérez', 'unidad-inexistente');

    await waitFor(() => expect(view.getByTestId('manual-entry-error')).toBeTruthy());
    expect(view.queryByTestId('manual-entry-success')).toBeNull();
  });
});
