import { request } from './client';
import { clearToken, saveToken } from './tokenStorage';
import type { LoginResponse } from './types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  await saveToken(result.token);

  return result;
}

export async function logout(): Promise<void> {
  await clearToken();
}
