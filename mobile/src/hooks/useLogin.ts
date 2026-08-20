import { useRouter } from 'expo-router';
import { useState } from 'react';

import { login } from '../api';
import type { UserRole } from '../api';
import { registerResidentPushToken } from './usePushTokenRegistration';

export function getRoleHomeRoute(role: UserRole): string {
  return role === 'resident' ? '/residentHome' : '/guardHome';
}

export interface UseLoginResult {
  isSubmitting: boolean;
  error: string | null;
  submit: (email: string, password: string) => Promise<void>;
}

export function useLogin(): UseLoginResult {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(email: string, password: string): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      const { user } = await login(email, password);
      if (user.role === 'resident') {
        void registerResidentPushToken();
      }
      router.replace(getRoleHomeRoute(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, error, submit };
}
