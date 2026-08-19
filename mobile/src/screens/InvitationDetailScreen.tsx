import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useInvitationDetail } from '../hooks/useInvitationDetail';

export interface InvitationDetailScreenProps {
  invitationId: number;
}

export function InvitationDetailScreen({
  invitationId,
}: InvitationDetailScreenProps): JSX.Element {
  const { isLoading, error, invitation } = useInvitationDetail(invitationId);

  return (
    <View>
      {isLoading ? <Text testID="invitation-detail-loading">Cargando...</Text> : null}
      {error !== null ? <Text testID="invitation-detail-error">{error}</Text> : null}
      {error === null && invitation !== null ? (
        <View>
          <Text testID="invitation-detail-visitor">{invitation.visitorName}</Text>
          <Text testID="invitation-detail-valid-from">{invitation.validFrom}</Text>
          <Text testID="invitation-detail-valid-until">{invitation.validUntil}</Text>
          <View testID="invitation-qr">
            {/* react-native-qrcode-svg: evita tanto una llamada de red a un servicio
               externo de generación de QR como una implementación manual de
               codificación QR (ver design.md) */}
            <QRCode value={invitation.code} size={200} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
