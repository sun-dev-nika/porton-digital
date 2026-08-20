import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export function GuardHomeScreen(): JSX.Element {
  const router = useRouter();

  return (
    <View>
      <Text testID="guard-home-title">Panel de guardia</Text>
      <Pressable testID="guard-home-scan-button" onPress={() => router.push('/scan')}>
        <Text>Escanear QR</Text>
      </Pressable>
    </View>
  );
}
