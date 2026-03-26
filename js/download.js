/**
 * download.js — CSV 다운로드 기능
 * BOM 포함 UTF-8 CSV 출력 (Excel 호환)
 */

/* ── CSV Utilities ─────────────────────────────── */
function _escCSV(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function _downloadCSV(rows, filename) {
    const csv  = rows.map(row => row.map(_escCSV).join(',')).join('\r\n');
    const bom  = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function _ts() {
    const n = new Date();
    return n.getFullYear()
        + String(n.getMonth()+1).padStart(2,'0')
        + String(n.getDate()).padStart(2,'0')
        + '_'
        + String(n.getHours()).padStart(2,'0')
        + String(n.getMinutes()).padStart(2,'0');
}

/* ── 1. Filtered Data CSV ──────────────────────── */
function downloadFilteredData() {
    const data = AppState.getFilteredData();
    if (!data || !data.length) { alert('다운로드할 데이터가 없습니다.'); return; }

    const hbinCols = DataParser.HBIN_COLS;                        // HBIN01~10
    const sbinCols = DataParser.SBIN_COLS;                        // SBIN001~100

    const headers = [
        'Site','Device Name','Lot No','Run','Tester','Program',
        'DATE CODE','DATE','Total','Pass','Fail','Yield',
        ...hbinCols,
        ...sbinCols
    ];

    const rows = [headers];
    data.forEach(r => {
        rows.push([
            r.site, r.deviceName, r.lotNo, r.run, r.tester, r.program,
            r.dateCode, r.dateRaw, r.total, r.pass, r.fail, r.yield,
            ...hbinCols.map(k => r.hbins[k] || 0),
            ...sbinCols.map(k => r.sbins[k] || 0)
        ]);
    });

    _downloadCSV(rows, `ft_yield_filtered_${_ts()}.csv`);
}

/* ── 2. Run Analysis Results ───────────────────── */
function downloadRunAnalysis() {
    const data = AppState.getFilteredData();
    if (!data || !data.length) { alert('데이터가 없습니다.'); return; }

    const headers = [
        'Device Name','Run','Lot No','Site','Tester','DATE',
        'Total','Pass','Fail','Yield',
        'Run Avg Yield','Run StdDev','vs Run Avg',
        'Low Yield','Warn Yield',
        'Top HBIN 1','Top HBIN 1 %',
        'Top HBIN 2','Top HBIN 2 %',
        'Top HBIN 3','Top HBIN 3 %',
        'Top SBIN 1','Top SBIN 1 %',
        'Top SBIN 2','Top SBIN 2 %',
        'Top SBIN 3','Top SBIN 3 %'
    ];

    const rows = [headers];
    const byDevice = DataParser.groupByDevice(data);

    Object.entries(byDevice).forEach(([device, dl]) => {
        const byRun = DataParser.groupByRun(dl);
        Object.entries(byRun).forEach(([run, rl]) => {
            const flagged = DataParser.detectLowYieldLots(rl);
            flagged.forEach(lot => {
                const topH = DataParser.getTopHbins(lot, 3);
                const topS = DataParser.getTopSbins(lot, 3);
                rows.push([
                    lot.deviceName, lot.run, lot.lotNo, lot.site, lot.tester, lot.dateRaw,
                    lot.total, lot.pass, lot.fail, lot.yield,
                    lot.runAvgYield.toFixed(3), lot.runStd.toFixed(3), lot.yieldDiff.toFixed(3),
                    lot.isLowYield  ? 'Y' : 'N',
                    lot.isWarnYield ? 'Y' : 'N',
                    topH[0]?.bin || '', topH[0] ? topH[0].pct.toFixed(2)+'%' : '',
                    topH[1]?.bin || '', topH[1] ? topH[1].pct.toFixed(2)+'%' : '',
                    topH[2]?.bin || '', topH[2] ? topH[2].pct.toFixed(2)+'%' : '',
                    topS[0]?.bin || '', topS[0] ? topS[0].pct.toFixed(2)+'%' : '',
                    topS[1]?.bin || '', topS[1] ? topS[1].pct.toFixed(2)+'%' : '',
                    topS[2]?.bin || '', topS[2] ? topS[2].pct.toFixed(2)+'%' : ''
                ]);
            });
        });
    });

    _downloadCSV(rows, `ft_run_analysis_${_ts()}.csv`);
}

/* ── 3. Low Yield Lot List ─────────────────────── */
function downloadLowYieldLots() {
    const data = AppState.getFilteredData();
    if (!data || !data.length) { alert('데이터가 없습니다.'); return; }

    const headers = [
        'Device Name','Run','Lot No','Site','Tester','DATE',
        'Total','Fail','Yield','Run Avg Yield','Run StdDev','Yield Diff',
        'HBIN02','HBIN03','HBIN04','HBIN05','HBIN06','HBIN07','HBIN08','HBIN09','HBIN10',
        'Top HBIN','Top HBIN %','2nd HBIN','2nd HBIN %','3rd HBIN','3rd HBIN %',
        'Top SBIN','Top SBIN %','2nd SBIN','2nd SBIN %','3rd SBIN','3rd SBIN %'
    ];

    const rows = [headers];
    const byDevice = DataParser.groupByDevice(data);

    Object.entries(byDevice).forEach(([device, dl]) => {
        const byRun = DataParser.groupByRun(dl);
        Object.entries(byRun).forEach(([run, rl]) => {
            DataParser.detectLowYieldLots(rl)
                .filter(l => l.isLowYield)
                .forEach(lot => {
                    const topH = DataParser.getTopHbins(lot, 3);
                    const topS = DataParser.getTopSbins(lot, 3);
                    rows.push([
                        lot.deviceName, lot.run, lot.lotNo, lot.site, lot.tester, lot.dateRaw,
                        lot.total, lot.fail, lot.yield,
                        lot.runAvgYield.toFixed(3), lot.runStd.toFixed(3), lot.yieldDiff.toFixed(3),
                        lot.hbins['HBIN02']||0, lot.hbins['HBIN03']||0, lot.hbins['HBIN04']||0,
                        lot.hbins['HBIN05']||0, lot.hbins['HBIN06']||0, lot.hbins['HBIN07']||0,
                        lot.hbins['HBIN08']||0, lot.hbins['HBIN09']||0, lot.hbins['HBIN10']||0,
                        topH[0]?.bin||'', topH[0] ? topH[0].pct.toFixed(2)+'%' : '',
                        topH[1]?.bin||'', topH[1] ? topH[1].pct.toFixed(2)+'%' : '',
                        topH[2]?.bin||'', topH[2] ? topH[2].pct.toFixed(2)+'%' : '',
                        topS[0]?.bin||'', topS[0] ? topS[0].pct.toFixed(2)+'%' : '',
                        topS[1]?.bin||'', topS[1] ? topS[1].pct.toFixed(2)+'%' : '',
                        topS[2]?.bin||'', topS[2] ? topS[2].pct.toFixed(2)+'%' : ''
                    ]);
                });
        });
    });

    if (rows.length === 1) { alert('Low Yield Lot이 없습니다.'); return; }
    _downloadCSV(rows, `ft_low_yield_lots_${_ts()}.csv`);
}

/* ── 4. Full Analysis Report ───────────────────── */
function downloadFullReport() {
    const data = AppState.getFilteredData();
    if (!data || !data.length) { alert('데이터가 없습니다.'); return; }

    const rows = [];

    /* === Section 1: Run Summary === */
    rows.push(['[Run Summary]']);
    rows.push(['Device Name','Run','Lots','Avg Yield','StdDev','Min Yield','Max Yield','Low Yield Lots','Warn Yield Lots','Total Units','Total Fail','Overall Yield']);

    const byDevice = DataParser.groupByDevice(data);
    Object.entries(byDevice).forEach(([device, dl]) => {
        const byRun = DataParser.groupByRun(dl);
        Object.entries(byRun).forEach(([run, rl]) => {
            const flagged = DataParser.detectLowYieldLots(rl);
            const stats   = (flagged[0] && flagged[0].stats) || DataParser.computeStats(rl.map(l=>l.yield));
            const tu = rl.reduce((a,b)=>a+b.total,0);
            const tp = rl.reduce((a,b)=>a+b.pass,0);
            const tf = rl.reduce((a,b)=>a+b.fail,0);
            const oy = tu>0 ? (tp/tu*100) : 0;
            rows.push([
                device, run, rl.length,
                stats.mean.toFixed(3), stats.std.toFixed(3),
                stats.min.toFixed(3), stats.max.toFixed(3),
                flagged.filter(l=>l.isLowYield).length,
                flagged.filter(l=>l.isWarnYield).length,
                tu, tf, oy.toFixed(3)+'%'
            ]);
        });
    });

    rows.push([]);

    /* === Section 2: Site Summary === */
    rows.push(['[Site Summary]']);
    rows.push(['Site','Lots','Overall Yield','Avg Yield','Min Yield','Max Yield','StdDev','Total Units','Total Fail']);

    const bySite = DataParser.groupBySite(data);
    Object.entries(bySite).forEach(([site, lots]) => {
        const tu = lots.reduce((a,b)=>a+b.total,0);
        const tp = lots.reduce((a,b)=>a+b.pass,0);
        const tf = lots.reduce((a,b)=>a+b.fail,0);
        const oy = tu>0 ? (tp/tu*100) : 0;
        const st = DataParser.computeStats(lots.map(l=>l.yield));
        rows.push([site, lots.length, oy.toFixed(3)+'%', st.mean.toFixed(3), st.min.toFixed(3), st.max.toFixed(3), ('±'+st.std.toFixed(3)), tu, tf]);
    });

    rows.push([]);

    /* === Section 3: Low Yield Detail === */
    rows.push(['[Low Yield Lot Detail]']);
    rows.push(['Device','Run','Lot No','Site','DATE','Yield','Run Avg','Yield Diff','Top HBIN','Top SBIN 1','Top SBIN 2','Top SBIN 3']);

    Object.entries(byDevice).forEach(([device, dl]) => {
        const byRun = DataParser.groupByRun(dl);
        Object.entries(byRun).forEach(([run, rl]) => {
            DataParser.detectLowYieldLots(rl)
                .filter(l=>l.isLowYield)
                .forEach(lot => {
                    const topH = DataParser.getTopHbins(lot, 1);
                    const topS = DataParser.getTopSbins(lot, 3);
                    rows.push([
                        device, run, lot.lotNo, lot.site, lot.dateRaw,
                        lot.yield.toFixed(3)+'%',
                        lot.runAvgYield.toFixed(3)+'%',
                        lot.yieldDiff.toFixed(3)+'%',
                        topH[0] ? `${topH[0].bin}(${topH[0].pct.toFixed(1)}%)` : '',
                        topS[0] ? `${topS[0].bin}(${topS[0].pct.toFixed(1)}%)` : '',
                        topS[1] ? `${topS[1].bin}(${topS[1].pct.toFixed(1)}%)` : '',
                        topS[2] ? `${topS[2].bin}(${topS[2].pct.toFixed(1)}%)` : ''
                    ]);
                });
        });
    });

    _downloadCSV(rows, `ft_full_report_${_ts()}.csv`);
}
