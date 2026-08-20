import { useState } from 'react';

import { createManualEntry } from '../api';
import type { Entry } from '../api';

export interface UseManualEntryResult {
  isSubmitting: boolean;
  error: string | null;
  entry: Entry | null;
  submit: (visitorName: string, unitLabel: string) => Promise<void>;
}

export function useManualEntry(): UseManualEntryResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);

  async function submit(visitorName: string, unitLabel: string): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createManualEntry({ visitorName, unitLabel });
      setEntry(result.entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el ingreso manual');
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, error, entry, submit };
}
