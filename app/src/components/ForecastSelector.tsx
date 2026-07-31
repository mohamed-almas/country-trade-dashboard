import { ForecastMethod } from '../utils/forecast';

interface ForecastSelectorProps {
  methods: ForecastMethod[];
  selected: ForecastMethod;
  onSelect: (method: ForecastMethod) => void;
  isDark: boolean;
}

export function ForecastSelector({ methods, selected, onSelect, isDark }: ForecastSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Forecast Method
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {methods.map(method => (
          <button
            key={method.name}
            onClick={() => onSelect(method)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              selected.name === method.name
                ? isDark
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-blue-600 bg-blue-50'
                : isDark
                ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{method.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  method.confidence === 'High'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : method.confidence === 'Medium'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {method.confidence}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{method.description}</p>
            <div className="mt-2 text-xs font-semibold text-gray-900 dark:text-gray-100">
              2030 CAGR: {method.cagr.toFixed(1)}%
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
