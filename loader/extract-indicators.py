# Extract a curated set of country-level indicators from the BMI/Fitch workbooks (Annual sheets) to a long CSV.
# Output: ../Data/Indicators/country_indicators.csv (geography,indicator,year,value,is_forecast) and indicator_catalog.csv
# Usage: python extract-indicators.py
import openpyxl, os, csv, sys, warnings
warnings.filterwarnings('ignore')
BASE = r'C:\Users\mohamed.almas\OneDrive\Claude\Country\Economic'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Data', 'Indicators')
os.makedirs(OUT, exist_ok=True)

# key: (file, exact Data Item, label, unit, group)
C = {
  'gdp_usd': ('GDP', 'Nominal GDP, USD', 'Nominal GDP', 'USD', 'Economy'),
  'gdp_growth_nominal': ('GDP', 'Nominal GDP, USD, % chg y-o-y', 'Nominal GDP growth', '%', 'Economy'),
  'gdp_pc_usd': ('GDP', 'Nominal GDP per capita, USD', 'GDP per capita', 'USD', 'Economy'),
  'gdp_real_growth': ('GDP', 'Real GDP growth, % y-o-y', 'Real GDP growth', '%', 'Economy'),
  'gdp_real_cagr5': ('GDP', 'Real GDP CAGR,% 5y', 'Real GDP CAGR (5y)', '%', 'Economy'),
  'gdp_ppp_usd': ('GDP', 'Nominal GDP, USD (PPP)', 'GDP (PPP)', 'USD', 'Economy'),
  'ind_prod_growth': ('GDP', 'Industrial production index, avg, % chg y-o-y', 'Industrial production growth', '%', 'Economy'),
  'pop': ('Population', 'Population', 'Population', 'people', 'Demographics'),
  'pop_growth': ('Population', 'Population, % chg y-o-y', 'Population growth', '%', 'Demographics'),
  'urban_pct': ('Population', 'Urban population total, % of total population', 'Urban population share', '%', 'Demographics'),
  'median_age': ('Population', 'Median age of population', 'Median age', 'years', 'Demographics'),
  'goods_exports_usd': ('Balance of Payments', 'Goods exports, USD', 'Goods exports (BMI)', 'USD', 'External'),
  'goods_imports_usd': ('Balance of Payments', 'Goods imports, USD', 'Goods imports (BMI)', 'USD', 'External'),
  'goods_exports_pct_gdp': ('Balance of Payments', 'Goods exports, pct of GDP', 'Goods exports % GDP', '%', 'External'),
  'goods_imports_pct_gdp': ('Balance of Payments', 'Goods imports, pct of GDP', 'Goods imports % GDP', '%', 'External'),
  'goods_balance_usd': ('Balance of Payments', 'Trade in goods balance, USD', 'Goods trade balance (BMI)', 'USD', 'External'),
  'goods_balance_pct_gdp': ('Balance of Payments', 'Trade in goods balance, pct of GDP', 'Goods trade balance % GDP', '%', 'External'),
  'export_conc_top3': ('Balance of Payments', 'Goods export concentration, top 3 trade partners %', 'Export concentration, top 3 partners', '%', 'External'),
  'import_conc_top3': ('Balance of Payments', 'Goods import concentration, top 3 trade partners %', 'Import concentration, top 3 partners', '%', 'External'),
  'services_exports_usd': ('Balance of Payments', 'Services exports, USD', 'Services exports', 'USD', 'External'),
  'services_imports_usd': ('Balance of Payments', 'Services imports, USD', 'Services imports', 'USD', 'External'),
  'fx_usd_avg': ('Exchange Rate', 'LCU per USD, ave', 'Exchange rate (LCU per USD, avg)', 'LCU', 'Prices & FX'),
  'fx_usd_chg': ('Exchange Rate', 'LCU per USD, ave, % chg y-o-y', 'Exchange rate change (LCU per USD)', '%', 'Prices & FX'),
  'reer': ('Exchange Rate', 'Real effective exchange rate index', 'Real effective exchange rate', 'index', 'Prices & FX'),
  'reer_chg': ('Exchange Rate', 'Real effective exchange rate index, % chg y-o-y', 'REER change', '%', 'Prices & FX'),
  'cpi_infl': ('Inflation', 'Consumer price index inflation, ave, % chg y-o-y', 'Consumer inflation', '%', 'Prices & FX'),
  'ppi_infl': ('Inflation', 'Producer prices inflation, ave, % chg y-o-y', 'Producer inflation', '%', 'Prices & FX'),
  'reserves_usd': ('Foreign Reserves', 'Total reserves ex gold, USD', 'FX reserves ex gold', 'USD', 'External liquidity'),
  'import_cover_months': ('Foreign Reserves', 'Import cover months', 'Import cover', 'months', 'External liquidity'),
  'reserves_pct_stdebt': ('Foreign Reserves', 'Foreign reserves ex gold, % of short-term external debt', 'Reserves % short-term external debt', '%', 'External liquidity'),
  'ext_debt_usd': ('Debt', 'Total external debt stock, USD', 'External debt', 'USD', 'External liquidity'),
  'ext_debt_pct_gdp': ('Debt', 'Total external debt stock, pct of GDP', 'External debt % GDP', '%', 'External liquidity'),
  'ext_debt_pct_exports': ('Debt', 'Total external debt stock, % of exports of G&S', 'External debt % exports', '%', 'External liquidity'),
  'ext_debt_pct_reserves': ('Debt', 'Total external debt stock, % of FX reserves', 'External debt % reserves', '%', 'External liquidity'),
  'debt_service_pct_exports': ('External Debt Service', 'Total debt service, % of exports of G&S', 'Debt service % exports', '%', 'External liquidity'),
  'debt_service_pct_reserves': ('External Debt Service', 'Total debt service, % of FX reserves', 'Debt service % reserves', '%', 'External liquidity'),
  'fdi_in_pct_gdp': ('FDI Stock', 'Inward FDI Stock, pct of GDP', 'Inward FDI stock % GDP', '%', 'Investment'),
  'fdi_out_pct_gdp': ('FDI Stock', 'Outward FDI Stock, pct of GDP', 'Outward FDI stock % GDP', '%', 'Investment'),
  'budget_balance_pct_gdp': ('Fiscal', 'Budget balance, % of GDP', 'Budget balance % GDP', '%', 'Economy'),
  'risk_country': ('Risk Index', 'Country Risk Index', 'Country risk', 'index 0-100', 'Risk'),
  'risk_political': ('Risk Index', 'Political Risk Index', 'Political risk', 'index 0-100', 'Risk'),
  'risk_economic': ('Risk Index', 'Economic Risk Index', 'Economic risk', 'index 0-100', 'Risk'),
  'risk_economic_st': ('Risk Index', 'Short-Term Economic Risk Index', 'Short-term economic risk', 'index 0-100', 'Risk'),
  'risk_economic_lt': ('Risk Index', 'Long-Term Economic Risk Index', 'Long-term economic risk', 'index 0-100', 'Risk'),
  'risk_operational': ('Risk Index', 'Operational Risk Index', 'Operational risk', 'index 0-100', 'Risk'),
  'risk_logistics': ('Risk Index', 'Logistics Risk Index', 'Logistics risk', 'index 0-100', 'Risk'),
  'risk_labour': ('Risk Index', 'Labour Market Risk Index', 'Labour market risk', 'index 0-100', 'Risk'),
  'risk_trade_investment': ('Risk Index', 'Trade and Investment Risk Index', 'Trade & investment risk', 'index 0-100', 'Risk'),
  'risk_crime_security': ('Risk Index', 'Crime and Security Risk Index', 'Crime & security risk', 'index 0-100', 'Risk'),
  'risk_trade_openness': ('Operational Risk Index', 'TIR, EO, Trade Openness', 'Trade openness (score)', 'index 0-100', 'Risk'),
  'risk_transport_network': ('Operational Risk Index', 'LR, Transport Network', 'Transport network (score)', 'index 0-100', 'Risk'),
  'risk_ease_of_trading': ('Operational Risk Index', 'LR, TPG, Ease of Trading', 'Ease of trading (score)', 'index 0-100', 'Risk'),
  'risk_connectivity': ('Operational Risk Index', 'LR, TPG, Connectivity', 'Connectivity (score)', 'index 0-100', 'Risk'),
  'risk_conflict': ('Operational Risk Index', 'SR, Conflict Risk Index', 'Conflict risk (score)', 'index 0-100', 'Risk'),
}
by_file = {}
for k, v in C.items():
    by_file.setdefault(v[0], {})[v[1]] = k

rows_out = 0
found = set()
with open(os.path.join(OUT, 'country_indicators.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['geography', 'indicator', 'year', 'value', 'is_forecast'])
    for fname, items in by_file.items():
        wb = openpyxl.load_workbook(os.path.join(BASE, f'Economic-{fname}.xlsx'), read_only=True)
        ws = wb['Annual']; ws.reset_dimensions()
        hdr = None
        for r in ws.iter_rows(values_only=True):
            if hdr is None:
                if r and 'Geography' in [str(x) for x in r if x is not None]:
                    hdr = [str(x).strip() if x is not None else '' for x in r]
                    ycols = [(i, int(h)) for i, h in enumerate(hdr) if h.isdigit()]
                continue
            if not r or r[0] is None: continue
            key = items.get(str(r[1]).strip())
            if not key: continue
            found.add(key)
            try: ff = int(r[4])
            except Exception: ff = 9999
            for i, y in ycols:
                v = r[i]
                if v is None or v == '-' or isinstance(v, str): continue
                w.writerow([r[0], key, y, v, 1 if y >= ff else 0]); rows_out += 1
        print(fname, 'done', flush=True)
missing = [k for k in C if k not in found]
print('rows', rows_out, '| indicators found', len(found), '/', len(C), '| missing:', missing)
with open(os.path.join(OUT, 'indicator_catalog.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['key', 'label', 'unit', 'grp', 'source_file', 'data_item'])
    for k, v in C.items():
        if k in found: w.writerow([k, v[2], v[3], v[4], f'Economic-{v[0]}.xlsx', v[1]])
