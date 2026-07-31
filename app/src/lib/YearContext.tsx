import { createContext, useContext, useState, ReactNode } from 'react';

interface YearContextValue {
  year: number;
  setYear: (year: number) => void;
}

const YearContext = createContext<YearContextValue>({
  year: 2024,
  setYear: () => {},
});

export function YearProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(2024);

  return (
    <YearContext.Provider value={{ year, setYear }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  return useContext(YearContext);
}
