import { useEffect, useState } from 'react';

import { getInvitation } from '../api';
import type { InvitationWithStatus } from '../api';

export interface UseInvitationDetailResult {
  isLoading: boolean;
  error: string | null;
  invitation: InvitationWithStatus | null;
  refetch: () => Promise<void>;
}

export function useInvitationDetail(id: number): UseInvitationDetailResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationWithStatus | null>(null);

  async function fetchInvitation(): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const result = await getInvitation(id);
      setInvitation(result.invitation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener la invitación');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchInvitation();
  }, [id]);

  return { isLoading, error, invitation, refetch: fetchInvitation };
}
