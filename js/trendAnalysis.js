/**
 * trendAnalysis.js — 주별 / 월별 트렌드 분석
 */

const TrendAnalysis = (() => {

    let _charts = {};

    const COLORS = [
        '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
        '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'
    ];

    function _destroy(id) {
        if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
    }

    /* ────────────────────────────────────────────────
       renderTrendAnalysis
       ──────────────────────────────────────────────── */
    function renderTrendAnalysis(filteredData, deviceFilter, period) {
        const container = document.getElementById('trendContent');
        if (!container) return;

        const data = deviceFilter
            ? filteredData.filter(r => r.deviceName === deviceFilter)
            : filteredData;

        if (!data.length) {
            container.innerHTML = '<div class="placeholder-msg"><i class="fas fa-inbox"></i> 선택 조건에 맞는 데이터가 없습니다.</div>';
            return;
        }

        const grouped = period === 'weekly'
            ? DataParser.groupByWeek(data)
            : DataParser.groupByMonth(data);

        const sortedKeys = Object.keys(grouped)
            .filter(k => k !== 'Unknown')
            .sort();

        if (!sortedKeys.length) {
            container.innerHTML = '<div class="placeholder-msg"><i class="fas fa-calendar-xmark"></i> 날짜 데이터가 없어 트렌드를 표시할 수 없습니다.</div>';
            return;
        }

        // Period stats
        const periodStats = sortedKeys.map(key => {
            const lots = grouped[key];
            const yields = lots.map(l => l.yield);
            const stats  = DataParser.computeStats(yields);
            const tu = lots.reduce((a,b)=>a+b.total,0);
            const tf = lots.reduce((a,b)=>a+b.fail, 0);
            const tp = lots.reduce((a,b)=>a+b.pass, 0);
            const overallYield = tu > 0 ? (tp/tu*100) : 0;
            return { key, lots, stats, totalUnits:tu, totalFail:tf, overallYield };
        });

        const deviceNames = deviceFilter
            ? [deviceFilter]
            : [...new Set(data.map(r => r.deviceName))].sort();
        const siteNames = [...new Set(data.map(r => r.site))].sort();
        const periodLabel = period === 'weekly' ? '주별' : '월별';

        /* ── Build HTML ── */
        let html = '<div class="trend-container">';

        // Overall Yield trend
        html += `
            <div class="trend-chart-card">
                <div class="chart-header">
                    <h3><i class="fas fa-chart-line"></i> ${periodLabel} 종합 Yield 트렌드</h3>
                </div>
                <div style="height:300px;padding:14px 18px">
                    <canvas id="overallTrendChart"></canvas>
                </div>
            </div>`;

        // Volume trend
        html += `
            <div class="trend-chart-card">
                <div class="chart-header">
                    <h3><i class="fas fa-boxes-stacked"></i> ${periodLabel} 수량 트렌드</h3>
                </div>
                <div style="height:260px;padding:14px 18px">
                    <canvas id="volumeTrendChart"></canvas>
                </div>
            </div>`;

        // Device trend (if multiple devices)
        if (deviceNames.length > 1) {
            html += `
                <div class="trend-chart-card">
                    <div class="chart-header">
                        <h3><i class="fas fa-layer-group"></i> ${periodLabel} Device별 Yield 트렌드 (상위 ${Math.min(deviceNames.length,10)}개)</h3>
                    </div>
                    <div style="height:320px;padding:14px 18px">
                        <canvas id="deviceTrendChart"></canvas>
                    </div>
                </div>`;
        }

        // Site trend (if multiple sites)
        if (siteNames.length > 1) {
            html += `
                <div class="trend-chart-card">
                    <div class="chart-header">
                        <h3><i class="fas fa-map-marker-alt"></i> ${periodLabel} Site별 Yield 트렌드</h3>
                    </div>
                    <div style="height:300px;padding:14px 18px">
                        <canvas id="siteTrendChart"></canvas>
                    </div>
                </div>`;
        }

        // Fail rate trend
        html += `
            <div class="trend-chart-card">
                <div class="chart-header">
                    <h3><i class="fas fa-chart-bar"></i> ${periodLabel} 불량률 트렌드 (100% − Yield)</h3>
                </div>
                <div style="height:260px;padding:14px 18px">
                    <canvas id="failTrendChart"></canvas>
                </div>
            </div>`;

        // Summary table
        html += `
            <div class="trend-chart-card">
                <div class="chart-header">
                    <h3><i class="fas fa-table"></i> ${periodLabel} 요약 테이블</h3>
                </div>
                <div style="padding:16px;overflow-x:auto">
                    ${_buildSummaryTable(periodStats, periodLabel)}
                </div>
            </div>`;

        html += '</div>';
        container.innerHTML = html;

        setTimeout(() => {
            _renderOverallTrend(sortedKeys, periodStats);
            _renderVolumeTrend(sortedKeys, periodStats);
            _renderFailTrend(sortedKeys, periodStats);
            if (deviceNames.length > 1) _renderDeviceTrend(sortedKeys, deviceNames, data, period);
            if (siteNames.length > 1)   _renderSiteTrend(sortedKeys, siteNames, data, period);
        }, 100);
    }

    /* ── Summary Table ──────────────────────────────── */
    function _buildSummaryTable(ps, periodLabel) {
        let h = `<table class="stat-table">
            <thead><tr>
                <th>${periodLabel} 기간</th>
                <th>Lot 수</th>
                <th>총 수량</th>
                <th>총 불량</th>
                <th>종합 Yield</th>
                <th>Lot 평균</th>
                <th>Min Yield</th>
                <th>Max Yield</th>
                <th>표준편차</th>
            </tr></thead><tbody>`;

        ps.forEach(p => {
            const yc = p.overallYield >= 99.5 ? '#15803d' : p.overallYield >= 98 ? '#d97706' : '#dc2626';
            h += `<tr>
                <td style="font-weight:600">${p.key}</td>
                <td>${p.lots.length}</td>
                <td>${p.totalUnits.toLocaleString()}</td>
                <td style="color:var(--danger-dark)">${p.totalFail.toLocaleString()}</td>
                <td style="font-weight:700;color:${yc}">${p.overallYield.toFixed(2)}%</td>
                <td>${p.stats.mean.toFixed(2)}%</td>
                <td style="color:var(--danger-dark)">${p.stats.min.toFixed(2)}%</td>
                <td style="color:var(--success-dark)">${p.stats.max.toFixed(2)}%</td>
                <td>±${p.stats.std.toFixed(3)}%</td>
            </tr>`;
        });

        h += '</tbody></table>';
        return h;
    }

    /* ── Overall Trend Chart ────────────────────────── */
    function _renderOverallTrend(labels, ps) {
        const ctx = document.getElementById('overallTrendChart');
        if (!ctx) return;
        _destroy('overallTrendChart');

        _charts['overallTrendChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: '종합 Yield (%)',
                        data: ps.map(p => +p.overallYield.toFixed(3)),
                        borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.1)',
                        borderWidth: 2.5, fill: true, tension: 0.3,
                        pointRadius: 5, pointBackgroundColor: '#3b82f6'
                    },
                    {
                        label: 'Lot 평균 Yield (%)',
                        data: ps.map(p => +p.stats.mean.toFixed(3)),
                        borderColor: '#10b981', backgroundColor: 'transparent',
                        borderWidth: 2, borderDash: [5,3], tension: 0.3, pointRadius: 4
                    },
                    {
                        label: 'Min Yield (%)',
                        data: ps.map(p => +p.stats.min.toFixed(3)),
                        borderColor: '#ef4444', backgroundColor: 'transparent',
                        borderWidth: 1.5, borderDash: [3,3], tension: 0.3, pointRadius: 3
                    }
                ]
            },
            options: _lineOptions()
        });
    }

    /* ── Volume Trend Chart ─────────────────────────── */
    function _renderVolumeTrend(labels, ps) {
        const ctx = document.getElementById('volumeTrendChart');
        if (!ctx) return;
        _destroy('volumeTrendChart');

        _charts['volumeTrendChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: '총 테스트 수량',
                        data: ps.map(p => p.totalUnits),
                        backgroundColor: 'rgba(59,130,246,.6)',
                        borderColor: '#2563eb', borderWidth: 1, borderRadius: 4, order: 2
                    },
                    {
                        label: 'Lot 수',
                        data: ps.map(p => p.lots.length),
                        type: 'line',
                        borderColor: '#f59e0b', backgroundColor: 'transparent',
                        borderWidth: 2, pointRadius: 4,
                        yAxisID: 'y1', order: 1
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y:  { ticks: { callback: v => v.toLocaleString() }, position: 'left' },
                    y1: { ticks: {}, position: 'right', grid: { drawOnChartArea: false } },
                    x:  { ticks: { maxRotation: 45 } }
                }
            }
        });
    }

    /* ── Fail Rate Trend Chart ──────────────────────── */
    function _renderFailTrend(labels, ps) {
        const ctx = document.getElementById('failTrendChart');
        if (!ctx) return;
        _destroy('failTrendChart');

        _charts['failTrendChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '불량률 (%)',
                    data: ps.map(p => +( 100 - p.overallYield ).toFixed(4)),
                    backgroundColor: ps.map(p => {
                        const fr = 100 - p.overallYield;
                        return fr > 2 ? 'rgba(220,38,38,.72)' : fr > 0.5 ? 'rgba(245,158,11,.7)' : 'rgba(34,197,94,.7)';
                    }),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { ticks: { callback: v => v.toFixed(2)+'%' } },
                    x: { ticks: { maxRotation: 45 } }
                }
            }
        });
    }

    /* ── Device Trend Chart ─────────────────────────── */
    function _renderDeviceTrend(labels, deviceNames, allData, period) {
        const ctx = document.getElementById('deviceTrendChart');
        if (!ctx) return;
        _destroy('deviceTrendChart');

        const datasets = deviceNames.slice(0, 10).map((dev, i) => {
            const dd = allData.filter(r => r.deviceName === dev);
            const grp = period === 'weekly' ? DataParser.groupByWeek(dd) : DataParser.groupByMonth(dd);
            return {
                label: dev.length > 28 ? dev.slice(0,28)+'…' : dev,
                data: labels.map(k => {
                    const lots = grp[k] || [];
                    if (!lots.length) return null;
                    const tu = lots.reduce((a,b)=>a+b.total,0);
                    const tp = lots.reduce((a,b)=>a+b.pass,0);
                    return tu>0 ? +(tp/tu*100).toFixed(3) : null;
                }),
                borderColor: COLORS[i % COLORS.length],
                backgroundColor: 'transparent',
                borderWidth: 2, tension: 0.3, pointRadius: 4, spanGaps: true
            };
        });

        _charts['deviceTrendChart'] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: _lineOptions()
        });
    }

    /* ── Site Trend Chart ───────────────────────────── */
    function _renderSiteTrend(labels, siteNames, allData, period) {
        const ctx = document.getElementById('siteTrendChart');
        if (!ctx) return;
        _destroy('siteTrendChart');

        const datasets = siteNames.slice(0, 8).map((site, i) => {
            const sd  = allData.filter(r => r.site === site);
            const grp = period === 'weekly' ? DataParser.groupByWeek(sd) : DataParser.groupByMonth(sd);
            return {
                label: site,
                data: labels.map(k => {
                    const lots = grp[k] || [];
                    if (!lots.length) return null;
                    const tu = lots.reduce((a,b)=>a+b.total,0);
                    const tp = lots.reduce((a,b)=>a+b.pass,0);
                    return tu>0 ? +(tp/tu*100).toFixed(3) : null;
                }),
                borderColor: COLORS[i % COLORS.length],
                backgroundColor: 'transparent',
                borderWidth: 2, tension: 0.3, pointRadius: 4, spanGaps: true
            };
        });

        _charts['siteTrendChart'] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: _lineOptions()
        });
    }

    function _lineOptions() {
        return {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { ticks: { callback: v => v.toFixed(2)+'%' } },
                x: { ticks: { maxRotation: 45 } }
            },
            interaction: { intersect: false, mode: 'index' }
        };
    }

    return { renderTrendAnalysis };
})();
