# xlsx (UNSD HS2017 correlation tables) -> data/hs_corr_<edition>.csv  (from_hs6 = old edition, to_hs6 = HS2017)
import openpyxl, csv, sys, os
base = os.path.join(os.path.dirname(__file__), '..', 'Data', 'References')
for ed, f, sheet in [('H4', 'HS2017toHS2012', 'Correlation HS17-HS12'), ('H3', 'HS2017toHS2007', 'Correlation HS17-HS07')]:
    ws = openpyxl.load_workbook(os.path.join(base, f + 'ConversionAndCorrelationTables.xlsx'), read_only=True)[sheet]
    out = set()
    for r in ws.iter_rows(values_only=True):
        c = [s for s in (str(x).strip() for x in r[:3] if x is not None) if len(s) == 6 and s.isdigit()]
        if len(c) == 2:
            out.add((c[1], c[0]))
    with open(os.path.join(base, f'hs_corr_{ed}.csv'), 'w', newline='') as fh:
        w = csv.writer(fh); w.writerow(['from_hs6', 'to_hs6']); w.writerows(sorted(out))
    print(ed, len(out))
