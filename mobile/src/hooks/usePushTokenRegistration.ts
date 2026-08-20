import * as Notifications from 'expo-notifications';

import { registerPushToken } from '../api';

export async function registerResidentPushToken(): Promise<void> {
  try {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(expoPushToken);
  } catch {
    // Best-effort (R8): un permiso denegado, un fallo al obtener el token
    // de Expo, o un fallo de red al registrar el token nunca debe
    // propagarse — el login ya concluyó exitosamente y no depende de esto.
  }
}
