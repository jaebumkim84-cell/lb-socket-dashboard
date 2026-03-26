/**
 * chartDefaults.js
 * Chart.js 전역 기본값 — 슬레이트 그레이 + 소프트 블루 디자인 시스템
 * index.html에서 Chart.js 로드 직후 실행
 */
(function applyChartDefaults() {
    if (typeof Chart === 'undefined') return;

    // ── Global font ──────────────────────────────────────────────
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = '#64748b';   // slate-500

    // ── Responsive & layout ──────────────────────────────────────
    Chart.defaults.responsive         = true;
    Chart.defaults.maintainAspectRatio = false;

    // ── Plugins ──────────────────────────────────────────────────
    Chart.defaults.plugins.legend.position = 'top';
    Chart.defaults.plugins.legend.labels.boxWidth  = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.legend.labels.padding   = 16;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle    = 'circle';
    Chart.defaults.plugins.legend.labels.color         = '#475569';  // slate-600

    Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';    // slate-900
    Chart.defaults.plugins.tooltip.titleColor      = '#e2e8f0';    // slate-200
    Chart.defaults.plugins.tooltip.bodyColor       = '#94a3b8';    // slate-400
    Chart.defaults.plugins.tooltip.borderColor     = '#334155';    // slate-700
    Chart.defaults.plugins.tooltip.borderWidth     = 1;
    Chart.defaults.plugins.tooltip.padding         = 10;
    Chart.defaults.plugins.tooltip.cornerRadius    = 8;
    Chart.defaults.plugins.tooltip.titleFont       = { weight: '600', size: 11 };
    Chart.defaults.plugins.tooltip.bodyFont        = { size: 11 };
    Chart.defaults.plugins.tooltip.displayColors   = true;
    Chart.defaults.plugins.tooltip.boxPadding      = 3;

    // ── Scales ───────────────────────────────────────────────────
    Chart.defaults.scale.grid.color       = 'rgba(148,163,184,.1)';  // slate-400 10%
    Chart.defaults.scale.grid.borderColor = 'rgba(148,163,184,.15)';
    Chart.defaults.scale.ticks.color      = '#94a3b8';               // slate-400
    Chart.defaults.scale.ticks.padding    = 6;

    // ── Elements ─────────────────────────────────────────────────
    Chart.defaults.elements.bar.borderRadius = 4;
    Chart.defaults.elements.bar.borderSkipped = false;

    Chart.defaults.elements.line.borderWidth = 2;
    Chart.defaults.elements.line.tension     = 0.35;
    Chart.defaults.elements.line.borderCapStyle = 'round';

    Chart.defaults.elements.point.radius      = 4;
    Chart.defaults.elements.point.hoverRadius = 6;
    Chart.defaults.elements.point.borderWidth = 2;

    Chart.defaults.elements.arc.borderWidth = 2;
    Chart.defaults.elements.arc.borderColor = '#ffffff';
    Chart.defaults.elements.arc.hoverBorderColor = '#ffffff';
    Chart.defaults.elements.arc.hoverOffset = 4;

    // ── Palette (soft blue + slate accents) ──────────────────────
    window.CHART_PALETTE = {
        blue     : { fill: 'rgba(59,130,246,.75)',  border: '#3b82f6' },
        sky      : { fill: 'rgba(14,165,233,.75)',  border: '#0ea5e9' },
        indigo   : { fill: 'rgba(99,102,241,.75)',  border: '#6366f1' },
        slate    : { fill: 'rgba(100,116,139,.75)', border: '#64748b' },
        teal     : { fill: 'rgba(20,184,166,.75)',  border: '#14b8a6' },
        emerald  : { fill: 'rgba(16,185,129,.75)',  border: '#10b981' },
        amber    : { fill: 'rgba(245,158,11,.75)',  border: '#f59e0b' },
        rose     : { fill: 'rgba(244,63,94,.75)',   border: '#f43f5e' },
        violet   : { fill: 'rgba(139,92,246,.75)',  border: '#8b5cf6' },
        cyan     : { fill: 'rgba(6,182,212,.75)',   border: '#06b6d4' },
    };

    // ordered sequence for multi-series
    window.CHART_COLORS = [
        '#3b82f6','#10b981','#6366f1','#f59e0b','#0ea5e9',
        '#8b5cf6','#14b8a6','#f43f5e','#06b6d4','#84cc16',
        '#a855f7','#fb923c','#22d3ee','#64748b','#ec4899'
    ];

    // Pie/Doughnut — softer tones
    window.CHART_PIE_COLORS = [
        '#3b82f6','#60a5fa','#93c5fd',
        '#64748b','#94a3b8','#cbd5e1',
        '#0ea5e9','#38bdf8','#7dd3fc',
        '#6366f1','#818cf8','#a5b4fc',
        '#10b981','#34d399'
    ];
})();
