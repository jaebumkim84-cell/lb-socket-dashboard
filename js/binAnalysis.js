/**
 * binAnalysis.js — HBIN / SBIN 불량 분석
 * 선택한 Lot No의 HBIN02~10 & SBIN002~100 분석
 * + 동일 Run 내 비교
 */

const BinAnalysis = (() => {

    let _charts = {};

    const HBIN_COLORS = [
        '#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6',
        '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'
    ];

    function _destroyChart(id) {
        if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
    }

    /* ──────────────────────────────────────────────
       renderBinAnalysis
       ────────────────────────────────────────────── */
    function renderBinAnalysis(lotNo, filteredData) {
        const container = document.getElementById('binAnalysisContent');
        if (!container) return;

        // Find all rows for this lot (could be multi-site)
        const lots = filteredData.filter(r => r.lotNo === lotNo);
        if (!lots.length) {
            container.innerHTML = `<div class="placeholder-msg"><i class="fas fa-search"></i> Lot No "${lotNo}"를 찾을 수 없습니다.</div>`;
            return;
        }

        const mainLot = lots[0];
        // Aggregate bins if multi-site
        const agg = lots.length > 1
            ? DataParser.aggregateBins(lots)
            : { hbins: mainLot.hbins, sbins: mainLot.sbins };

        const totalFail  = lots.reduce((a,b) => a + b.fail,  0);
        const totalPass  = lots.reduce((a,b) => a + b.pass,  0);
        const totalUnits = lots.reduce((a,b) => a + b.total, 0);
        const lotYield   = totalUnits > 0 ? (totalPass / totalUnits * 100) : 0;

        // Run context (same device)
        const run = DataParser.getRun(lotNo);
        const runLots = filteredData.filter(r => r.run === run && r.deviceName === mainLot.deviceName);
        const runYields = runLots.map(l => l.yield);
        const runStats  = DataParser.computeStats(runYields);
        const isLow     = lotYield < runStats.mean - runStats.std;
        const isWarn    = !isLow && lotYield < runStats.mean - 0.5 * runStats.std;

        // HBIN 02~10
        const hbinData = [];
        for (let i = 2; i <= 10; i++) {
            const key = 'HBIN' + String(i).padStart(2,'0');
            const val = agg.hbins[key] || 0;
            hbinData.push({ bin: key, count: val, pct: totalFail > 0 ? val/totalFail*100 : 0 });
        }
        hbinData.sort((a,b) => b.count - a.count);
        const activeHbins = hbinData.filter(h => h.count > 0);

        // SBIN 002~100
        const sbinData = [];
        for (let i = 2; i <= 100; i++) {
            const key = 'SBIN' + String(i).padStart(3,'0');
            const val = agg.sbins[key] || 0;
            if (val > 0) sbinData.push({ bin: key, count: val, pct: totalFail > 0 ? val/totalFail*100 : 0 });
        }
        sbinData.sort((a,b) => b.count - a.count);
        const topSbins = sbinData.slice(0, 20);

        /* ── HTML ── */
        let html = '<div class="bin-container">';

        /* Section 1: Lot Info */
        html += `
            <div class="bin-section">
                <h3><i class="fas fa-info-circle" style="color:var(--primary)"></i> Lot 기본 정보</h3>
                ${isLow  ? `<div class="info-box danger" style="margin-bottom:12px"><i class="fas fa-exclamation-triangle"></i> <strong>Low Yield 감지!</strong> Run 평균(${runStats.mean.toFixed(2)}%) 대비 −1σ 기준(${(runStats.mean-runStats.std).toFixed(2)}%) 이하입니다.</div>` : ''}
                ${isWarn ? `<div class="info-box warning" style="margin-bottom:12px"><i class="fas fa-circle-exclamation"></i> <strong>경고:</strong> Run 평균 − 0.5σ 이하 구간입니다.</div>` : ''}
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px">
                    <div class="stat-card-sm"><span class="lbl">Lot No</span><span class="val">${lotNo}</span></div>
                    <div class="stat-card-sm"><span class="lbl">Device</span><span class="val" title="${mainLot.deviceName}">${mainLot.deviceName.length>24?mainLot.deviceName.slice(0,24)+'…':mainLot.deviceName}</span></div>
                    <div class="stat-card-sm"><span class="lbl">Run (앞 7자리)</span><span class="val">${run}</span></div>
                    <div class="stat-card-sm"><span class="lbl">Site</span><span class="val">${lots.map(l=>l.site).join(', ')}</span></div>
                    <div class="stat-card-sm"><span class="lbl">DATE</span><span class="val">${mainLot.date ? mainLot.date.toLocaleDateString('ko-KR') : mainLot.dateRaw || '—'}</span></div>
                    <div class="stat-card-sm"><span class="lbl">Tester</span><span class="val">${[...new Set(lots.map(l=>l.tester))].join(', ')}</span></div>
                    <div class="stat-card-sm"><span class="lbl">Total</span><span class="val">${totalUnits.toLocaleString()}</span></div>
                    <div class="stat-card-sm"><span class="lbl">Pass</span><span class="val" style="color:var(--success-dark)">${totalPass.toLocaleString()}</span></div>
                    <div class="stat-card-sm"><span class="lbl">Fail</span><span class="val" style="color:var(--danger-dark)">${totalFail.toLocaleString()}</span></div>
                    <div class="stat-card-sm">
                        <span class="lbl">Yield</span>
                        <span class="val" style="color:${isLow?'var(--danger-dark)':isWarn?'var(--warning-dark)':'var(--success-dark)'}">${lotYield.toFixed(2)}%</span>
                    </div>
                    <div class="stat-card-sm"><span class="lbl">Run 평균 Yield</span><span class="val">${runStats.mean.toFixed(2)}%</span></div>
                    <div class="stat-card-sm">
                        <span class="lbl">vs Run 평균</span>
                        <span class="val" style="color:${lotYield<runStats.mean?'var(--danger-dark)':'var(--success-dark)'}">${(lotYield-runStats.mean>=0?'+':'')+(lotYield-runStats.mean).toFixed(3)}%</span>
                    </div>
                </div>
            </div>`;

        /* Section 2: HBIN Charts */
        html += `
            <div class="bin-charts-row">
                <div class="bin-section">
                    <h3><i class="fas fa-chart-bar" style="color:var(--danger)"></i> HBIN 불량 분포 (HBIN02 ~ HBIN10)</h3>
                    ${activeHbins.length === 0
                        ? '<div style="color:var(--text-muted);text-align:center;padding:30px 0;font-size:13px">HBIN 불량 데이터 없음</div>'
                        : `<div class="bin-bars">${activeHbins.map((h,i) => _renderBinBar(h.bin, h.count, totalFail, HBIN_COLORS[i % HBIN_COLORS.length])).join('')}</div>`
                    }
                </div>
                <div class="bin-section" style="display:flex;flex-direction:column">
                    <h3><i class="fas fa-chart-pie" style="color:var(--danger)"></i> HBIN 파이 차트</h3>
                    <div style="flex:1;min-height:220px;position:relative">
                        ${activeHbins.length > 0
                            ? `<canvas id="hbinPieChart"></canvas>`
                            : `<div style="display:flex;align-items:center;justify-content:center;height:220px;color:var(--text-muted)">데이터 없음</div>`
                        }
                    </div>
                </div>
            </div>`;

        /* Section 3: SBIN bars */
        html += `
            <div class="bin-section">
                <h3><i class="fas fa-list-ol" style="color:var(--warning-dark)"></i>
                    SBIN 불량 분석 (SBIN002 ~ SBIN100)
                    <span style="font-size:11px;color:var(--text-muted);margin-left:6px;font-weight:400">상위 ${topSbins.length}개 표시</span>
                </h3>
                ${topSbins.length === 0
                    ? '<div style="color:var(--text-muted);text-align:center;padding:24px 0">SBIN 불량 데이터 없음</div>'
                    : `<div class="bin-bars">${topSbins.map((s,i) => _renderBinBar(s.bin, s.count, totalFail, _gradColor(i))).join('')}</div>`
                }
            </div>`;

        /* Section 4: SBIN Bar Chart */
        if (topSbins.length > 0) {
            html += `
                <div class="bin-section">
                    <h3><i class="fas fa-chart-bar" style="color:#8b5cf6"></i> SBIN 불량 수량 차트 (상위 ${Math.min(topSbins.length,20)}개)</h3>
                    <div style="height:300px">
                        <canvas id="sbinBarChart"></canvas>
                    </div>
                </div>`;
        }

        /* Section 5: Same-run comparison */
        if (runLots.length > 1) {
            html += `
                <div class="bin-section">
                    <h3><i class="fas fa-layer-group" style="color:var(--primary)"></i>
                        동일 Run 내 Lot 비교 (Run: ${run})
                        <span style="font-size:11px;color:var(--text-muted);margin-left:6px;font-weight:400">${runLots.length}개 Lot</span>
                    </h3>
                    <div style="height:280px">
                        <canvas id="runCompareChart"></canvas>
                    </div>
                </div>`;
        }

        html += '</div>';
        container.innerHTML = html;

        /* ── Charts ── */
        setTimeout(() => {
            // HBIN Pie
            if (activeHbins.length > 0) {
                const pieCtx = document.getElementById('hbinPieChart');
                if (pieCtx) {
                    _destroyChart('hbinPieChart');
                    _charts['hbinPieChart'] = new Chart(pieCtx, {
                        type: 'doughnut',
                        data: {
                            labels: activeHbins.map(h => h.bin),
                            datasets: [{
                                data: activeHbins.map(h => h.count),
                                backgroundColor: activeHbins.map((_,i) => HBIN_COLORS[i % HBIN_COLORS.length]),
                                borderWidth: 2, borderColor: '#fff'
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            cutout: '52%',
                            plugins: {
                                legend: { position: 'right', labels: { font:{size:10}, boxWidth:10 } },
                                tooltip: {
                                    callbacks: {
                                        label: (item) => {
                                            const pct = totalFail > 0 ? (item.raw/totalFail*100).toFixed(1) : 0;
                                            return ` ${item.label}: ${item.raw.toLocaleString()} (${pct}%)`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }

            // SBIN Bar
            if (topSbins.length > 0) {
                const sbCtx = document.getElementById('sbinBarChart');
                if (sbCtx) {
                    _destroyChart('sbinBarChart');
                    _charts['sbinBarChart'] = new Chart(sbCtx, {
                        type: 'bar',
                        data: {
                            labels: topSbins.map(s => s.bin),
                            datasets: [{
                                label: '불량 수량',
                                data: topSbins.map(s => s.count),
                                backgroundColor: topSbins.map((_,i) => _gradColor(i) + 'CC'),
                                borderColor:     topSbins.map((_,i) => _gradColor(i)),
                                borderWidth: 1, borderRadius: 3
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        afterLabel: (item) => `불량률: ${topSbins[item.dataIndex].pct.toFixed(2)}%`
                                    }
                                }
                            },
                            scales: {
                                y: { ticks: { font:{size:10} } },
                                x: { ticks: { font:{size:10} } }
                            }
                        }
                    });
                }
            }

            // Run Compare
            if (runLots.length > 1) {
                const rcCtx = document.getElementById('runCompareChart');
                if (rcCtx) {
                    _destroyChart('runCompareChart');
                    const sorted = [...runLots].sort((a,b) => a.yield - b.yield);
                    _charts['runCompareChart'] = new Chart(rcCtx, {
                        type: 'bar',
                        data: {
                            labels: sorted.map(l => l.lotNo),
                            datasets: [
                                {
                                    label: 'Yield (%)',
                                    data: sorted.map(l => l.yield),
                                    backgroundColor: sorted.map(l =>
                                        l.lotNo === lotNo   ? 'rgba(220,38,38,.85)' :
                                        l.yield < runStats.mean - runStats.std ? 'rgba(239,68,68,.55)' :
                                        'rgba(37,99,235,.55)'
                                    ),
                                    borderColor: sorted.map(l =>
                                        l.lotNo === lotNo ? '#dc2626' : '#3b82f6'
                                    ),
                                    borderWidth: 1.5, borderRadius: 4
                                },
                                {
                                    type: 'line',
                                    label: `Run 평균 (${runStats.mean.toFixed(2)}%)`,
                                    data: sorted.map(() => runStats.mean),
                                    borderColor: '#f59e0b', borderDash:[5,5],
                                    borderWidth: 2, pointRadius: 0
                                },
                                {
                                    type: 'line',
                                    label: `Low 기준 (${(runStats.mean-runStats.std).toFixed(2)}%)`,
                                    data: sorted.map(() => runStats.mean - runStats.std),
                                    borderColor: 'rgba(239,68,68,.5)', borderDash:[3,3],
                                    borderWidth: 1.5, pointRadius: 0
                                }
                            ]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { labels:{ font:{size:11} } } },
                            scales: {
                                y: {
                                    min: Math.max(0, Math.min(...sorted.map(l=>l.yield)) - 2),
                                    max: 101,
                                    ticks: { font:{size:10}, callback: v=>v.toFixed(1)+'%' }
                                },
                                x: { ticks: { font:{size:9}, maxRotation:45 } }
                            }
                        }
                    });
                }
            }
        }, 150);
    }

    /* ── Helper: bin progress bar HTML ─────────────── */
    function _renderBinBar(label, count, totalFail, color) {
        const pct = totalFail > 0 ? (count / totalFail * 100) : 0;
        return `
            <div class="bin-bar-row">
                <div class="bin-label">${label}</div>
                <div class="bin-bar-wrap">
                    <div class="bin-bar-fill" style="width:${Math.min(pct,100)}%;background:${color}">
                        ${pct > 10 ? pct.toFixed(1)+'%' : ''}
                    </div>
                </div>
                <div class="bin-count">${count.toLocaleString()}</div>
                <div class="bin-pct" style="color:${color}">${pct.toFixed(2)}%</div>
            </div>`;
    }

    /* ── Gradient color palette for SBIN bars ──────── */
    function _gradColor(idx) {
        const palette = [
            '#ef4444','#f97316','#f59e0b','#eab308','#84cc16',
            '#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1',
            '#8b5cf6','#a855f7','#ec4899','#f43f5e','#fb923c',
            '#facc15','#a3e635','#4ade80','#2dd4bf','#38bdf8'
        ];
        return palette[idx % palette.length];
    }

    /* ── Populate Lot dropdown ──────────────────────── */
    function populateLotSelect(filteredData) {
        const sel = document.getElementById('binLotSelect');
        if (!sel) return;
        const currentVal = sel.value;

        // Detect low-yield lots for grouping
        const lowLotNos = new Set();
        const warnLotNos = new Set();
        const byDevice = DataParser.groupByDevice(filteredData);
        Object.values(byDevice).forEach(dl => {
            Object.values(DataParser.groupByRun(dl)).forEach(rl => {
                DataParser.detectLowYieldLots(rl).forEach(l => {
                    if (l.isLowYield)  lowLotNos.add(l.lotNo);
                    if (l.isWarnYield) warnLotNos.add(l.lotNo);
                });
            });
        });

        // Build unique lot list
        const seen = new Set();
        const lots = [];
        filteredData.forEach(r => {
            if (!seen.has(r.lotNo)) {
                seen.add(r.lotNo);
                lots.push({ lotNo: r.lotNo, device: r.deviceName, yield: r.yield });
            }
        });
        // Sort: low first, then by yield asc
        lots.sort((a,b) => {
            const aLow = lowLotNos.has(a.lotNo) ? 0 : warnLotNos.has(a.lotNo) ? 1 : 2;
            const bLow = lowLotNos.has(b.lotNo) ? 0 : warnLotNos.has(b.lotNo) ? 1 : 2;
            if (aLow !== bLow) return aLow - bLow;
            return a.yield - b.yield;
        });

        sel.innerHTML = '<option value="">Lot No 선택...</option>';
        if (lowLotNos.size > 0) {
            const grp = document.createElement('optgroup');
            grp.label = '⚠ Low Yield Lots';
            lots.filter(l => lowLotNos.has(l.lotNo)).forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.lotNo;
                opt.textContent = `${l.lotNo} — ${l.yield.toFixed(2)}% [LOW]`;
                if (l.lotNo === currentVal) opt.selected = true;
                grp.appendChild(opt);
            });
            sel.appendChild(grp);
        }
        if (warnLotNos.size > 0) {
            const grp = document.createElement('optgroup');
            grp.label = '⚡ Warning Lots';
            lots.filter(l => warnLotNos.has(l.lotNo)).forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.lotNo;
                opt.textContent = `${l.lotNo} — ${l.yield.toFixed(2)}% [WARN]`;
                if (l.lotNo === currentVal) opt.selected = true;
                grp.appendChild(opt);
            });
            sel.appendChild(grp);
        }
        const normalGrp = document.createElement('optgroup');
        normalGrp.label = '✓ Normal Lots';
        lots.filter(l => !lowLotNos.has(l.lotNo) && !warnLotNos.has(l.lotNo)).forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.lotNo;
            opt.textContent = `${l.lotNo} (${l.device}) — ${l.yield.toFixed(2)}%`;
            if (l.lotNo === currentVal) opt.selected = true;
            normalGrp.appendChild(opt);
        });
        sel.appendChild(normalGrp);
    }

    return { renderBinAnalysis, populateLotSelect };
})();
