import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useInvitationValidation } from '../hooks/useInvitationValidation';

interface BarcodeScanningResult {
  data: string;
}

export function GuardScanScreen(): JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const hasScannedRef = useRef(false);
  const { isLoading, error, result, validate, reset } = useInvitationValidation();

  function handleBarcodeScanned({ data }: BarcodeScanningResult): void {
    if (hasScannedRef.current) {
      return;
    }
    hasScannedRef.current = true;
    setHasScanned(true);
    void validate(data);
  }

  function handleScanAgain(): void {
    hasScannedRef.current = false;
    setHasScanned(false);
    reset();
  }

  if (!permission || !permission.granted) {
    return (
      <View>
        <Text testID="guard-scan-permission-denied">
          Se requiere acceso a la cámara para escanear
        </Text>
        <Pressable testID="guard-scan-request-permission" onPress={requestPermission}>
          <Text>Solicitar permiso</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      {!hasScanned ? (
        <CameraView
          testID="guard-scan-camera"
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : null}
      {isLoading ? <Text testID="guard-scan-loading">Validando...</Text> : null}
      {error !== null ? <Text testID="guard-scan-error">{error}</Text> : null}
      {result !== null ? (
        <View testID={`guard-scan-result-${result.status}`}>
          <Text testID="guard-scan-status-label">{result.status}</Text>
        </View>
      ) : null}
      {hasScanned ? (
        <Pressable testID="guard-scan-again-button" onPress={handleScanAgain}>
          <Text>Escanear de nuevo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
