import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { listStorySeeds, type StorySeedRecord } from '../shared/storySeedRepository';

interface StoryBankRecordsState {
  records: StorySeedRecord[];
  setRecords: Dispatch<SetStateAction<StorySeedRecord[]>>;
  isLoading: boolean;
  loadError: string | null;
  reload: () => void;
}

/**
 * Owns the Story Bank list lifecycle, including owner changes, stale request
 * cancellation, a distinct loading error, and an explicit retry boundary.
 * Loading is deferred until the owning Story Bank view has been requested.
 */
export const useStoryBankRecords = (
  ownerId: string | null,
  enabled = true,
): StoryBankRecordsState => {
  const [records, setRecords] = useState<StorySeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const reload = useCallback(() => setReloadVersion(version => version + 1), []);

  useEffect(() => {
    if (!ownerId || !enabled) {
      setRecords([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setLoadError(null);
    setIsLoading(true);
    listStorySeeds(ownerId)
      .then(nextRecords => {
        if (!cancelled) setRecords(nextRecords);
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Failed to load account story seeds:', error);
        setLoadError(error instanceof Error
          ? error.message
          : 'Your saved Story Seeds could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, ownerId, reloadVersion]);

  return { records, setRecords, isLoading, loadError, reload };
};
