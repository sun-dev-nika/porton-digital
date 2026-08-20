import { request } from './client';
import type { RegisterPushTokenInput, RegisterPushTokenResponse } from './types';

export function registerPushToken(pushToken: string): Promise<RegisterPushTokenResponse> {
  const body: RegisterPushTokenInput = { pushToken };
  return request<RegisterPushTokenResponse>('/residents/me/push-token', {
    method: 'POST',
    body,
  });
}
