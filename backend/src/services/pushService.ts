import { getExpoPushApiUrl } from '../config';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushSendResult {
  ok: boolean;
}

export async function sendExpoPushNotification(
  message: ExpoPushMessage,
  baseUrl: string = getExpoPushApiUrl(),
): Promise<PushSendResult> {
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify([message]),
    });

    if (!response.ok) {
      return { ok: false };
    }

    const payload = (await response.json()) as { data?: Array<{ status?: string }> };
    return { ok: payload.data?.[0]?.status === 'ok' };
  } catch {
    return { ok: false };
  }
}
