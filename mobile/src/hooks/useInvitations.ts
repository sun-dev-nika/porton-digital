import { useEffect, useState } from 'react';

import { listInvitations } from '../api';
import type { InvitationWithStatus } from '../api';

export interface UseInvitationsResult {
  isLoading: boolean;
  error: string | null;
  invitations: InvitationWithStatus[];
  refetch: () => Promise<void>;
}

export function useInvitations(): UseInvitationsResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<InvitationWithStatus[]>([]);

  async function fetchInvitations(): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const result = await listInvitations();
      setInvitations(result.invitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener las invitaciones');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchInvitations();
  }, []);

  return { isLoading, error, invitations, refetch: fetchInvitations };
}
