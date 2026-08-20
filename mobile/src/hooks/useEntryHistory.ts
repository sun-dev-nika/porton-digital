import { useEffect, useState } from 'react';

import { listResidentEntries } from '../api';
import type { ResidentEntry } from '../api';

export interface UseEntryHistoryResult {
  isLoading: boolean;
  error: string | null;
  entries: ResidentEntry[];
  refetch: () => Promise<void>;
}

export function useEntryHistory(): UseEntryHistoryResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ResidentEntry[]>([]);

  async function fetchEntries(): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const result = await listResidentEntries();
      setEntries(result.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener el historial de ingresos');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchEntries();
  }, []);

  return { isLoading, error, entries, refetch: fetchEntries };
}
