import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

export function parseNotificationInvitationId(data: unknown): string | null {
  if (data === null || typeof data !== 'object') {
    return null;
  }
  const invitationId = (data as Record<string, unknown>).invitationId;
  if (typeof invitationId === 'number' && Number.isFinite(invitationId)) {
    return String(invitationId);
  }
  if (typeof invitationId === 'string' && invitationId.trim().length > 0) {
    return invitationId.trim();
  }
  return null;
}

export function useNotificationDeepLink(): void {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const invitationId = parseNotificationInvitationId(
        response.notification.request.content.data,
      );
      if (invitationId !== null) {
        router.push({ pathname: '/invitationDetail', params: { id: invitationId } });
      }
    });

    // Arranque en frío (R11/R12): la app puede haberse abierto directamente
    // al tocar la notificación mientras estaba completamente cerrada, caso
    // en el que `addNotificationResponseReceivedListener` de arriba nunca
    // se dispara (la interacción ocurrió antes de que este listener
    // existiera). `getLastNotificationResponseAsync()` es el mecanismo de
    // Expo Notifications para recuperar esa interacción una vez la app ya
    // arrancó.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isActive || response === null) {
        return;
      }
      const invitationId = parseNotificationInvitationId(
        response.notification.request.content.data,
      );
      if (invitationId !== null) {
        router.push({ pathname: '/invitationDetail', params: { id: invitationId } });
      }
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [router]);
}
