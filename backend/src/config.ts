// Secreto de desarrollo; en producción se debe fijar JWT_SECRET vía variable de entorno.
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-insecure-jwt-secret-change-in-production';
export const JWT_EXPIRES_IN = '12h';

export const DEFAULT_EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

export function getExpoPushApiUrl(): string {
  return process.env.EXPO_PUSH_API_URL ?? DEFAULT_EXPO_PUSH_API_URL;
}
