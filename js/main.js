/**
 * main.js — FT Yield Analytics 앱 메인 컨트롤러
 * 탭 전환 · 파일 로드 · 필터 · 데이터 테이블 · 전역 이벤트
 */

const AppState = (function () {

    /* ── State ─────────────────────────────────────── */
    let _allData      = [];
    let _filteredData = [];
    let _currentTab   = 'overview';
    let _tableState   = { page: 1, pageSize: 50, sortCol: null, sortDir: 1 };

    /* ────────────────────────────────────────────────
       init
       ──────────────────────────────────────────────── */
    function init() {
        _bindEvents();
    }

    /* ────────────────────────────────────────────────
       Event Bindings
       ──────────────────────────────────────────────── */
    function _bindEvents() {
        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () =>
            document.getElementById('csvFileInput').click()
        );
        document.getElementById('csvFileInput').addEventListener('change', _onFileChange);

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn =>
            btn.addEventListener('click', () => _switchTab(btn.dataset.tab))
        );

        // Filter toggle
        const filterToggle = document.getElementById('filterToggle');
        const filterTitleBar = document.getElementById('filterTitleBar');
        if (filterToggle) {
            filterToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                _toggleFilter();
            });
        }
        if (filterTitleBar) {
            filterTitleBar.addEventListener('click', _toggleFilter);
        }

        // Download dropdown
        const downloadBtn  = document.getElementById('downloadBtn');
        const downloadMenu = document.getElementById('downloadMenu');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadMenu && downloadMenu.classList.toggle('open');
            });
        }
        document.addEventListener('click', () => {
            downloadMenu && downloadMenu.classList.remove('open');
        });

        // Analysis selectors
        document.getElementById('yieldDeviceSelect').addEventListener('change', (e) => {
            if (e.target.value) YieldAnalysis.renderRunAnalysis(e.target.value, _filteredData);
        });
        document.getElementById('binLotSelect').addEventListener('change', (e) => {
            if (e.target.value) BinAnalysis.renderBinAnalysis(e.target.value, _filteredData);
        });
        document.getElementById('siteDeviceSelect').addEventListener('change', (e) =>
            SiteAnalysis.renderSiteAnalysis(_filteredData, e.target.value)
        );
        document.getElementById('trendDeviceSelect').addEventListener('change', _renderTrend);
        document.getElementById('trendPeriod').addEventListener('change', _renderTrend);

        // Drag & Drop
        document.body.addEventListener('dragover', (e) => e.preventDefault());
        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) _processFile(e.dataTransfer.files[0]);
        });

        // Empty state drag
        const es = document.getElementById('emptyState');
        if (es) {
            es.addEventListener('dragover',  (e) => { e.preventDefault(); es.style.borderColor = 'var(--blue-400)'; });
            es.addEventListener('dragleave', ()  => { es.style.borderColor = ''; });
            es.addEventListener('drop', (e) => {
                e.preventDefault(); es.style.borderColor = '';
                if (e.dataTransfer.files.length) _processFile(e.dataTransfer.files[0]);
            });
        }

        // Enter key on filter inputs
        ['filterLot','filterProgram','filterDateCode'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilters(); });
        });
    }

    /* ────────────────────────────────────────────────
       File Handling
       ──────────────────────────────────────────────── */
    async function _onFileChange(e) {
        const f = e.target.files[0];
        if (f) { await _processFile(f); e.target.value = ''; }
    }

    async function _processFile(file) {
        _showLoading(true);
        try {
            const text   = await _readText(file);
            const result = await DataParser.parseCSV(text);
            _allData      = result.data;
            _filteredData = _allData.slice();

            if (!_allData.length) {
                alert('유효한 데이터가 없습니다. CSV 형식을 확인하세요.\n필수 컬럼: Site, Device Name, Lot No, DATE, Total, Pass, Fail, Yield');
                _showLoading(false);
                return;
            }

            // Update UI
            document.getElementById('emptyState').style.display = 'none';
            const statusEl = document.getElementById('dataStatus');
            statusEl.className = 'data-status has-data';
            statusEl.innerHTML = `<i class="fas fa-database"></i> ${_allData.length.toLocaleString()} Lots 로드됨`;
            document.getElementById('downloadBtn').disabled = false;

            _populateFilters();
            _switchTab('overview');
        } catch (err) {
            console.error('[FT Yield] 파일 처리 오류:', err);
            alert('파일 처리 오류:\n' + err.message);
        } finally {
            _showLoading(false);
        }
    }

    function _readText(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload  = (e) => res(e.target.result);
            r.onerror = rej;
            r.readAsText(file, 'UTF-8');
        });
    }

    /* ────────────────────────────────────────────────
       Filter Population
       ──────────────────────────────────────────────── */
    function _populateFilters() {
        const sites   = [...new Set(_allData.map(r => r.site))].filter(Boolean).sort();
        const devices = [...new Set(_allData.map(r => r.deviceName))].filter(Boolean).sort();
        const testers = [...new Set(_allData.map(r => r.tester))].filter(Boolean).sort();

        _fillSelect('filterSite',   sites);
        _fillSelect('filterDevice', devices);
        _fillSelect('filterTester', testers);

        const devOpts = devices.map(d => `<option value="${_esc(d)}">${_esc(d)}</option>`).join('');
        document.getElementById('yieldDeviceSelect').innerHTML = `<option value="">Device 선택...</option>${devOpts}`;
        document.getElementById('siteDeviceSelect').innerHTML  = `<option value="">전체 Device</option>${devOpts}`;
        document.getElementById('trendDeviceSelect').innerHTML = `<option value="">전체</option>${devOpts}`;

        BinAnalysis.populateLotSelect(_filteredData);

        // Update filter count
        document.getElementById('filterResultCount').textContent = `${_filteredData.length.toLocaleString()}개 결과`;
    }

    function _fillSelect(id, values) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = values.map(v => `<option value="${_esc(v)}">${_esc(v)}</option>`).join('');
    }

    function _esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ────────────────────────────────────────────────
       Filter Apply / Reset
       ──────────────────────────────────────────────── */
    function applyFilters() {
        const sites   = _getMultiSelect('filterSite');
        const devices = _getMultiSelect('filterDevice');
        const testers = _getMultiSelect('filterTester');
        const lotQ    = document.getElementById('filterLot').value.trim().toLowerCase();
        const progQ   = document.getElementById('filterProgram').value.trim().toLowerCase();
        const dcQ     = document.getElementById('filterDateCode').value.trim();
        const dateFrom = (() => { const v = document.getElementById('filterDateFrom').value; return v ? new Date(v) : null; })();
        const dateTo   = (() => { const v = document.getElementById('filterDateTo').value;   return v ? new Date(v + 'T23:59:59') : null; })();
        const yMin = parseFloat(document.getElementById('filterYieldMin').value);
        const yMax = parseFloat(document.getElementById('filterYieldMax').value);

        _filteredData = _allData.filter(r => {
            if (sites.length   && !sites.includes(r.site))         return false;
            if (devices.length && !devices.includes(r.deviceName)) return false;
            if (testers.length && !testers.includes(r.tester))     return false;
            if (lotQ  && !r.lotNo.toLowerCase().includes(lotQ))    return false;
            if (progQ && !r.program.toLowerCase().includes(progQ)) return false;
            if (dcQ   && !r.dateCode.includes(dcQ))                return false;
            if (dateFrom && r.date && r.date < dateFrom)           return false;
            if (dateTo   && r.date && r.date > dateTo)             return false;
            if (!isNaN(yMin) && r.yield < yMin)                    return false;
            if (!isNaN(yMax) && r.yield > yMax)                    return false;
            return true;
        });

        document.getElementById('filterResultCount').textContent = `${_filteredData.length.toLocaleString()}개 결과`;
        BinAnalysis.populateLotSelect(_filteredData);
        _tableState.page = 1;
        _renderCurrentTab();
    }

    function resetFilters() {
        ['filterSite','filterDevice','filterTester'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { Array.from(el.options).forEach(o => o.selected = false); }
        });
        ['filterLot','filterProgram','filterDateCode','filterDateFrom','filterDateTo','filterYieldMin','filterYieldMax']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

        _filteredData = _allData.slice();
        document.getElementById('filterResultCount').textContent = `${_filteredData.length.toLocaleString()}개 결과`;
        BinAnalysis.populateLotSelect(_filteredData);
        _tableState.page = 1;
        _renderCurrentTab();
    }

    function _getMultiSelect(id) {
        const el = document.getElementById(id);
        if (!el) return [];
        return Array.from(el.selectedOptions).map(o => o.value).filter(Boolean);
    }

    /* ────────────────────────────────────────────────
       Tab Management
       ──────────────────────────────────────────────── */
    function _switchTab(name) {
        _currentTab = name;
        document.querySelectorAll('.tab-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.tab === name)
        );
        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
        const tabEl = document.getElementById('tab-' + name);
        if (tabEl) tabEl.style.display = 'block';
        if (_allData.length) _renderCurrentTab();
    }

    function _renderCurrentTab() {
        switch (_currentTab) {
            case 'overview':
                OverviewCharts.renderOverview(_filteredData);
                break;
            case 'yield-analysis': {
                const dev = document.getElementById('yieldDeviceSelect').value;
                if (dev) YieldAnalysis.renderRunAnalysis(dev, _filteredData);
                break;
            }
            case 'bin-analysis': {
                BinAnalysis.populateLotSelect(_filteredData);
                const lot = document.getElementById('binLotSelect').value;
                if (lot) BinAnalysis.renderBinAnalysis(lot, _filteredData);
                break;
            }
            case 'site-analysis':
                SiteAnalysis.renderSiteAnalysis(_filteredData, document.getElementById('siteDeviceSelect').value);
                break;
            case 'trend-analysis':
                _renderTrend();
                break;
            case 'data-table':
                _renderDataTable();
                break;
        }
    }

    function _renderTrend() {
        TrendAnalysis.renderTrendAnalysis(
            _filteredData,
            document.getElementById('trendDeviceSelect').value,
            document.getElementById('trendPeriod').value
        );
    }

    /* ────────────────────────────────────────────────
       Data Table
       ──────────────────────────────────────────────── */
    function _renderDataTable() {
        const thead = document.getElementById('dataTableHead');
        const tbody = document.getElementById('dataTableBody');
        if (!thead || !tbody) return;

        document.getElementById('tableRowCount').textContent = `총 ${_filteredData.length.toLocaleString()}건`;

        const cols  = ['site','deviceName','lotNo','run','tester','program','dateCode','dateRaw','total','pass','fail','yield'];
        const colLb = ['Site','Device Name','Lot No','Run','Tester','Program','DATE CODE','DATE','Total','Pass','Fail','Yield'];

        thead.innerHTML = '<tr>' + cols.map((c, i) => {
            const sorted  = _tableState.sortCol === c;
            const iconSfx = sorted ? (_tableState.sortDir > 0 ? '-up' : '-down') : '';
            return `<th onclick="AppState.sortTable('${c}')" class="${sorted?'sorted':''}" title="${colLb[i]} 정렬">
                ${colLb[i]} <i class="fas fa-sort${iconSfx} sort-icon"></i>
            </th>`;
        }).join('') + '</tr>';

        // Sort
        let data = _filteredData.slice();
        if (_tableState.sortCol) {
            const sc = _tableState.sortCol, sd = _tableState.sortDir;
            data.sort((a, b) => {
                const av = a[sc], bv = b[sc];
                if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sd;
                return String(av).localeCompare(String(bv)) * sd;
            });
        }

        // Build low-yield set for highlight
        const lowLotNos  = new Set();
        const warnLotNos = new Set();
        const byDevice = DataParser.groupByDevice(_filteredData);
        Object.values(byDevice).forEach(dl => {
            Object.values(DataParser.groupByRun(dl)).forEach(rl => {
                DataParser.detectLowYieldLots(rl).forEach(l => {
                    if (l.isLowYield)  lowLotNos.add(l.lotNo);
                    if (l.isWarnYield) warnLotNos.add(l.lotNo);
                });
            });
        });

        const start = (_tableState.page - 1) * _tableState.pageSize;
        tbody.innerHTML = data.slice(start, start + _tableState.pageSize).map(row => {
            const isLow  = lowLotNos.has(row.lotNo);
            const isWarn = warnLotNos.has(row.lotNo);
            const yc = isLow ? 'bad' : isWarn ? 'warn' : 'good';
            const devName = row.deviceName.length > 22 ? row.deviceName.slice(0,22)+'…' : row.deviceName;
            const progName = row.program.length > 22 ? row.program.slice(0,22)+'…' : row.program;
            return `<tr class="${isLow?'row-low':''}">
                <td>${_esc(row.site)}</td>
                <td title="${_esc(row.deviceName)}">${_esc(devName)}</td>
                <td>
                    <span class="lot-link" onclick="AppState.selectLot('${_esc(row.lotNo)}')">${_esc(row.lotNo)}</span>
                    ${isLow  ? '<span class="badge badge-red" style="margin-left:4px">LOW</span>'  : ''}
                    ${isWarn ? '<span class="badge badge-orange" style="margin-left:4px">WARN</span>' : ''}
                </td>
                <td>${_esc(row.run)}</td>
                <td>${_esc(row.tester)}</td>
                <td title="${_esc(row.program)}">${_esc(progName)}</td>
                <td>${_esc(row.dateCode)}</td>
                <td>${_esc(row.dateRaw)}</td>
                <td>${row.total.toLocaleString()}</td>
                <td>${row.pass.toLocaleString()}</td>
                <td style="color:${row.fail?'var(--danger-dark)':'inherit'};font-weight:${row.fail?'600':'400'}">${row.fail.toLocaleString()}</td>
                <td><span class="yield-badge ${yc}">${row.yield.toFixed(2)}%</span></td>
            </tr>`;
        }).join('');

        _renderPagination(data.length);
    }

    function _renderPagination(total) {
        const el = document.getElementById('tablePagination');
        if (!el) return;
        const tp = Math.ceil(total / _tableState.pageSize);
        if (tp <= 1) { el.innerHTML = ''; return; }
        const cp = _tableState.page;

        let h = `<button class="page-btn" onclick="AppState.goToPage(${cp-1})" ${cp===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>`;
        const ps = Math.max(1, cp-2), pe = Math.min(tp, ps+4);
        if (ps > 1) h += `<button class="page-btn" onclick="AppState.goToPage(1)">1</button>${ps>2?'<span style="padding:0 4px;color:var(--text-muted)">…</span>':''}`;
        for (let i = ps; i <= pe; i++) {
            h += `<button class="page-btn${i===cp?' active':''}" onclick="AppState.goToPage(${i})">${i}</button>`;
        }
        if (pe < tp) h += `${pe<tp-1?'<span style="padding:0 4px;color:var(--text-muted)">…</span>':''}<button class="page-btn" onclick="AppState.goToPage(${tp})">${tp}</button>`;
        h += `<button class="page-btn" onclick="AppState.goToPage(${cp+1})" ${cp===tp?'disabled':''}><i class="fas fa-chevron-right"></i></button>`;
        h += `<span style="font-size:11px;color:var(--text-muted);margin-left:8px">${((cp-1)*_tableState.pageSize+1).toLocaleString()}–${Math.min(cp*_tableState.pageSize,total).toLocaleString()} / ${total.toLocaleString()}</span>`;
        el.innerHTML = h;
    }

    /* ────────────────────────────────────────────────
       Public Methods
       ──────────────────────────────────────────────── */
    function sortTable(col) {
        if (_tableState.sortCol === col) _tableState.sortDir *= -1;
        else { _tableState.sortCol = col; _tableState.sortDir = 1; }
        _tableState.page = 1;
        _renderDataTable();
    }

    function goToPage(p) {
        const tp = Math.ceil(_filteredData.length / _tableState.pageSize);
        if (p < 1 || p > tp) return;
        _tableState.page = p;
        _renderDataTable();
    }

    function selectLot(lotNo) {
        document.getElementById('binLotSelect').value = lotNo;
        _switchTab('bin-analysis');
        BinAnalysis.renderBinAnalysis(lotNo, _filteredData);
    }

    /* ────────────────────────────────────────────────
       UI Helpers
       ──────────────────────────────────────────────── */
    function _toggleFilter() {
        const body   = document.getElementById('filterBody');
        const toggle = document.getElementById('filterToggle');
        if (body)   body.classList.toggle('hidden');
        if (toggle) toggle.classList.toggle('collapsed');
    }

    function _showLoading(v) {
        const el = document.getElementById('loadingOverlay');
        if (el) el.style.display = v ? 'flex' : 'none';
    }

    function getFilteredData() { return _filteredData; }

    /* ── Expose globals for HTML onclick ── */
    window.applyFilters = applyFilters;
    window.resetFilters = resetFilters;

    return { init, selectLot, sortTable, goToPage, getFilteredData };
})();

/* Boot */
document.addEventListener('DOMContentLoaded', () => AppState.init());
