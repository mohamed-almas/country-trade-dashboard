export function formatNumber(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return Math.round(value).toLocaleString();
}

export function calculateCAGR(startValue: number, endValue: number, years: number): number | null {
  if (!startValue || !endValue || years <= 0 || startValue <= 0) {
    return null;
  }
  return ((Math.pow(endValue / startValue, 1 / years) - 1) * 100);
}

export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia',
  'Brazil', 'Bulgaria', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China', 'Colombia',
  'Comoros', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark',
  'Dominican Republic', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France',
  'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Honduras', 'Hungary', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Korea, South', 'Kuwait', 'Latvia', 'Lebanon', 'Libya', 'Lithuania',
  'Luxembourg', 'Malaysia', 'Mexico', 'Moldova', 'Morocco', 'Mozambique', 'Myanmar',
  'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Panama',
  'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa',
  'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Tanzania',
  'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States of America', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe'
];

const CONTINENT_MAP: Record<string, string> = {
  'China': 'Asia', 'India': 'Asia', 'Japan': 'Asia', 'Korea, South': 'Asia', 'Indonesia': 'Asia',
  'Malaysia': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia', 'Bangladesh': 'Asia', 'Pakistan': 'Asia',
  'Sri Lanka': 'Asia', 'Singapore': 'Asia', 'Philippines': 'Asia', 'Cambodia': 'Asia', 'Myanmar': 'Asia',
  'Kazakhstan': 'Asia', 'Azerbaijan': 'Asia', 'Uzbekistan': 'Asia', 'Georgia': 'Asia', 'Iran': 'Asia',
  'Iraq': 'Asia', 'Saudi Arabia': 'Asia', 'United Arab Emirates': 'Asia', 'Kuwait': 'Asia', 'Qatar': 'Asia',
  'Oman': 'Asia', 'Bahrain': 'Asia', 'Jordan': 'Asia', 'Lebanon': 'Asia', 'Israel': 'Asia', 'Yemen': 'Asia',
  'Germany': 'Europe', 'France': 'Europe', 'United Kingdom': 'Europe', 'Italy': 'Europe', 'Spain': 'Europe',
  'Netherlands': 'Europe', 'Belgium': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe',
  'Finland': 'Europe', 'Poland': 'Europe', 'Czech Republic': 'Europe', 'Romania': 'Europe', 'Hungary': 'Europe',
  'Portugal': 'Europe', 'Austria': 'Europe', 'Switzerland': 'Europe', 'Slovakia': 'Europe', 'Slovenia': 'Europe',
  'Croatia': 'Europe', 'Bulgaria': 'Europe', 'Lithuania': 'Europe', 'Latvia': 'Europe', 'Estonia': 'Europe',
  'Moldova': 'Europe', 'Serbia': 'Europe', 'Cyprus': 'Europe', 'Luxembourg': 'Europe', 'Belarus': 'Europe',
  'Ukraine': 'Europe', 'Greece': 'Europe', 'Ireland': 'Europe', 'Albania': 'Europe', 'Armenia': 'Europe',
  'United States of America': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
  'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America', 'Colombia': 'South America',
  'Peru': 'South America', 'Venezuela': 'South America', 'Ecuador': 'South America', 'Bolivia': 'South America',
  'Paraguay': 'South America', 'Uruguay': 'South America', 'Cuba': 'South America', 'Costa Rica': 'South America',
  'Panama': 'South America', 'Dominican Republic': 'South America', 'Guatemala': 'South America', 'Honduras': 'South America',
  'Nigeria': 'Africa', 'South Africa': 'Africa', 'Egypt': 'Africa', 'Algeria': 'Africa', 'Morocco': 'Africa',
  'Ethiopia': 'Africa', 'Ghana': 'Africa', 'Senegal': 'Africa', 'Tanzania': 'Africa', 'Kenya': 'Africa',
  'Cameroon': 'Africa', 'Angola': 'Africa', 'Sudan': 'Africa', 'Mozambique': 'Africa', 'Zambia': 'Africa',
  'Zimbabwe': 'Africa', 'Libya': 'Africa', 'Tunisia': 'Africa', 'Uganda': 'Africa',
  'Australia': 'Oceania', 'New Zealand': 'Oceania',
  'Russia': 'Europe', 'Turkey': 'Europe', 'Comoros': 'Africa'
};

export function getContinent(country: string): string {
  return CONTINENT_MAP[country] || 'Other';
}

export function formatPercentage(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export const YEARS = [2020, 2021, 2022, 2023, 2024];
