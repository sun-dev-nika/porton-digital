import { useEffect, useState } from 'react';

import { listTodayEntries } from '../api';
import type { TodayEntry } from '../api';

export interface UseDailyLogResult {
  isLoading: boolean;
  error: string | null;
  entries: TodayEntry[];
  refetch: () => Promise<void>;
}

export function useDailyLog(): UseDailyLogResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TodayEntry[]>([]);

  async function fetchEntries(): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const result = await listTodayEntries();
      setEntries(result.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener el log del día');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchEntries();
  }, []);

  return { isLoading, error, entries, refetch: fetchEntries };
}
