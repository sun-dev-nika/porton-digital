import { Text, View } from 'react-native';

import { useInvitations } from '../hooks/useInvitations';

export function InvitationsListScreen(): JSX.Element {
  const { isLoading, error, invitations } = useInvitations();

  return (
    <View>
      {isLoading ? <Text testID="invitations-loading">Cargando...</Text> : null}
      {error !== null ? <Text testID="invitations-error">{error}</Text> : null}
      {error === null
        ? invitations.map((invitation) => (
            <View key={invitation.id} testID={`invitation-item-${invitation.id}`}>
              <Text testID={`invitation-visitor-${invitation.id}`}>{invitation.visitorName}</Text>
              <Text testID={`invitation-status-${invitation.id}`}>{invitation.status}</Text>
            </View>
          ))
        : null}
    </View>
  );
}
