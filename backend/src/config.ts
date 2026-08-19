// Secreto de desarrollo; en producción se debe fijar JWT_SECRET vía variable de entorno.
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-insecure-jwt-secret-change-in-production';
export const JWT_EXPIRES_IN = '12h';
