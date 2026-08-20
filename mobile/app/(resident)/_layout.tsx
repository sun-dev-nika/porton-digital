import { Stack } from 'expo-router';

import { useNotificationDeepLink } from '../../src/hooks/useNotificationDeepLink';

export default function ResidentLayout(): JSX.Element {
  useNotificationDeepLink();
  return <Stack screenOptions={{ headerShown: false }} />;
}
