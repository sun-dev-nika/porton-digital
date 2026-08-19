import { useState } from 'react';

import { createInvitation } from '../api';
import type { Invitation } from '../api';

export interface UseCreateInvitationResult {
  isSubmitting: boolean;
  error: string | null;
  invitation: Invitation | null;
  submit: (visitorName: string, validFrom: string, validUntil: string) => Promise<void>;
}

export function useCreateInvitation(): UseCreateInvitationResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  async function submit(visitorName: string, validFrom: string, validUntil: string): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createInvitation({ visitorName, validFrom, validUntil });
      setInvitation(result.invitation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la invitación');
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, error, invitation, submit };
}
