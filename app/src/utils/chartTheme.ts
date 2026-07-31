export function getChartTheme(isDark: boolean) {
  return {
    gridStroke: isDark ? '#1E2D45' : '#C8D3E0',
    axisStroke: isDark ? '#4A6280' : '#8BA0B8',
    tooltipBg: isDark ? '#0D1829' : '#FFFFFF',
    tooltipBorder: isDark ? '#1E2D45' : '#C8D3E0',
    tooltipColor: isDark ? '#F0F4F8' : '#0F1E33',
    barFill: isDark ? '#2E8B8B' : '#1A7070',
    barFill2: isDark ? '#4A8BBB' : '#1A5A8A',
    lineFill: isDark ? '#CC274C' : '#CC274C',
    greenLine: isDark ? '#4ADE80' : '#15803D',
    amberLine: isDark ? '#FCD34D' : '#D97706',
    grayBar: isDark ? '#4A6280' : '#8BA0B8',
  };
}
