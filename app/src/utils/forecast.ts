export interface ForecastPoint {
  year: number;
  value: number;
}

export interface ForecastMethod {
  name: string;
  description: string;
  forecasts: ForecastPoint[];
  value2030: number;
  cagr: number;
  confidence: 'Low' | 'Medium' | 'High';
}

function calculateCAGR(startValue: number, endValue: number, periods: number): number {
  if (startValue <= 0 || endValue <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / periods) - 1) * 100;
}

export function linearTrend(historicalData: ForecastPoint[]): ForecastMethod {
  const n = historicalData.length;
  const years = historicalData.map(d => d.year);
  const values = historicalData.map(d => d.value);

  const sumX = years.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = years.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = years.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const forecasts: ForecastPoint[] = [];
  for (let year = 2025; year <= 2030; year++) {
    forecasts.push({
      year,
      value: Math.max(0, slope * year + intercept)
    });
  }

  const lastHistorical = historicalData[historicalData.length - 1].value;
  const value2030 = forecasts[forecasts.length - 1].value;
  const cagr = calculateCAGR(lastHistorical, value2030, 6);

  return {
    name: 'Linear Trend (OLS)',
    description: 'Ordinary Least Squares regression on all available years',
    forecasts,
    value2030,
    cagr,
    confidence: 'Medium'
  };
}

export function cagrThreeYear(historicalData: ForecastPoint[]): ForecastMethod {
  const last3Years = historicalData.slice(-3);
  const startValue = last3Years[0].value;
  const endValue = last3Years[last3Years.length - 1].value;
  const cagr3 = calculateCAGR(startValue, endValue, 2) / 100;

  const lastYear = historicalData[historicalData.length - 1];
  const forecasts: ForecastPoint[] = [];

  for (let i = 1; i <= 6; i++) {
    forecasts.push({
      year: lastYear.year + i,
      value: lastYear.value * Math.pow(1 + cagr3, i)
    });
  }

  const value2030 = forecasts[forecasts.length - 1].value;
  const cagr = calculateCAGR(lastYear.value, value2030, 6);

  return {
    name: 'CAGR · 3-Year Base',
    description: 'Compound annual growth rate from last 3 years',
    forecasts,
    value2030,
    cagr,
    confidence: 'High'
  };
}

export function cagrSevenYear(historicalData: ForecastPoint[]): ForecastMethod {
  const startValue = historicalData[0].value;
  const endValue = historicalData[historicalData.length - 1].value;
  const years = historicalData.length - 1;
  const cagr7 = calculateCAGR(startValue, endValue, years) / 100;

  const lastYear = historicalData[historicalData.length - 1];
  const forecasts: ForecastPoint[] = [];

  for (let i = 1; i <= 6; i++) {
    forecasts.push({
      year: lastYear.year + i,
      value: lastYear.value * Math.pow(1 + cagr7, i)
    });
  }

  const value2030 = forecasts[forecasts.length - 1].value;
  const cagr = calculateCAGR(lastYear.value, value2030, 6);

  return {
    name: 'CAGR · 7-Year Base',
    description: 'Compound annual growth rate from all available years (2018 base)',
    forecasts,
    value2030,
    cagr,
    confidence: 'Medium'
  };
}

export function holtsExponential(historicalData: ForecastPoint[]): ForecastMethod {
  const alpha = 0.4;
  const beta = 0.2;

  let level = historicalData[0].value;
  let trend = historicalData[1].value - historicalData[0].value;

  for (let i = 1; i < historicalData.length; i++) {
    const prevLevel = level;
    level = alpha * historicalData[i].value + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const forecasts: ForecastPoint[] = [];
  const lastYear = historicalData[historicalData.length - 1];

  for (let i = 1; i <= 6; i++) {
    forecasts.push({
      year: lastYear.year + i,
      value: Math.max(0, level + i * trend)
    });
  }

  const value2030 = forecasts[forecasts.length - 1].value;
  const cagr = calculateCAGR(lastYear.value, value2030, 6);

  return {
    name: "Holt's Exponential",
    description: 'Double exponential smoothing (α=0.4, β=0.2)',
    forecasts,
    value2030,
    cagr,
    confidence: 'Medium'
  };
}

export function movingAverageTrend(historicalData: ForecastPoint[]): ForecastMethod {
  const last3 = historicalData.slice(-3);
  const ma = last3.reduce((sum, d) => sum + d.value, 0) / 3;

  const trendSlope = (last3[2].value - last3[0].value) / 2;

  const forecasts: ForecastPoint[] = [];
  const lastYear = historicalData[historicalData.length - 1];

  for (let i = 1; i <= 6; i++) {
    forecasts.push({
      year: lastYear.year + i,
      value: Math.max(0, ma + trendSlope * i)
    });
  }

  const value2030 = forecasts[forecasts.length - 1].value;
  const cagr = calculateCAGR(lastYear.value, value2030, 6);

  return {
    name: 'Moving Average Trend',
    description: '3-year moving average projected linearly',
    forecasts,
    value2030,
    cagr,
    confidence: 'Low'
  };
}

export function generateAllForecasts(historicalData: ForecastPoint[]): ForecastMethod[] {
  if (historicalData.length < 3) return [];

  return [
    linearTrend(historicalData),
    cagrThreeYear(historicalData),
    cagrSevenYear(historicalData),
    holtsExponential(historicalData),
    movingAverageTrend(historicalData)
  ];
}
