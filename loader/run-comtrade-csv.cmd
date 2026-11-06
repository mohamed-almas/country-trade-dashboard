@echo off
cd /d "%~dp0"
node --max-old-space-size=4096 comtrade-csv.mjs >> "..\Data\ct_cache\refresh.log" 2>&1
