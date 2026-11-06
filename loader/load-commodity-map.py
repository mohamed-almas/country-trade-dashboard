"""Load HS6 -> ADPG L1/L2 mapping from Commodities Master List.xlsx (sheet add._comm_mapp) into Supabase commodity_map."""
import os, json, urllib.request
import openpyxl

ROOT = os.path.dirname(os.path.abspath(__file__))
env = {}
for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1)
        env[k] = v
URL, KEY = env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']

xlsx = os.path.join(ROOT, '..', 'Data', 'References', 'Commodities Master List.xlsx')
wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
ws = wb['add._comm_mapp']
rows = {}
for i, r in enumerate(ws.iter_rows(values_only=True)):
    if i == 0 or not r[0]:
        continue
    hs6 = str(r[0]).zfill(6)
    if not r[4] or not r[5]:
        continue
    rows[hs6] = dict(hs6=hs6, product_name=r[1], adpg_l1=r[4], adpg_l2=r[5], cargo_l1=r[6], cargo_l2=r[7], og_flag=r[8])
rows = list(rows.values())
print(f'{len(rows)} mapping rows')

for i in range(0, len(rows), 1000):
    req = urllib.request.Request(
        f'{URL}/rest/v1/commodity_map?on_conflict=hs6',
        data=json.dumps(rows[i:i + 1000]).encode(),
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates'},
        method='POST')
    urllib.request.urlopen(req).read()
print('done')
