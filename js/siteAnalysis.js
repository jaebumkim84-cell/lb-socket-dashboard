/**
 * siteAnalysis.js — Site 편차 분석
 * Site별 Yield 통계, Site×Device 매트릭스, HBIN 비율 비교, Scatter
 */

const SiteAnalysis = (() => {

    let _charts = {};

    const SITE_COLORS = [
        '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
        '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'
    ];

    function _destroy(id) {
        if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
    }

    /* ────────────────────────────────────────────────
       renderSiteAnalysis
       ──────────────────────────────────────────────── */
    function renderSiteAnalysis(filteredData, deviceFilter) {
        const container = document.getElementById('siteAnalysisContent');
        if (!container) return;

        const data = deviceFilter
            ? filteredData.filter(r => r.deviceName === deviceFilter)
            : filteredData;

        const bySite = DataParser.groupBySite(data);
        const sites  = Object.keys(bySite).sort();

        if (!sites.length) {
            container.innerHTML = '<div class="placeholder-msg"><i class="fas fa-inbox"></i> 데이터가 없습니다.</div>';
            return;
        }

        // Per-site stats
        const siteStats = sites.map((site, i) => {
            const lots = bySite[site];
            const yields = lots.map(l => l.yield);
            const stats  = DataParser.computeStats(yields);
            const totalUnits = lots.reduce((a,b)=>a+b.total,0);
            const totalFail  = lots.reduce((a,b)=>a+b.fail, 0);
            const totalPass  = lots.reduce((a,b)=>a+b.pass, 0);
            const overallYield = totalUnits > 0 ? (totalPass/totalUnits*100) : 0;
            const agg    = DataParser.aggregateBins(lots);
            const lowCount = (() => {
                let cnt = 0;
                const byDevice = DataParser.groupByDevice(lots);
                Object.values(byDevice).forEach(dl => {
                    Object.values(DataParser.groupByRun(dl)).forEach(rl => {
                        cnt += DataParser.detectLowYieldLots(rl).filter(l=>l.isLowYield).length;
                    });
                });
                return cnt;
            })();
            return {
                site, lots, stats, totalUnits, totalFail, overallYield, agg, lowCount,
                color: SITE_COLORS[i % SITE_COLORS.length]
            };
        });

        const deviceNames = [...new Set(data.map(r => r.deviceName))].sort();

        /* ── Build HTML ── */
        let html = '<div class="site-analysis-wrap">';

        /* 1. Site Yield Comparison Chart */
        html += `
            <div class="chart-card">
                <div class="chart-header">
                    <h3><i class="fas fa-balance-scale"></i> Site별 Yield 비교 (평균 / Min / Max)</h3>
                </div>
                <div style="height:300px;padding:14px 18px">
                    <canvas id="siteBoxChart"></canvas>
                </div>
            </div>`;

        /* 2. Site Summary Cards */
        html += `<div class="site-grid">`;
        siteStats.forEach(ss => {
            html += `
                <div class="site-card" style="border-top:4px solid ${ss.color}">
                    <div class="site-card-header" style="background:${ss.color}18">
                        <span><i class="fas fa-map-marker-alt" style="color:${ss.color}"></i> ${ss.site}</span>
                        <span class="badge badge-blue">${ss.lots.length} Lots</span>
                    </div>
                    <div class="site-card-body">
                        <div class="site-stat-row">
                            <span class="site-stat-label">종합 Yield</span>
                            <span class="site-stat-value" style="color:${ss.overallYield<98?'var(--danger-dark)':ss.overallYield<99.5?'var(--warning-dark)':'var(--success-dark)'}">
                                ${ss.overallYield.toFixed(2)}%
                            </span>
                        </div>
                        <div class="site-stat-row">
                            <span class="site-stat-label">Lot 평균 Yield</span>
                            <span class="site-stat-value">${ss.stats.mean.toFixed(2)}%</span>
                        </div>
                        <div class="site-stat-row">
                            <span class="site-stat-label">표준편차</span>
                            <span class="site-stat-value">±${ss.stats.std.toFixed(3)}%</span>
                        </div>
                        <div class="site-stat-row">
                            <span class="site-stat-label">Min / Max</span>
                            <span class="site-stat-value">${ss.stats.min.toFixed(2)}% / ${ss.stats.max.toFixed(2)}%</span>
                        </div>
                        <div class="site-stat-row">
                            <span class="site-stat-label">총 수량</span>
                            <span class="site-stat-value">${ss.totalUnits.toLocaleString()}</span>
                        </div>
                        <div class="site-stat-row">
                            <span class="site-stat-label">총 불량</span>
                            <span class="site-stat-value" style="color:var(--danger-dark)">${ss.totalFail.toLocaleString()}</span>
                        </div>
                        ${ss.lowCount ? `
                        <div class="site-stat-row">
                            <span class="site-stat-label">Low Yield Lots</span>
                            <span class="site-stat-value" style="color:var(--danger-dark)">⚠ ${ss.lowCount}개</span>
                        </div>` : ''}
                    </div>
                </div>`;
        });
        html += '</div>';

        /* 3. Site × Device Matrix */
        if (deviceNames.length > 0) {
            html += `
                <div class="chart-card">
                    <div class="chart-header">
                        <h3><i class="fas fa-th"></i> Site × Device Yield 매트릭스</h3>
                        <span style="font-size:10.5px;color:var(--text-muted)">
                            <span style="background:#dcfce7;color:#15803d;padding:1px 6px;border-radius:4px;margin-right:4px">≥99.5%</span>
                            <span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;margin-right:4px">≥98.5%</span>
                            <span style="background:#fed7aa;color:#ea580c;padding:1px 6px;border-radius:4px;margin-right:4px">≥97%</span>
                            <span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px">&lt;97%</span>
                        </span>
                    </div>
                    <div style="padding:16px;overflow-x:auto">
                        ${_buildMatrix(siteStats, deviceNames, data)}
                    </div>
                </div>`;
        }

        /* 4. Site HBIN comparison */
        html += `
            <div class="chart-card">
                <div class="chart-header">
                    <h3><i class="fas fa-chart-bar"></i> Site별 HBIN 불량 비율 비교 (HBIN02~10)</h3>
                </div>
                <div style="height:320px;padding:14px 18px">
                    <canvas id="siteHbinChart"></canvas>
                </div>
            </div>`;

        /* 5. Site Scatter */
        html += `
            <div class="chart-card">
                <div class="chart-header">
                    <h3><i class="fas fa-circle-dot"></i> Site별 Lot Yield 분포 (Scatter)</h3>
                </div>
                <div style="height:360px;padding:14px 18px">
                    <canvas id="siteScatterChart"></canvas>
                </div>
            </div>`;

        html += '</div>';
        container.innerHTML = html;

        setTimeout(() => {
            _renderBoxChart(siteStats);
            _renderHbinChart(siteStats);
            _renderScatterChart(siteStats);
        }, 100);
    }

    /* ── Site × Device Matrix ──────────────────────── */
    function _buildMatrix(siteStats, deviceNames, allData) {
        const sites = siteStats.map(s => s.site);

        let h = '<table class="stat-table" style="min-width:500px">';
        h += '<thead><tr><th style="min-width:180px">Device / Site</th>';
        sites.forEach(s => {
            h += `<th style="text-align:center;min-width:110px">${s}</th>`;
        });
        h += '</tr></thead><tbody>';

        deviceNames.forEach(dev => {
            h += `<tr><td style="font-weight:600;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${dev}">${dev.length>28?dev.slice(0,28)+'…':dev}</td>`;
            sites.forEach(site => {
                const lots = allData.filter(r => r.site===site && r.deviceName===dev);
                if (!lots.length) {
                    h += '<td style="text-align:center;color:var(--text-muted)">—</td>';
                } else {
                    const tu = lots.reduce((a,b)=>a+b.total,0);
                    const tp = lots.reduce((a,b)=>a+b.pass,0);
                    const yld = tu>0 ? (tp/tu*100) : 0;
                    const bg = yld>=99.5 ? '#dcfce7' : yld>=98.5 ? '#fef3c7' : yld>=97 ? '#fed7aa' : '#fee2e2';
                    const tc = yld>=99.5 ? '#15803d' : yld>=98.5 ? '#d97706' : yld>=97 ? '#ea580c' : '#dc2626';
                    h += `<td style="text-align:center;background:${bg};color:${tc};font-weight:700">
                        ${yld.toFixed(2)}%<br>
                        <span style="font-size:9px;font-weight:400;color:${tc}88">${lots.length} lots</span>
                    </td>`;
                }
            });
            h += '</tr>';
        });

        h += '</tbody></table>';
        return h;
    }

    /* ── Site Bar Chart (Avg/Min/Max) ──────────────── */
    function _renderBoxChart(siteStats) {
        const ctx = document.getElementById('siteBoxChart');
        if (!ctx) return;
        _destroy('siteBoxChart');

        _charts['siteBoxChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: siteStats.map(s => s.site),
                datasets: [
                    {
                        label: '평균 Yield (%)',
                        data: siteStats.map(s => +s.stats.mean.toFixed(3)),
                        backgroundColor: siteStats.map((s,i) => SITE_COLORS[i%SITE_COLORS.length] + 'B0'),
                        borderColor:     siteStats.map((s,i) => SITE_COLORS[i%SITE_COLORS.length]),
                        borderWidth: 1.5, borderRadius: 5, order: 2
                    },
                    {
                        label: 'Min Yield (%)',
                        data: siteStats.map(s => +s.stats.min.toFixed(3)),
                        type: 'line',
                        borderColor: '#ef4444', backgroundColor: 'transparent',
                        borderWidth: 2, pointRadius: 5, borderDash: [4,3], order: 1
                    },
                    {
                        label: 'Max Yield (%)',
                        data: siteStats.map(s => +s.stats.max.toFixed(3)),
                        type: 'line',
                        borderColor: '#22c55e', backgroundColor: 'transparent',
                        borderWidth: 2, pointRadius: 5, borderDash: [4,3], order: 1
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
                                const idx = items[0].dataIndex;
                                const ss  = siteStats[idx];
                                return [
                                    `σ: ±${ss.stats.std.toFixed(3)}%`,
                                    `종합 Yield: ${ss.overallYield.toFixed(2)}%`,
                                    `Lots: ${ss.lots.length}`,
                                    `Low Yield: ${ss.lowCount}개`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: Math.max(0, Math.min(...siteStats.map(s=>s.stats.min)) - 3),
                        max: 101,
                        ticks: { callback: v => v.toFixed(1)+'%' }
                    }
                }
            }
        });
    }

    /* ── Site HBIN stacked / grouped bar ───────────── */
    function _renderHbinChart(siteStats) {
        const ctx = document.getElementById('siteHbinChart');
        if (!ctx) return;
        _destroy('siteHbinChart');

        const hbinKeys = DataParser.HBIN_COLS.slice(1); // HBIN02~10
        const colors   = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#06b6d4','#6366f1','#8b5cf6'];

        const datasets = hbinKeys.map((key, ki) => ({
            label: key,
            data: siteStats.map(ss => {
                const tf  = ss.totalFail;
                const val = ss.agg.hbins[key] || 0;
                return tf > 0 ? +(val/tf*100).toFixed(3) : 0;
            }),
            backgroundColor: colors[ki] + 'B0',
            borderColor:     colors[ki],
            borderWidth: 1, borderRadius: 3
        }));

        _charts['siteHbinChart'] = new Chart(ctx, {
            type: 'bar',
            data: { labels: siteStats.map(s => s.site), datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font:{size:10}, boxWidth:10 } },
                    tooltip: { callbacks: { label: item => ` ${item.dataset.label}: ${item.raw.toFixed(2)}%` } }
                },
                scales: {
                    x: { stacked: false },
                    y: { ticks: { callback: v => v.toFixed(1)+'%' } }
                }
            }
        });
    }

    /* ── Site Scatter ───────────────────────────────── */
    function _renderScatterChart(siteStats) {
        const ctx = document.getElementById('siteScatterChart');
        if (!ctx) return;
        _destroy('siteScatterChart');

        const datasets = siteStats.map((ss, i) => ({
            label: ss.site,
            data: ss.lots.map((lot, idx) => ({ x: idx, y: lot.yield })),
            backgroundColor: SITE_COLORS[i%SITE_COLORS.length] + '99',
            borderColor:     SITE_COLORS[i%SITE_COLORS.length],
            pointRadius: 5, pointHoverRadius: 7
        }));

        _charts['siteScatterChart'] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (item) => {
                                const ss  = siteStats.find(s => s.site === item.dataset.label);
                                const lot = ss ? ss.lots[item.dataIndex] : null;
                                return lot ? ` ${lot.lotNo}: ${lot.yield.toFixed(2)}%` : `${item.parsed.y.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: Math.max(0, Math.min(...siteStats.flatMap(s=>s.lots.map(l=>l.yield))) - 2),
                        max: 101,
                        ticks: { callback: v => v.toFixed(1)+'%' }
                    },
                    x: { display: false }
                }
            }
        });
    }

    return { renderSiteAnalysis };
})();
