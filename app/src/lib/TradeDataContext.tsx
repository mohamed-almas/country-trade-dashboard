import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { rpc } from './supabase';

export type L1CacheKey = 'all' | 2020 | 2021 | 2022 | 2023 | 2024;
export type L1Cache = Record<string, any[]>;

interface TradeDataContextValue {
  l1Cache: L1Cache;
  l1CacheReady: boolean;
}

const TradeDataContext = createContext<TradeDataContextValue>({
  l1Cache: {},
  l1CacheReady: false,
});

export function TradeDataProvider({ children }: { children: ReactNode }) {
  const [l1Cache, setL1Cache] = useState<L1Cache>({});
  const [l1CacheReady, setL1CacheReady] = useState(false);

  useEffect(() => {
    const years: (number | null)[] = [null, 2020, 2021, 2022, 2023, 2024];
    Promise.all(
      years.map((yr) =>
        rpc('get_trade_by_l1', { p_year: yr }).then((data) => ({
          key: yr === null ? 'all' : String(yr),
          data,
        }))
      )
    ).then((results) => {
      const cache: L1Cache = {};
      for (const { key, data } of results) {
        cache[key] = data as any[];
      }
      setL1Cache(cache);
      setL1CacheReady(true);
    }).catch((err) => {
      console.error('Failed to prefetch L1 cache:', err);
      setL1CacheReady(true);
    });
  }, []);

  return (
    <TradeDataContext.Provider value={{ l1Cache, l1CacheReady }}>
      {children}
    </TradeDataContext.Provider>
  );
}

export function useTradeDataContext() {
  return useContext(TradeDataContext);
}

export function getCacheKey(selectedYear: number | 'all'): string {
  return selectedYear === 'all' ? 'all' : String(selectedYear);
}
