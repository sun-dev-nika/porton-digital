import { Stack } from 'expo-router';

export default function GuardLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
