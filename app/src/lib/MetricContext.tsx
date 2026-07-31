import { createContext, useContext, useState, ReactNode } from 'react';

type Metric = 'value' | 'volume';

interface MetricContextValue {
  metric: Metric;
  setMetric: (m: Metric) => void;
}

const MetricContext = createContext<MetricContextValue>({ metric: 'value', setMetric: () => {} });

export function MetricProvider({ children }: { children: ReactNode }) {
  const [metric, setMetric] = useState<Metric>('value');
  return (
    <MetricContext.Provider value={{ metric, setMetric }}>
      {children}
    </MetricContext.Provider>
  );
}

export function useMetric() {
  return useContext(MetricContext);
}
