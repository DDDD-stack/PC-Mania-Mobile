import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from './session';

/**
 * Loads data and exposes loading / pull-to-refresh / error state. Refetches when `deps` change or when
 * the session's dataVersion is bumped (e.g. a new order arrived while this screen was open).
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const { dataVersion } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const run = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    const id = ++requestId.current;
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'initial') setLoading(true);
    try {
      const result = await load();
      if (id === requestId.current) { setData(result); setError(null); }
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : 'Ndodhi një gabim.');
    } finally {
      if (id === requestId.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run('initial'); }, [run]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    run('silent');
  }, [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data, setData, error, loading, refreshing,
    refresh: () => run('refresh'),
    reload: () => run('silent'),
  };
}
