# Extract World Bank LPI (classic 2007-2023) and LPI 2.0 (dwell/turnaround/transit times, 2023-2024) to tidy CSVs.
# Input : ..\..\Country\WB_LPI.csv and WB_LPI_20.csv.  Output: ../Data/Indicators/lpi_scores.csv and lpi20.csv
# Usage: python extract-lpi.py
import csv, os, collections
SRC = r'C:\Users\mohamed.almas\OneDrive\Claude\Country'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Data', 'Indicators')
os.makedirs(OUT, exist_ok=True)

# classic LPI: LPI_OVR (_T, WB_LPI_SC/WB_LPI_RK) and the six component series (LPI_xxx, WB_LPI_SC/WB_LPI_RK)
IND = {'LPI_OVR': 'overall', 'LPI_CTMS': 'customs', 'LPI_INF': 'infrastructure', 'LPI_IS': 'intl_shipping', 'LPI_LOG': 'logistics_quality', 'LPI_TRC': 'tracking', 'LPI_TML': 'timeliness'}
acc = collections.defaultdict(dict)
for r in csv.DictReader(open(os.path.join(SRC, 'WB_LPI.csv'), encoding='utf-8-sig')):
    ind = IND.get(r['INDICATOR'])
    if not ind or not r['OBS_VALUE']: continue
    c1, c2 = r['COMP_BREAKDOWN_1'], r['COMP_BREAKDOWN_2']
    if ind == 'overall':
        if c1 != '_T' or c2 not in ('WB_LPI_SC', 'WB_LPI_RK'): continue
        kind = 'score' if c2 == 'WB_LPI_SC' else 'rank'
    else:
        if c1 not in ('WB_LPI_SC', 'WB_LPI_RK'): continue
        kind = 'score' if c1 == 'WB_LPI_SC' else 'rank'
    acc[(r['REF_AREA'], r['REF_AREA_LABEL'], int(r['TIME_PERIOD']), ind)][kind] = float(r['OBS_VALUE'])
with open(os.path.join(OUT, 'lpi_scores.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['iso3', 'label', 'year', 'indicator', 'score', 'rank'])
    for (iso, lab, y, ind), v in sorted(acc.items()):
        w.writerow([iso, lab, y, ind, v.get('score', ''), int(v['rank']) if 'rank' in v else ''])
print('classic LPI rows', len(acc))

# LPI 2.0: medians (MD) for time metrics, TEU-weighted median for port turnaround, plain values for counts
KEEP = {  # indicator -> metrics to keep
  'CT_DT_M': ['MD'], 'CT_DT_X': ['MD'], 'CT_TAT_PT': ['MD', 'MD_TEU'], 'LT_M': ['MD'], 'AV_DT': ['MD'],
  'PO_B2B': ['MD'], 'PO_B2C': ['MD'], 'SC_END': ['MD'], 'SC_START': ['MD'],
  'TRS_NUM': ['_Z'], 'TRS_T': ['_Z'], 'CT_ALLI': ['_Z'], 'CT_MC': ['_Z'], 'CT_SERV': ['_Z'], 'AV_PRTN': ['_Z'],
}
n = 0
with open(os.path.join(OUT, 'lpi20.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['iso3', 'label', 'year', 'indicator', 'metric', 'value'])
    for r in csv.DictReader(open(os.path.join(SRC, 'WB_LPI_20.csv'), encoding='utf-8-sig')):
        m = KEEP.get(r['INDICATOR'])
        if not m or r['METRIC'] not in m or not r['OBS_VALUE']: continue
        w.writerow([r['REF_AREA'], r['REF_AREA_LABEL'], r['TIME_PERIOD'], r['INDICATOR'], r['METRIC'], r['OBS_VALUE']]); n += 1
print('LPI 2.0 rows', n)
