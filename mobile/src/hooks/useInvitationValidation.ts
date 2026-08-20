import { useState } from 'react';

import { validateInvitationByCode } from '../api';
import type { ValidateInvitationByCodeResponse } from '../api';

export interface UseInvitationValidationResult {
  isLoading: boolean;
  error: string | null;
  result: ValidateInvitationByCodeResponse | null;
  validate: (code: string) => Promise<void>;
  reset: () => void;
}

export function useInvitationValidation(): UseInvitationValidationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidateInvitationByCodeResponse | null>(null);

  async function validate(code: string): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const response = await validateInvitationByCode(code);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al validar la invitación');
    } finally {
      setIsLoading(false);
    }
  }

  function reset(): void {
    setResult(null);
    setError(null);
  }

  return { isLoading, error, result, validate, reset };
}
