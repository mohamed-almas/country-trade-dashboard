import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useTradeTrends(limit: number = 25) {
  return useQuery({
    queryKey: ['tradeTrends', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_global_aggregates')
        .select('year, total_value, total_volume, value_yoy_growth, volume_yoy_growth')
        .order('year', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useDistinctCountries() {
  return useQuery({
    queryKey: ['distinctCountries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_countries_list')
        .select('country')
        .order('country');
      if (error) throw error;
      return data as { country: string }[];
    },
  });
}

export function useTopExporters(year: number, limit: number = 10) {
  return useQuery({
    queryKey: ['topExporters', year, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_top_trade_partners')
        .select('country, total_value, total_volume, rank')
        .eq('year', year)
        .eq('role', 'exporter')
        .order('rank', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useTopImporters(year: number, limit: number = 10) {
  return useQuery({
    queryKey: ['topImporters', year, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_top_trade_partners')
        .select('country, total_value, total_volume, rank')
        .eq('year', year)
        .eq('role', 'importer')
        .order('rank', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useTradeByL1(year: number) {
  return useQuery({
    queryKey: ['tradeByL1', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('commodity_l1, total_value, total_volume')
        .eq('year', year);
      if (error) throw error;

      // Group by L1 and sum values
      const grouped = data?.reduce((acc: any[], item: any) => {
        const existing = acc.find(x => x.commodity_l1 === item.commodity_l1);
        if (existing) {
          existing.total_value += item.total_value;
          existing.total_volume += item.total_volume;
        } else {
          acc.push({
            commodity_l1: item.commodity_l1,
            total_value: item.total_value,
            total_volume: item.total_volume,
          });
        }
        return acc;
      }, []);

      return grouped;
    },
  });
}

export function useCommodityList() {
  return useQuery({
    queryKey: ['commodityList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('commodity_l1, commodity_l2')
        .order('commodity_l1')
        .order('commodity_l2');
      if (error) throw error;

      // Get unique combinations
      const unique = data?.filter((item, index, self) =>
        index === self.findIndex(t => t.commodity_l1 === item.commodity_l1 && t.commodity_l2 === item.commodity_l2)
      );

      return unique;
    },
  });
}

export function useCommodityByYear(level2: string) {
  return useQuery({
    queryKey: ['commodityByYear', level2],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('year, total_value, total_volume')
        .eq('commodity_l2', level2)
        .order('year', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!level2,
  });
}

export function useCommodityExporters(level2: string, year: number, limit: number = 10) {
  return useQuery({
    queryKey: ['commodityExporters', level2, year, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baci_trade_named')
        .select('exporter, value, volume')
        .eq('commodity_l2', level2)
        .eq('year', year)
        .order('value', { ascending: false })
        .limit(limit);
      if (error) throw error;

      // Group by exporter and sum
      const grouped = data?.reduce((acc: any[], item: any) => {
        const existing = acc.find(x => x.exporter === item.exporter);
        if (existing) {
          existing.value += item.value;
          existing.volume += item.volume;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, []);

      return grouped?.sort((a, b) => b.value - a.value).slice(0, limit);
    },
    enabled: !!level2,
  });
}

export function useCommodityImporters(level2: string, year: number, limit: number = 10) {
  return useQuery({
    queryKey: ['commodityImporters', level2, year, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baci_trade_named')
        .select('importer, value, volume')
        .eq('commodity_l2', level2)
        .eq('year', year)
        .order('value', { ascending: false })
        .limit(limit);
      if (error) throw error;

      // Group by importer and sum
      const grouped = data?.reduce((acc: any[], item: any) => {
        const existing = acc.find(x => x.importer === item.importer);
        if (existing) {
          existing.value += item.value;
          existing.volume += item.volume;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, []);

      return grouped?.sort((a, b) => b.value - a.value).slice(0, limit);
    },
    enabled: !!level2,
  });
}

export function useCountryByYear(country: string) {
  return useQuery({
    queryKey: ['countryByYear', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_country_aggregates')
        .select('year, export_value, export_volume, import_value, import_volume, trade_balance')
        .eq('country', country)
        .order('year', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!country,
  });
}

export function useCountryPartners(country: string, year: number, limit: number = 10) {
  return useQuery({
    queryKey: ['countryPartners', country, year, limit],
    queryFn: async () => {
      const { data: exports, error: exportsError } = await supabase
        .from('mv_bilateral_aggregates')
        .select('importer as partner, total_value, total_volume')
        .eq('exporter', country)
        .eq('year', year)
        .order('total_value', { ascending: false })
        .limit(limit);

      if (exportsError) throw exportsError;

      const { data: imports, error: importsError } = await supabase
        .from('mv_bilateral_aggregates')
        .select('exporter as partner, total_value, total_volume')
        .eq('importer', country)
        .eq('year', year)
        .order('total_value', { ascending: false })
        .limit(limit);

      if (importsError) throw importsError;

      return { exports, imports };
    },
    enabled: !!country,
  });
}

export function useCountryByCommodity(country: string, year: number, direction: 'export' | 'import') {
  return useQuery({
    queryKey: ['countryByCommodity', country, year, direction],
    queryFn: async () => {
      const column = direction === 'export' ? 'exporter' : 'importer';
      const { data, error } = await supabase
        .from('baci_trade_named')
        .select('commodity_l1, commodity_l2, value, volume')
        .eq(column, country)
        .eq('year', year);
      if (error) throw error;

      // Group by commodity and sum
      const grouped = data?.reduce((acc: any[], item: any) => {
        const existing = acc.find(x => x.commodity_l2 === item.commodity_l2);
        if (existing) {
          existing.value += item.value;
          existing.volume += item.volume;
        } else {
          acc.push({
            commodity_l1: item.commodity_l1,
            commodity_l2: item.commodity_l2,
            value: item.value,
            volume: item.volume,
          });
        }
        return acc;
      }, []);

      return grouped?.sort((a, b) => b.value - a.value);
    },
    enabled: !!country,
  });
}

export function useBilateralByYear(exporter: string, importer: string) {
  return useQuery({
    queryKey: ['bilateralByYear', exporter, importer],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_bilateral_aggregates')
        .select('year, total_value, total_volume')
        .eq('exporter', exporter)
        .eq('importer', importer)
        .order('year', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!exporter && !!importer,
  });
}

export function useBilateralCommodities(exporter: string, importer: string, year: number) {
  return useQuery({
    queryKey: ['bilateralCommodities', exporter, importer, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baci_trade_named')
        .select('commodity_l1, commodity_l2, value, volume')
        .eq('exporter', exporter)
        .eq('importer', importer)
        .eq('year', year);
      if (error) throw error;

      // Group by commodity and sum
      const grouped = data?.reduce((acc: any[], item: any) => {
        const existing = acc.find(x => x.commodity_l2 === item.commodity_l2);
        if (existing) {
          existing.value += item.value;
          existing.volume += item.volume;
        } else {
          acc.push({
            commodity_l1: item.commodity_l1,
            commodity_l2: item.commodity_l2,
            value: item.value,
            volume: item.volume,
          });
        }
        return acc;
      }, []);

      return grouped?.sort((a, b) => b.value - a.value);
    },
    enabled: !!exporter && !!importer,
  });
}

export function useTopCorridors(year: number, limit: number = 25) {
  return useQuery({
    queryKey: ['topCorridors', year, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_bilateral_aggregates')
        .select('exporter, importer, total_value, total_volume')
        .eq('year', year)
        .order('total_value', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useCorridorTrends(limit: number = 25) {
  return useQuery({
    queryKey: ['corridorTrends', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_bilateral_aggregates')
        .select('exporter, importer, year, total_value, total_volume')
        .order('total_value', { ascending: false })
        .limit(limit);
      if (error) throw error;

      // Group by corridor and calculate trends
      const corridors = data?.reduce((acc: any[], item: any) => {
        const key = `${item.exporter}-${item.importer}`;
        const existing = acc.find(x => x.corridor === key);

        if (existing) {
          existing.years.push({
            year: item.year,
            value: item.total_value,
            volume: item.total_volume,
          });
        } else {
          acc.push({
            corridor: key,
            exporter: item.exporter,
            importer: item.importer,
            years: [{
              year: item.year,
              value: item.total_value,
              volume: item.total_volume,
            }],
          });
        }
        return acc;
      }, []);

      return corridors;
    },
  });
}

export function useRegionSummary(year: number) {
  return useQuery({
    queryKey: ['regionSummary', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_regional_trade')
        .select('exporter_region, importer_region, trade_value, trade_volume')
        .eq('year', year);
      if (error) throw error;

      // Aggregate by region
      const regions = data?.reduce((acc: any[], item: any) => {
        // Add as exporter
        let exportRegion = acc.find(x => x.region === item.exporter_region);
        if (!exportRegion) {
          exportRegion = {
            region: item.exporter_region,
            export_value: 0,
            export_volume: 0,
            import_value: 0,
            import_volume: 0,
          };
          acc.push(exportRegion);
        }
        exportRegion.export_value += item.trade_value;
        exportRegion.export_volume += item.trade_volume;

        // Add as importer
        let importRegion = acc.find(x => x.region === item.importer_region);
        if (!importRegion) {
          importRegion = {
            region: item.importer_region,
            export_value: 0,
            export_volume: 0,
            import_value: 0,
            import_volume: 0,
          };
          acc.push(importRegion);
        }
        importRegion.import_value += item.trade_value;
        importRegion.import_volume += item.trade_volume;

        return acc;
      }, []);

      return regions;
    },
  });
}

export function useRegionTrend(region: string) {
  return useQuery({
    queryKey: ['regionTrend', region],
    queryFn: async () => {
      const { data: exports, error: exportsError } = await supabase
        .from('mv_regional_trade')
        .select('year, trade_value, trade_volume')
        .eq('exporter_region', region)
        .order('year', { ascending: true });

      if (exportsError) throw exportsError;

      const { data: imports, error: importsError } = await supabase
        .from('mv_regional_trade')
        .select('year, trade_value, trade_volume')
        .eq('importer_region', region)
        .order('year', { ascending: true });

      if (importsError) throw importsError;

      // Combine by year
      const combined = exports?.map(exp => {
        const imp = imports?.find(i => i.year === exp.year);
        return {
          year: exp.year,
          export_value: exp.trade_value,
          export_volume: exp.trade_volume,
          import_value: imp?.trade_value || 0,
          import_volume: imp?.trade_volume || 0,
        };
      });

      return combined;
    },
    enabled: !!region,
  });
}

export function useRegionPartners(region: string, year: number, limit: number = 10) {
  return useQuery({
    queryKey: ['regionPartners', region, year, limit],
    queryFn: async () => {
      const { data: exports, error: exportsError } = await supabase
        .from('mv_regional_trade')
        .select('importer_region as partner, trade_value, trade_volume')
        .eq('exporter_region', region)
        .eq('year', year)
        .order('trade_value', { ascending: false })
        .limit(limit);

      if (exportsError) throw exportsError;

      const { data: imports, error: importsError } = await supabase
        .from('mv_regional_trade')
        .select('exporter_region as partner, trade_value, trade_volume')
        .eq('importer_region', region)
        .eq('year', year)
        .order('trade_value', { ascending: false })
        .limit(limit);

      if (importsError) throw importsError;

      return { exports, imports };
    },
    enabled: !!region,
  });
}
