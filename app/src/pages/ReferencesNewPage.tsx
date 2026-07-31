import { useTheme } from '../lib/ThemeContext';
import { BookOpen, TrendingUp, Calculator, Database, BarChart3 } from 'lucide-react';

export function ReferencesNewPage() {
  const { isDark } = useTheme();

  const forecastMethods = [
    {
      name: 'Linear Trend (OLS)',
      description: 'Ordinary Least Squares regression applied to all available historical data points.',
      formula: 'y = mx + b',
      useCase: 'Best for data with consistent linear trends over time',
      confidence: 'Medium',
      icon: <TrendingUp className="w-6 h-6" />
    },
    {
      name: 'CAGR · 3-Year Base',
      description: 'Compound Annual Growth Rate calculated from the most recent 3 years of data.',
      formula: 'CAGR = (End Value / Start Value)^(1/n) - 1',
      useCase: 'Best for capturing recent growth momentum and short-term trends',
      confidence: 'High',
      icon: <Calculator className="w-6 h-6" />
    },
    {
      name: 'CAGR · 7-Year Base',
      description: 'Compound Annual Growth Rate calculated from all available years (2018 baseline).',
      formula: 'CAGR = (End Value / Start Value)^(1/n) - 1',
      useCase: 'Best for long-term trend analysis and smoothing short-term volatility',
      confidence: 'Medium',
      icon: <Calculator className="w-6 h-6" />
    },
    {
      name: "Holt's Exponential Smoothing",
      description: 'Double exponential smoothing method that accounts for both level and trend components.',
      formula: 'Lt = αYt + (1-α)(Lt-1 + Tt-1); Tt = β(Lt - Lt-1) + (1-β)Tt-1',
      useCase: 'Best for data with trends but without seasonal patterns',
      confidence: 'Medium',
      icon: <BarChart3 className="w-6 h-6" />
    },
    {
      name: 'Moving Average Trend',
      description: '3-year moving average with linear trend projection.',
      formula: 'MA = (Y1 + Y2 + Y3) / 3; Trend = (Y3 - Y1) / 2',
      useCase: 'Best for smoothing short-term fluctuations and identifying direction',
      confidence: 'Low',
      icon: <BarChart3 className="w-6 h-6" />
    }
  ];

  const dataSources = [
    {
      name: 'BACI Database',
      provider: 'CEPII (Centre d\'Études Prospectives et d\'Informations Internationales)',
      description: 'High-quality bilateral trade data at the product level (HS6 classification)',
      coverage: '2018-2024',
      url: 'http://www.cepii.fr/CEPII/en/bdd_modele/bdd.asp'
    },
    {
      name: 'UN Comtrade',
      provider: 'United Nations Statistics Division',
      description: 'Official international trade statistics database',
      coverage: 'Global coverage, monthly updates',
      url: 'https://comtrade.un.org/'
    },
    {
      name: 'World Bank Data',
      provider: 'World Bank Group',
      description: 'Trade indicators, economic data, and development statistics',
      coverage: 'Global, annual and quarterly',
      url: 'https://data.worldbank.org/'
    },
    {
      name: 'WTO Statistics',
      provider: 'World Trade Organization',
      description: 'Trade policy, tariffs, and global trade flow statistics',
      coverage: 'Global, quarterly updates',
      url: 'https://www.wto.org/english/res_e/statis_e/statis_e.htm'
    }
  ];

  const methodologies = [
    {
      title: 'Data Aggregation',
      description: 'Trade data is pre-aggregated at multiple levels (global, regional, country, commodity, bilateral) to optimize query performance and provide fast dashboard load times.'
    },
    {
      title: 'Volume/Value Toggle',
      description: 'All visualizations support switching between trade value (USD) and trade volume (tons/units) to provide different perspectives on trade flows.'
    },
    {
      title: 'Donut Chart Convention',
      description: 'All donut charts start at 12 o\'clock position, display data ranked from highest to lowest, include "Others" category for items beyond top 10, and show total value in center.'
    },
    {
      title: 'Number Formatting',
      description: 'Values >1K shown as x.xK, >1M as x.xMn, >1B as x.xBn, >1T as x.xTn. Percentages displayed as x.x%. Ensures readability across all scales.'
    },
    {
      title: 'Growth Calculations',
      description: 'YoY growth calculated as ((Current - Previous) / Previous) × 100. CAGR uses compound formula: (End/Start)^(1/years) - 1.'
    },
    {
      title: 'Regional Classification',
      description: 'Countries grouped into regions based on geographic proximity and economic integration (e.g., Europe, Asia-Pacific, Americas, Africa, Middle East).'
    }
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">References & Methodology</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forecast Methods</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          The dashboard employs five distinct forecasting methodologies to project trade flows through 2030.
          Each method has different strengths and is suited for different data patterns.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {forecastMethods.map((method, index) => (
            <div
              key={index}
              className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  {method.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{method.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded font-semibold ${
                        method.confidence === 'High'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : method.confidence === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {method.confidence} Confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{method.description}</p>
                  <code className="block text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded mb-2 font-mono text-gray-800 dark:text-gray-200">
                    {method.formula}
                  </code>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Use Case:</strong> {method.useCase}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Sources</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          This dashboard leverages authoritative international trade databases and economic indicators
          from leading global institutions.
        </p>

        <div className="space-y-4">
          {dataSources.map((source, index) => (
            <div
              key={index}
              className="border-l-4 border-blue-600 dark:border-blue-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-r-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{source.name}</h3>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{source.provider}</p>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                  {source.coverage}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{source.description}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {source.url}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Methodology</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Key methodological approaches and conventions used throughout the dashboard.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {methodologies.map((item, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Additional Notes</h2>
        <div className="prose dark:prose-invert max-w-none">
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Data Frequency:</strong> All data is updated annually. Historical coverage spans 2018-2024 with forecasts extending to 2030.
            </li>
            <li>
              <strong>Currency:</strong> All monetary values are expressed in US Dollars (USD) unless otherwise specified.
            </li>
            <li>
              <strong>Classification:</strong> Commodities follow Harmonized System (HS) classification at Level 1 (sections) and Level 2 (chapters).
            </li>
            <li>
              <strong>Regional Definitions:</strong> Regional groupings may vary by data source; this dashboard uses standardized geographic regions for consistency.
            </li>
            <li>
              <strong>Performance:</strong> All queries use pre-aggregated tables to ensure sub-second load times regardless of data volume.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
