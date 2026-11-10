# Extract commodity supply/demand/trade series (production, consumption, imports, exports, net exports) from the BMI sector workbooks.
# Output: ../Data/Indicators/commodity_balance.csv (geography,commodity,measure,year,value,is_forecast) and commodity_catalog.csv
# Usage: python extract-commodity-balance.py
import openpyxl, os, csv, warnings
warnings.filterwarnings('ignore')
BASE = r'C:\Users\mohamed.almas\OneDrive\Claude\Country\Sectors'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Data', 'Indicators')
os.makedirs(OUT, exist_ok=True)

# commodity key -> (label, unit, ADPG L1, ADPG L2 or '' when no 1:1 group; commodities sharing an L2 and unit are summed in the dependency view)
CAT = {
  'Wheat': ('Wheat', 'tonnes', 'Vegetable Products', 'Cereals'),
  'Corn': ('Corn', 'tonnes', 'Vegetable Products', 'Cereals'),
  'Rice': ('Rice', 'tonnes', 'Vegetable Products', 'Cereals'),
  'Sugar': ('Sugar', 'tonnes', 'Food & Drink', 'Sugars & Sugar Confectionery'),
  'Beef & veal': ('Beef & veal', 'tonnes', 'Animal Products', 'Meat'),
  'Pork': ('Pork', 'tonnes', 'Animal Products', 'Meat'),
  'Poultry': ('Poultry', 'tonnes', 'Animal Products', 'Meat'),
  'Butter': ('Butter', 'tonnes', 'Animal Products', 'Dairy Products'),
  'Cheese': ('Cheese', 'tonnes', 'Animal Products', 'Dairy Products'),
  'Whole milk powder': ('Whole milk powder', 'tonnes', 'Animal Products', 'Dairy Products'),
  'Soybean': ('Soybean', 'tonnes', '', ''),
  'Palm oil': ('Palm oil', 'tonnes', '', ''),
  'Aluminium': ('Aluminium', 'tonnes', 'Metals', 'Aluminium'),
  'Copper refined': ('Refined copper', 'tonnes', 'Metals', 'Copper'),
  'Lead refined': ('Refined lead', 'tonnes', 'Metals', 'Lead'),
  'Nickel refined': ('Refined nickel', 'tonnes', 'Metals', 'Nickel'),
  'Zinc refined': ('Refined zinc', 'tonnes', 'Metals', 'Zinc'),
  'Tin refined': ('Refined tin', 'tonnes', 'Metals', 'Tin'),
  'Steel': ('Steel', 'tonnes', 'Metals', 'Iron & Steel'),
  'Thermal coal': ('Thermal coal', 'tonnes', 'Mineral Fuels', 'Coal'),
  'Coking coal': ('Coking coal', 'tonnes', 'Mineral Fuels', 'Coal'),
  'Iron ore': ('Iron ore', 'tonnes', 'Ores', 'Iron Ore'),
  'Cement': ('Cement', 'tonnes', 'Other Minerals', 'Cement'),
  'Crude oil': ('Crude oil & other liquids', 'b/d', 'Mineral Fuels', 'Petroleum Oil'),
  'Refined products': ('Refined oil products', 'b/d', '', ''),
  'Natural gas': ('Natural gas (dry)', 'bcm', 'Mineral Fuels', 'Petroleum Gas'),
  'Electricity': ('Electricity', 'TWh', '', ''),
}
# (commodity, measure, file, exact Data Item)
S = []
def add(c, m, f, item): S.append((c, m, f, item))
for c, f in [('Wheat', 'Agribusiness'), ('Corn', 'Agribusiness'), ('Rice', 'Agribusiness'), ('Sugar', 'Agribusiness'), ('Beef & veal', 'Agribusiness'),
             ('Pork', 'Agribusiness'), ('Poultry', 'Agribusiness'), ('Butter', 'Agribusiness'), ('Cheese', 'Agribusiness'), ('Whole milk powder', 'Agribusiness'),
             ('Soybean', 'Agribusiness'), ('Palm oil', 'Agribusiness'),
             ('Aluminium', 'Metals & Mining'), ('Copper refined', 'Metals & Mining'), ('Lead refined', 'Metals & Mining'), ('Nickel refined', 'Metals & Mining'),
             ('Zinc refined', 'Metals & Mining'), ('Tin refined', 'Metals & Mining')]:
    for m, w in [('production', 'production'), ('consumption', 'consumption'), ('imports', 'imports'), ('exports', 'exports')]:
        add(c, m, f, f'{c} {w}, tonnes')
for c, base in [('Thermal coal', 'Thermal coal mine'), ('Coking coal', 'Coking coal mine'), ('Iron ore', 'Iron ore mine')]:
    for m in ['production', 'consumption', 'imports', 'exports']:
        add(c, m, 'Metals & Mining', f'{base} {m}, tonnes')
add('Steel', 'production', 'Metals & Mining', 'Crude steel production, tonnes')
add('Steel', 'consumption', 'Metals & Mining', 'Crude steel consumption, tonnes')
add('Steel', 'imports', 'Metals & Mining', 'Steel imports, tonnes')
add('Steel', 'exports', 'Metals & Mining', 'Steel exports, tonnes')
add('Cement', 'production', 'Infrastructure', 'Cement production')
add('Cement', 'consumption', 'Infrastructure', 'Cement consumption, tonnes')
add('Cement', 'net_exports', 'Infrastructure', 'Cement net exports')
add('Crude oil', 'production', 'Oil & Gas', 'Crude, NGPL & other liquids prod, b/d')
add('Crude oil', 'net_exports', 'Oil & Gas', 'Crude & other liquids net export, b/d')
add('Refined products', 'production', 'Oil & Gas', 'Refined products production, b/d')
add('Refined products', 'consumption', 'Oil & Gas', 'Refined products consumption, b/d')
add('Refined products', 'net_exports', 'Oil & Gas', 'Refined products net exports, b/d')
add('Natural gas', 'production', 'Oil & Gas', 'Dry natural gas production, billion cubic metres')
add('Natural gas', 'consumption', 'Oil & Gas', 'Dry natural gas consumption, billion cubic metres')
add('Natural gas', 'net_exports', 'Oil & Gas', 'Dry natural gas net exports, billion cubic metres')
add('Electricity', 'imports', 'Power & Renewables', 'Total Electricity Imports, TWh')
add('Electricity', 'exports', 'Power & Renewables', 'Total Electricity Exports, TWh')
add('Electricity', 'consumption', 'Power & Renewables', 'Consumption, Net Consumption, TWh')

by_file = {}
for c, m, f, item in S:
    by_file.setdefault(f, {})[item] = (c, m)

found = set(); rows_out = 0
with open(os.path.join(OUT, 'commodity_balance.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['geography', 'commodity', 'measure', 'year', 'value', 'is_forecast'])
    for f, items in by_file.items():
        wb = openpyxl.load_workbook(os.path.join(BASE, f'Industry-{f}.xlsx'), read_only=True)
        ws = wb['Annual']; ws.reset_dimensions()
        hdr = None
        for r in ws.iter_rows(values_only=True):
            if hdr is None:
                if r and 'Geography' in [str(x) for x in r if x is not None]:
                    hdr = [str(x).strip() if x is not None else '' for x in r]
                    ycols = [(i, int(h)) for i, h in enumerate(hdr) if h.isdigit()]
                continue
            if not r or r[0] is None or r[1] is None: continue
            hit = items.get(str(r[1]).strip())
            if not hit: continue
            found.add((hit[0], hit[1]))
            try: ff = int(r[4])
            except Exception: ff = 9999
            for i, y in ycols:
                v = r[i]
                if v is None or v == '-' or isinstance(v, str): continue
                w.writerow([r[0], hit[0], hit[1], y, v, 1 if y >= ff else 0]); rows_out += 1
        print(f, 'done', flush=True)
missing = [(c, m) for c, m, f, i in S if (c, m) not in found]
print('rows', rows_out, '| series found', len(found), '/', len(S), '| missing:', missing)
with open(os.path.join(OUT, 'commodity_catalog.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['commodity', 'label', 'unit', 'adpg_l1', 'adpg_l2'])
    for k, v in CAT.items(): w.writerow([k, *v])
