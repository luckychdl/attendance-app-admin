import { type DependencyList, useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/api/client';

/**
 * 화면이 뜰 때와 deps 가 바뀔 때 데이터를 읽는다.
 * 다시 읽는 동안에는 이전 데이터를 그대로 보여 준다.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps);

  const reload = useCallback(async () => {
    const turn = ++latest.current;
    setLoading(true);
    try {
      const result = await load();
      if (turn !== latest.current) return;
      setData(result);
      setError(null);
    } catch (caught) {
      if (turn === latest.current) setError(errorMessage(caught));
    } finally {
      if (turn === latest.current) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
