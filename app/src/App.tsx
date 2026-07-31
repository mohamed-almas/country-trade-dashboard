import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Nav } from './components/Nav';
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
      <BrowserRouter>
        <ThemeProvider>
          <MetricProvider>
            <YearProvider>
              <Nav />
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
            </YearProvider>
          </MetricProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
