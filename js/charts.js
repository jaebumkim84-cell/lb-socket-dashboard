/**
 * charts.js — 개요(Overview) 탭 차트 렌더링
 * 슬레이트 그레이 + 소프트 블루 디자인 시스템
 */

const OverviewCharts = (() => {
    let _charts = {};

    function _destroy(id) {
        if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
    }

    /* ────────────────────────────────────────────────
       renderOverview : 개요 전체 렌더링 진입점
       ──────────────────────────────────────────────── */
    function renderOverview(data) {
        if (!data || !data.length) return;
        _updateCards(data);
        setTimeout(() => {
            _renderDeviceChart(data);
            _renderSiteDonut(data);
        }, 50);
        _renderLowYield(data);
    }

    /* ── KPI Summary Cards ─────────────────────────── */
    function _updateCards(data) {
        const totalUnits = data.reduce((s, r) => s + r.total, 0);
        const totalFail  = data.reduce((s, r) => s + r.fail,  0);
        const totalPass  = data.reduce((s, r) => s + r.pass,  0);
        // Overall yield = pass / total (weighted)
        const overallYield = totalUnits > 0 ? (totalPass / totalUnits * 100) : 0;
        const devices   = new Set(data.map(r => r.deviceName)).size;

        // Count low-yield lots (per device → run → low detection)
        let lowCount = 0;
        const byDevice = DataParser.groupByDevice(data);
        Object.values(byDevice).forEach(dl => {
            Object.values(DataParser.groupByRun(dl)).forEach(rl => {
                lowCount += DataParser.detectLowYieldLots(rl).filter(l => l.isLowYield).length;
            });
        });

        _set('totalLots',    data.length.toLocaleString());
        _set('totalUnits',   totalUnits.toLocaleString());
        _set('avgYield',     overallYield.toFixed(2) + '%');
        _set('lowYieldLots', lowCount.toLocaleString());
        _set('totalDevices', devices.toLocaleString());
        _set('totalFail',    totalFail.toLocaleString());

        // Color the avgYield card icon by level
        const avgEl = document.getElementById('avgYield');
        if (avgEl) {
            avgEl.style.color = overallYield >= 99.5 ? 'var(--success-dark)' :
                                 overallYield >= 98   ? 'var(--warning-dark)' : 'var(--danger-dark)';
        }
        const lowEl = document.getElementById('lowYieldLots');
        if (lowEl) {
            lowEl.style.color = lowCount > 0 ? 'var(--danger-dark)' : 'var(--success-dark)';
        }
    }

    function _set(id, v) {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
    }

    /* ── Device Yield Bar Chart ────────────────────── */
    function _renderDeviceChart(data) {
        const ctx = document.getElementById('deviceYieldChart');
        if (!ctx) return;
        _destroy('deviceYieldChart');

        const byDevice = DataParser.groupByDevice(data);
        const names  = Object.keys(byDevice).sort();
        const means  = names.map(d => {
            const lots = byDevice[d];
            const tu = lots.reduce((a,b)=>a+b.total,0);
            const tp = lots.reduce((a,b)=>a+b.pass,0);
            return tu > 0 ? +(tp/tu*100).toFixed(3) : 0;
        });
        const mins   = names.map(d => +DataParser.computeStats(byDevice[d].map(r => r.yield)).min.toFixed(3));
        const counts = names.map(d => byDevice[d].length);

        // Overall mean for threshold coloring
        const globalMean = means.reduce((a,b)=>a+b,0) / (means.length || 1);

        _charts['deviceYieldChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: names.map(n => n.length > 22 ? n.slice(0,22)+'…' : n),
                datasets: [
                    {
                        label: '종합 Yield (%)',
                        data: means,
                        backgroundColor: means.map(v =>
                            v < globalMean - 1   ? 'rgba(244,63,94,.72)'  :
                            v < globalMean - 0.3 ? 'rgba(245,158,11,.72)' :
                            'rgba(59,130,246,.72)'
                        ),
                        borderColor: means.map(v =>
                            v < globalMean - 1   ? '#f43f5e'  :
                            v < globalMean - 0.3 ? '#f59e0b' : '#3b82f6'
                        ),
                        borderWidth: 1.5,
                        borderRadius: 5,
                        order: 2
                    },
                    {
                        label: 'Min Yield (%)',
                        data: mins,
                        type: 'line',
                        borderColor: '#f43f5e',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [5, 3],
                        pointRadius: 4,
                        pointBackgroundColor: '#f43f5e',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const idx = items[0].dataIndex;
                                return names[idx];
                            },
                            afterBody: (items) => {
                                const i = items[0].dataIndex;
                                return [`Lot 수: ${counts[i]}`, `Min: ${mins[i].toFixed(2)}%`];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: Math.max(0, Math.min(...mins) - 2),
                        max: 101,
                        ticks: { callback: v => v.toFixed(1)+'%' },
                        grid: { color: 'rgba(148,163,184,.08)' }
                    },
                    x: {
                        ticks: { maxRotation: 35, font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    /* ── Site Doughnut Chart ───────────────────────── */
    function _renderSiteDonut(data) {
        const ctx = document.getElementById('sitePieChart');
        if (!ctx) return;
        _destroy('sitePieChart');

        const bySite = DataParser.groupBySite(data);
        const sites  = Object.keys(bySite).sort();
        const counts = sites.map(s => bySite[s].length);
        const yields = sites.map(s => {
            const lots = bySite[s];
            const tu = lots.reduce((a,b)=>a+b.total, 0);
            const tf = lots.reduce((a,b)=>a+b.fail,  0);
            return tu > 0 ? ((tu-tf)/tu*100).toFixed(2) : '—';
        });
        const colors = window.CHART_PIE_COLORS || [
            '#3b82f6','#60a5fa','#10b981','#f59e0b','#6366f1',
            '#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f43f5e'
        ];

        _charts['sitePieChart'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sites,
                datasets: [{
                    data: counts,
                    backgroundColor: sites.map((_, i) => colors[i % colors.length]),
                    borderColor: '#ffffff',
                    borderWidth: 2.5,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { position: 'right', labels: { padding: 14, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (item) => {
                                const tot = counts.reduce((a,b)=>a+b,0);
                                const pct = (item.raw/tot*100).toFixed(1);
                                return ` ${item.label}: ${item.raw}lots (${pct}%)  Yield ${yields[item.dataIndex]}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    /* ── Low Yield Overview ────────────────────────── */
    function _renderLowYield(data) {
        const container = document.getElementById('lowYieldOverview');
        if (!container) return;

        const lowLots = [];
        const byDevice = DataParser.groupByDevice(data);
        Object.entries(byDevice).forEach(([device, dl]) => {
            Object.entries(DataParser.groupByRun(dl)).forEach(([run, rl]) => {
                DataParser.detectLowYieldLots(rl)
                    .filter(l => l.isLowYield)
                    .forEach(lot => lowLots.push({ ...lot, device, run }));
            });
        });
        lowLots.sort((a,b) => a.yield - b.yield);

        if (!lowLots.length) {
            container.innerHTML = `
                <div class="info-box success" style="margin:16px 18px">
                    <i class="fas fa-circle-check"></i>
                    <span><strong>모든 Lot이 정상 Yield 범위 내에 있습니다.</strong>
                    Run 평균 − 1σ 이하 Lot이 없습니다.</span>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="info-box danger" style="margin:16px 18px 0">
                <i class="fas fa-triangle-exclamation"></i>
                <span><strong>${lowLots.length}개</strong>의 Low Yield Lot이 감지되었습니다.
                Lot 카드를 클릭하면 BIN 분석 탭으로 이동합니다.</span>
            </div>
            <div class="low-yield-grid">
                ${lowLots.map(lot => {
                    const topH = DataParser.getTopHbins(lot, 3);
                    const topS = DataParser.getTopSbins(lot, 3);
                    const diff = lot.yieldDiff.toFixed(3);
                    const dateStr = lot.date ? lot.date.toLocaleDateString('ko-KR') : lot.dateRaw || '—';
                    return `
                        <div class="low-yield-item" onclick="AppState.selectLot('${lot.lotNo}')">
                            <div class="lot-no">${lot.lotNo}</div>
                            <div class="device">${lot.deviceName} &nbsp;·&nbsp; ${lot.site} &nbsp;·&nbsp; Run: ${lot.run}</div>
                            <div class="yield-val">${lot.yield.toFixed(2)}%</div>
                            <div class="yield-diff">
                                Run 평균 <strong>${lot.runAvgYield.toFixed(2)}%</strong> 대비
                                <strong style="color:var(--danger-dark)">${diff}%</strong>
                                &nbsp;·&nbsp; ${dateStr}
                            </div>
                            <div class="top-bins">
                                ${topH.map(b=>`<span class="bin-tag hbin" title="${b.bin}: ${b.count.toLocaleString()}개 (${b.pct.toFixed(1)}%)">${b.bin} ${b.pct.toFixed(0)}%</span>`).join('')}
                                ${topS.map(b=>`<span class="bin-tag sbin" title="${b.bin}: ${b.count.toLocaleString()}개 (${b.pct.toFixed(1)}%)">${b.bin} ${b.pct.toFixed(0)}%</span>`).join('')}
                            </div>
                        </div>`;
                }).join('')}
            </div>`;
    }

    return { renderOverview, updateSummaryCards: _updateCards };
})();
