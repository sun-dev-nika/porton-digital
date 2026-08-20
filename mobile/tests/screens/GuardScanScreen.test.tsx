import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { GuardScanScreen } from '../../src/screens/GuardScanScreen';
import { validateInvitationByCode } from '../../src/api';

jest.mock('../../src/api', () => ({
  validateInvitationByCode: jest.fn(),
}));

type BarcodeCallback = (result: { data: string }) => void;

let latestOnBarcodeScanned: BarcodeCallback | null = null;
let mockPermission: { granted: boolean } | null = { granted: true };
const mockRequestPermission = jest.fn();

jest.mock('expo-camera', () => {
  const { Pressable, Text: MockText } = jest.requireActual('react-native');
  return {
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
    CameraView: (props: { testID: string; onBarcodeScanned: BarcodeCallback }) => {
      latestOnBarcodeScanned = props.onBarcodeScanned;
      return (
        <Pressable
          testID={props.testID}
          onPress={() => props.onBarcodeScanned({ data: 'CODE-DE-PRUEBA' })}
        >
          <MockText>camera</MockText>
        </Pressable>
      );
    },
  };
});

const mockedValidateInvitationByCode = validateInvitationByCode as jest.Mock;

// El primer render de RNTL en este proceso compila mocks pesados; bajo carga excede el timeout por defecto.
jest.setTimeout(15000);

describe('GuardScanScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPermission = { granted: true };
    latestOnBarcodeScanned = null;
  });

  it('sin permiso otorgado, muestra guard-scan-permission-denied y no guard-scan-camera', () => {
    mockPermission = null;

    const view = render(<GuardScanScreen />);

    expect(view.getByTestId('guard-scan-permission-denied')).toBeTruthy();
    expect(view.queryByTestId('guard-scan-camera')).toBeNull();
  });

  it('con permiso otorgado, muestra guard-scan-camera', () => {
    const view = render(<GuardScanScreen />);

    expect(view.getByTestId('guard-scan-camera')).toBeTruthy();
  });

  it('al escanear una vez, llama a validateInvitationByCode con el data simulado', async () => {
    mockedValidateInvitationByCode.mockResolvedValue({ status: 'valid', invitation: null });

    const view = render(<GuardScanScreen />);
    fireEvent.press(view.getByTestId('guard-scan-camera'));

    await waitFor(() =>
      expect(mockedValidateInvitationByCode).toHaveBeenCalledWith('CODE-DE-PRUEBA'),
    );
    expect(mockedValidateInvitationByCode).toHaveBeenCalledTimes(1);
  });

  it('un segundo escaneo simulado del mismo frame (misma referencia de onBarcodeScanned invocada dos veces) no añade una segunda llamada', async () => {
    mockedValidateInvitationByCode.mockResolvedValue({ status: 'valid', invitation: null });

    const view = render(<GuardScanScreen />);
    fireEvent.press(view.getByTestId('guard-scan-camera'));

    await waitFor(() => expect(mockedValidateInvitationByCode).toHaveBeenCalledTimes(1));

    // Tras el primer escaneo, CameraView deja de renderizarse (hasScanned pasa a true).
    expect(view.queryByTestId('guard-scan-camera')).toBeNull();

    // Se invoca directamente la MISMA referencia de onBarcodeScanned capturada
    // en el único render de CameraView, simulando que expo-camera reporta una
    // segunda lectura del mismo frame antes de que React desmonte la cámara.
    const capturedRef = latestOnBarcodeScanned;
    expect(capturedRef).not.toBeNull();
    capturedRef!({ data: 'CODE-DE-PRUEBA' });

    expect(mockedValidateInvitationByCode).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['valid', { status: 'valid', invitation: null }],
    ['not_yet_valid', { status: 'not_yet_valid', invitation: null }],
    ['used', { status: 'used', invitation: null }],
    ['expired', { status: 'expired', invitation: null }],
    ['not_found', { status: 'not_found', invitation: null }],
  ] as const)(
    'con status %s, muestra exactamente guard-scan-result-<status> y ningún otro',
    async (status, response) => {
      mockedValidateInvitationByCode.mockResolvedValue(response);

      const view = render(<GuardScanScreen />);
      fireEvent.press(view.getByTestId('guard-scan-camera'));

      await waitFor(() => expect(view.getByTestId(`guard-scan-result-${status}`)).toBeTruthy());

      const otherStatuses = ['valid', 'not_yet_valid', 'used', 'expired', 'not_found'].filter(
        (candidate) => candidate !== status,
      );
      for (const other of otherStatuses) {
        expect(view.queryByTestId(`guard-scan-result-${other}`)).toBeNull();
      }
    },
  );

  it('con validateInvitationByCode rechazado, muestra guard-scan-error y ningún guard-scan-result-*', async () => {
    mockedValidateInvitationByCode.mockRejectedValue(new Error('Error de red'));

    const view = render(<GuardScanScreen />);
    fireEvent.press(view.getByTestId('guard-scan-camera'));

    await waitFor(() => expect(view.getByTestId('guard-scan-error')).toBeTruthy());

    for (const status of ['valid', 'not_yet_valid', 'used', 'expired', 'not_found']) {
      expect(view.queryByTestId(`guard-scan-result-${status}`)).toBeNull();
    }
  });

  it('al presionar guard-scan-again-button tras un resultado, guard-scan-camera vuelve a aparecer y el resultado previo desaparece', async () => {
    mockedValidateInvitationByCode.mockResolvedValue({ status: 'valid', invitation: null });

    const view = render(<GuardScanScreen />);
    fireEvent.press(view.getByTestId('guard-scan-camera'));

    await waitFor(() => expect(view.getByTestId('guard-scan-result-valid')).toBeTruthy());

    fireEvent.press(view.getByTestId('guard-scan-again-button'));

    expect(view.getByTestId('guard-scan-camera')).toBeTruthy();
    expect(view.queryByTestId('guard-scan-result-valid')).toBeNull();
  });

  it('tras "Escanear de nuevo", un nuevo escaneo vuelve a llamar a validateInvitationByCode (el guard hasScannedRef también se resetea)', async () => {
    mockedValidateInvitationByCode.mockResolvedValue({ status: 'valid', invitation: null });

    const view = render(<GuardScanScreen />);
    fireEvent.press(view.getByTestId('guard-scan-camera'));

    await waitFor(() => expect(mockedValidateInvitationByCode).toHaveBeenCalledTimes(1));

    fireEvent.press(view.getByTestId('guard-scan-again-button'));
    fireEvent.press(view.getByTestId('guard-scan-camera'));

    await waitFor(() => expect(mockedValidateInvitationByCode).toHaveBeenCalledTimes(2));
  });
});
