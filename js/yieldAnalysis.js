/**
 * yieldAnalysis.js — Run 단위 Yield 분석
 * Device 선택 → Run별 Lot 목록 + 저Yield 하이라이트
 */
const YieldAnalysis = (() => {
    let _charts = {};

    function _destroy(id) {
        if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
    }

    /* ────────────────────────────────────────────────
       renderRunAnalysis
       ──────────────────────────────────────────────── */
    function renderRunAnalysis(deviceName, filteredData) {
        const container = document.getElementById('runYieldContent');
        if (!container) return;

        const deviceData = filteredData.filter(r => r.deviceName === deviceName);
        if (!deviceData.length) {
            container.innerHTML = '<div class="placeholder-msg"><i class="fas fa-inbox"></i> 해당 Device의 데이터가 없습니다.</div>';
            return;
        }

        const byRun = DataParser.groupByRun(deviceData);
        const runKeys = Object.keys(byRun).sort();

        // Overall stats across ALL lots of this device
        const allYields = deviceData.map(r => r.yield);
        const overallStats = DataParser.computeStats(allYields);
        const totalUnitsAll = deviceData.reduce((a,b)=>a+b.total,0);
        const totalPassAll  = deviceData.reduce((a,b)=>a+b.pass,0);
        const overallYield  = totalUnitsAll > 0 ? (totalPassAll/totalUnitsAll*100) : 0;

        // Run summary for the bar chart (use run-level means)
        const runSummary = runKeys.map(run => {
            const lots = byRun[run];
            const yields = lots.map(l => l.yield);
            const stats = DataParser.computeStats(yields);
            return { run, stats, lots };
        });

        // How many low/warn lots across all runs of this device
        let totalLow = 0, totalWarn = 0;
        runKeys.forEach(run => {
            const flagged = DataParser.detectLowYieldLots(byRun[run]);
            totalLow  += flagged.filter(l=>l.isLowYield).length;
            totalWarn += flagged.filter(l=>l.isWarnYield).length;
        });

        /* ─── Header info box ─── */
        let html = `
        <div class="info-box info" style="margin-bottom:18px">
            <i class="fas fa-circle-info"></i>
            <div style="line-height:1.8">
                <strong>${deviceName}</strong> &nbsp;|&nbsp;
                Run <strong>${runKeys.length}개</strong> &nbsp;|&nbsp;
                총 Lot <strong>${deviceData.length}개</strong> &nbsp;|&nbsp;
                종합 Yield <strong style="color:${overallYield<98?'var(--danger-dark)':overallYield<99.5?'var(--warning-dark)':'var(--success-dark)'}">${overallYield.toFixed(2)}%</strong>
                &nbsp;|&nbsp; Lot평균 <strong>${overallStats.mean.toFixed(2)}%</strong>
                &nbsp;±&nbsp;σ <strong>${overallStats.std.toFixed(3)}%</strong>
                &nbsp;|&nbsp; Min <strong>${overallStats.min.toFixed(2)}%</strong>
                &nbsp;·&nbsp; Max <strong>${overallStats.max.toFixed(2)}%</strong>
                ${totalLow  ? `&nbsp;|&nbsp; <span style="color:var(--danger-dark);font-weight:700">⚠ Low Yield ${totalLow}개</span>` : ''}
                ${totalWarn ? `&nbsp;|&nbsp; <span style="color:var(--warning-dark);font-weight:700">⚡ 경고 ${totalWarn}개</span>` : ''}
            </div>
        </div>`;

        /* ─── Run Bar Chart ─── */
        html += `
        <div class="chart-card" style="margin-bottom:20px">
            <div class="chart-header">
                <h3><i class="fas fa-chart-column"></i> Run별 평균 Yield 비교 — ${deviceName}</h3>
            </div>
            <div style="height:280px;padding:14px 18px">
                <canvas id="runYieldChart"></canvas>
            </div>
        </div>`;

        /* ─── Per-Run cards ─── */
        html += '<div class="run-container">';

        runKeys.forEach(run => {
            const lots   = byRun[run];
            const flagged = DataParser.detectLowYieldLots(lots);
            const stats   = (flagged[0] && flagged[0].stats) || DataParser.computeStats(lots.map(l=>l.yield));
            const lowCount  = flagged.filter(l=>l.isLowYield).length;
            const warnCount = flagged.filter(l=>l.isWarnYield).length;
            const totalU = lots.reduce((a,b)=>a+b.total,0);
            const totalP = lots.reduce((a,b)=>a+b.pass,0);
            const totalF = lots.reduce((a,b)=>a+b.fail,0);
            const runOverallYield = totalU > 0 ? (totalP/totalU*100) : 0;
            const threshold  = (stats.mean - stats.std).toFixed(2);

            html += `
            <div class="run-card">
                <div class="run-header">
                    <div class="run-title-wrap">
                        <div class="run-title">
                            <i class="fas fa-layer-group"></i>
                            Run: <strong>${run}</strong>
                        </div>
                        <div class="run-sub">${lots.length}개 Lot</div>
                    </div>
                    <div class="run-stats">
                        <div class="run-stat">
                            <div class="val">${runOverallYield.toFixed(2)}%</div>
                            <div class="lbl">종합 Yield</div>
                        </div>
                        <div class="run-stat">
                            <div class="val">${stats.mean.toFixed(2)}%</div>
                            <div class="lbl">Lot 평균</div>
                        </div>
                        <div class="run-stat">
                            <div class="val">±${stats.std.toFixed(3)}%</div>
                            <div class="lbl">표준편차</div>
                        </div>
                        <div class="run-stat">
                            <div class="val">${stats.min.toFixed(2)}%</div>
                            <div class="lbl">Min</div>
                        </div>
                        <div class="run-stat">
                            <div class="val">${stats.max.toFixed(2)}%</div>
                            <div class="lbl">Max</div>
                        </div>
                        <div class="run-stat">
                            <div class="val">${totalU.toLocaleString()}</div>
                            <div class="lbl">총 수량</div>
                        </div>
                        <div class="run-stat">
                            <div class="val" style="color:var(--danger-dark)">${totalF.toLocaleString()}</div>
                            <div class="lbl">총 불량</div>
                        </div>
                        ${lowCount  ? `<div class="run-stat"><div class="val" style="color:var(--danger-dark)">${lowCount}</div><div class="lbl">Low Yield</div></div>` : ''}
                        ${warnCount ? `<div class="run-stat"><div class="val" style="color:var(--warning-dark)">${warnCount}</div><div class="lbl">경고</div></div>` : ''}
                    </div>
                </div>
                <div class="run-body">
                    ${lowCount  ? `<div class="info-box danger"><i class="fas fa-triangle-exclamation"></i><span><strong>${lowCount}개 Lot</strong>이 Low Yield 기준 (평균 − 1σ = <strong>${threshold}%</strong>) 이하입니다.</span></div>` : ''}
                    ${warnCount ? `<div class="info-box warning"><i class="fas fa-circle-exclamation"></i><span><strong>${warnCount}개 Lot</strong>이 경고 구간 (평균 − 0.5σ)에 있습니다.</span></div>` : ''}
                    <div class="lot-table-wrapper">
                        <table class="lot-table">
                            <thead><tr>
                                <th>#</th>
                                <th>Lot No</th>
                                <th>Site</th>
                                <th>Tester</th>
                                <th>DATE</th>
                                <th>Total</th>
                                <th>Pass</th>
                                <th>Fail</th>
                                <th>Yield</th>
                                <th>vs Run평균</th>
                                <th>Top HBIN</th>
                                <th>Top SBIN</th>
                                <th></th>
                            </tr></thead>
                            <tbody>
                                ${flagged.map((lot, idx) => {
                                    const rc = lot.isLowYield ? 'lot-row-low' : lot.isWarnYield ? 'lot-row-warn' : '';
                                    const yc = lot.isLowYield ? 'bad' : lot.isWarnYield ? 'warn' : 'good';
                                    const topH = DataParser.getTopHbins(lot, 3);
                                    const topS = DataParser.getTopSbins(lot, 3);
                                    const dateStr = lot.date ? lot.date.toLocaleDateString('ko-KR') : lot.dateRaw || '—';
                                    const diffStr = (lot.yieldDiff >= 0 ? '+' : '') + lot.yieldDiff.toFixed(3) + '%';
                                    const dc = lot.yieldDiff < 0 ? 'var(--danger-dark)' : 'var(--success-dark)';
                                    return `<tr class="${rc}">
                                        <td style="color:var(--text-muted);font-size:11px">${idx+1}</td>
                                        <td>
                                            <span class="lot-link" onclick="AppState.selectLot('${lot.lotNo}')">${lot.lotNo}</span>
                                            ${lot.isLowYield  ? '<span class="badge badge-red" style="margin-left:5px">LOW</span>'  : ''}
                                            ${lot.isWarnYield ? '<span class="badge badge-orange" style="margin-left:5px">WARN</span>' : ''}
                                        </td>
                                        <td>${lot.site}</td>
                                        <td>${lot.tester}</td>
                                        <td>${dateStr}</td>
                                        <td>${lot.total.toLocaleString()}</td>
                                        <td>${lot.pass.toLocaleString()}</td>
                                        <td style="color:${lot.fail?'var(--danger-dark)':'inherit'};font-weight:${lot.fail?'600':'400'}">${lot.fail.toLocaleString()}</td>
                                        <td><span class="yield-badge ${yc}">${lot.yield.toFixed(2)}%</span></td>
                                        <td style="color:${dc};font-weight:600;font-size:11.5px">${diffStr}</td>
                                        <td>${topH.map(b=>`<span class="bin-tag hbin" title="${b.bin}: ${b.count.toLocaleString()}개 (${b.pct.toFixed(1)}%)">${b.bin}</span>`).join(' ')}</td>
                                        <td>${topS.map(b=>`<span class="bin-tag sbin" title="${b.bin}: ${b.count.toLocaleString()}개 (${b.pct.toFixed(1)}%)">${b.bin}</span>`).join(' ')}</td>
                                        <td>
                                            <button class="btn btn-sm btn-outline" onclick="AppState.selectLot('${lot.lotNo}')">
                                                <i class="fas fa-magnifying-glass"></i> BIN
                                            </button>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        });

        html += '</div>';
        container.innerHTML = html;

        /* ─── Render Run bar chart ─── */
        setTimeout(() => {
            const ctx = document.getElementById('runYieldChart');
            if (!ctx) return;
            _destroy('runYieldChart');

            const means = runSummary.map(r => +r.stats.mean.toFixed(3));
            const mins2 = runSummary.map(r => +r.stats.min.toFixed(3));
            const labels = runSummary.map(r => r.run);
            const gMean  = overallStats.mean;
            const gStd   = overallStats.std;

            _charts['runYieldChart'] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Run 평균 Yield (%)',
                            data: means,
                            backgroundColor: means.map(v =>
                                v < gMean - gStd         ? 'rgba(244,63,94,.75)'  :
                                v < gMean - 0.5*gStd     ? 'rgba(245,158,11,.7)' :
                                'rgba(59,130,246,.72)'
                            ),
                            borderColor: means.map(v =>
                                v < gMean - gStd         ? '#f43f5e'  :
                                v < gMean - 0.5*gStd     ? '#f59e0b' : '#3b82f6'
                            ),
                            borderWidth: 1.5, borderRadius: 5, order: 2
                        },
                        {
                            label: 'Min Yield (%)',
                            data: mins2,
                            type: 'line',
                            borderColor: '#f59e0b',
                            backgroundColor: 'transparent',
                            borderWidth: 1.5, borderDash: [5,3],
                            pointRadius: 4, order: 1
                        },
                        {
                            label: `Device 전체 평균 (${gMean.toFixed(2)}%)`,
                            data: labels.map(() => gMean),
                            type: 'line',
                            borderColor: '#94a3b8',
                            borderDash: [3,3], borderWidth: 1.5,
                            pointRadius: 0, backgroundColor: 'transparent', order: 0
                        },
                        {
                            label: `Low Yield 기준 (평균−1σ = ${(gMean-gStd).toFixed(2)}%)`,
                            data: labels.map(() => gMean - gStd),
                            type: 'line',
                            borderColor: 'rgba(244,63,94,.5)',
                            borderDash: [6,4], borderWidth: 1,
                            pointRadius: 0, backgroundColor: 'transparent', order: 0
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                afterBody: (items) => {
                                    const i = items[0].dataIndex;
                                    const s = runSummary[i].stats;
                                    return [
                                        `σ: ±${s.std.toFixed(3)}%`,
                                        `Max: ${s.max.toFixed(2)}%`,
                                        `Lots: ${runSummary[i].lots.length}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            min: Math.max(0, Math.min(...mins2) - 2),
                            max: 101,
                            ticks: { callback: v => v.toFixed(1)+'%' },
                            grid: { color: 'rgba(148,163,184,.08)' }
                        },
                        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
                    }
                }
            });
        }, 80);
    }

    return { renderRunAnalysis };
})();
