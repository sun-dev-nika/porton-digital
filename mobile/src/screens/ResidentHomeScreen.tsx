import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export function ResidentHomeScreen(): JSX.Element {
  const router = useRouter();

  return (
    <View>
      <Text testID="resident-home-title">Panel de residente</Text>
      <Pressable
        testID="resident-home-create-invitation-button"
        onPress={() => router.push('/createInvitation')}
      >
        <Text>Crear invitación</Text>
      </Pressable>
      <Pressable
        testID="resident-home-invitations-button"
        onPress={() => router.push('/invitations')}
      >
        <Text>Mis invitaciones</Text>
      </Pressable>
      <Pressable
        testID="resident-home-entry-history-button"
        onPress={() => router.push('/entryHistory')}
      >
        <Text>Historial de ingresos</Text>
      </Pressable>
    </View>
  );
}
