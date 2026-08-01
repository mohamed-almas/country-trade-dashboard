import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './lib/ThemeContext';
import { MetricProvider } from './lib/MetricContext';
import { YearProvider } from './lib/YearContext';
import { GlobalDashboard } from './pages/GlobalDashboard';
import { RegionDashboard } from './pages/RegionDashboard';
import CountryPage from './pages/CountryPage';
import { CommodityDashboard } from './pages/CommodityDashboard';
import { BilateralDashboard } from './pages/BilateralDashboard';
import { DollarPerTonDashboard } from './pages/DollarPerTonDashboard';
import { TradeNewsPage } from './pages/TradeNewsPage';
import { ReferencesNewPage } from './pages/ReferencesNewPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ThemeProvider>
          <MetricProvider>
            <YearProvider>
              <div className="flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <Sidebar />
                <div className="flex-1 min-w-0">
                  <Routes>
                    <Route path="/" element={<GlobalDashboard />} />
                    <Route path="/region" element={<RegionDashboard />} />
                    <Route path="/country" element={<CountryPage />} />
                    <Route path="/commodity" element={<CommodityDashboard />} />
                    <Route path="/bilateral" element={<BilateralDashboard />} />
                    <Route path="/dollar-per-ton" element={<DollarPerTonDashboard />} />
                    <Route path="/news" element={<TradeNewsPage />} />
                    <Route path="/references" element={<ReferencesNewPage />} />
                  </Routes>
                </div>
              </div>
            </YearProvider>
          </MetricProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
