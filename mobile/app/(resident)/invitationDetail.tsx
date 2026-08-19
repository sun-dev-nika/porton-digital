import { useLocalSearchParams } from 'expo-router';

import { InvitationDetailScreen } from '../../src/screens/InvitationDetailScreen';

export default function InvitationDetail(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InvitationDetailScreen invitationId={Number(id)} />;
}
