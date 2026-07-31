import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface TradeRecord {
  exporter: string;
  importer: string;
  commodity_l1: string;
  commodity_l2: string;
  year: number;
  volume: number;
  value: number;
  exporter_region?: string;
  importer_region?: string;
}
