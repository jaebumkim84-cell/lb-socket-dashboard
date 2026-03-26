/**
 * dataParser.js
 * CSV 파싱 및 데이터 정규화 모듈
 */

const DataParser = (() => {

    const HBIN_COLS = ['HBIN01','HBIN02','HBIN03','HBIN04','HBIN05','HBIN06','HBIN07','HBIN08','HBIN09','HBIN10'];
    const SBIN_COLS = Array.from({length:100}, (_,i) => 'SBIN' + String(i+1).padStart(3,'0'));
    const REQUIRED_COLS = ['Site','Device Name','Lot No','DATE','Total','Pass','Fail','Yield'];

    function parseNumber(v) {
        if (v === null || v === undefined || v === '') return 0;
        const s = String(v).replace(/,/g,'').trim();
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    function parseDate(v) {
        if (!v || String(v).trim() === '') return null;
        const s = String(v).trim();
        // Try common formats
        let d = new Date(s);
        if (!isNaN(d)) return d;
        // yyyymmdd
        if (/^\d{8}$/.test(s)) {
            return new Date(s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8));
        }
        return null;
    }

    function getRun(lotNo) {
        if (!lotNo) return '';
        return String(lotNo).substring(0, 7);
    }

    function getWeekKey(date) {
        if (!date) return 'Unknown';
        const d = new Date(date);
        const year = d.getFullYear();
        // Get ISO week number
        const startOfYear = new Date(year, 0, 1);
        const dayOfYear = Math.floor((d - startOfYear) / 86400000);
        const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
        return `${year}-W${String(weekNum).padStart(2,'0')}`;
    }

    function getMonthKey(date) {
        if (!date) return 'Unknown';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    }

    function normalizeRow(rawRow, headers) {
        const row = {};
        headers.forEach((h, i) => {
            row[h.trim()] = rawRow[i] !== undefined ? String(rawRow[i]).trim() : '';
        });

        const normalized = {
            site: row['Site'] || '',
            deviceName: row['Device Name'] || '',
            lotNo: row['Lot No'] || '',
            tester: row['Tester'] || '',
            program: row['Program'] || '',
            dateCode: row['DATE CODE'] || '',
            dateRaw: row['DATE'] || '',
            date: parseDate(row['DATE']),
            total: parseNumber(row['Total']),
            pass: parseNumber(row['Pass']),
            fail: parseNumber(row['Fail']),
            yield: parseNumber(row['Yield']),
            run: getRun(row['Lot No']),
            hbins: {},
            sbins: {}
        };

        // Parse HBINs
        HBIN_COLS.forEach(col => {
            normalized.hbins[col] = parseNumber(row[col]);
        });

        // Parse SBINs
        SBIN_COLS.forEach(col => {
            normalized.sbins[col] = parseNumber(row[col]);
        });

        // Compute week/month keys
        normalized.weekKey = getWeekKey(normalized.date);
        normalized.monthKey = getMonthKey(normalized.date);

        return normalized;
    }

    function parseCSV(csvText) {
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        const rows = results.data;
                        if (rows.length < 2) {
                            reject(new Error('데이터가 부족합니다 (헤더 + 최소 1행 필요)'));
                            return;
                        }

                        const headers = rows[0].map(h => h.trim());
                        const dataRows = rows.slice(1);

                        // Validate headers
                        const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
                        if (missing.length > 0) {
                            console.warn('누락 컬럼:', missing);
                        }

                        const parsed = dataRows
                            .filter(r => r.some(cell => cell && String(cell).trim()))
                            .map(r => normalizeRow(r, headers));

                        resolve({
                            headers,
                            data: parsed,
                            rawRows: dataRows
                        });
                    } catch(e) {
                        reject(e);
                    }
                },
                error: (err) => reject(err)
            });
        });
    }

    function computeStats(values) {
        if (!values || values.length === 0) return { mean: 0, std: 0, min: 0, max: 0, median: 0 };
        const n = values.length;
        const mean = values.reduce((a,b) => a+b, 0) / n;
        const variance = values.reduce((a,b) => a + Math.pow(b-mean,2), 0) / n;
        const std = Math.sqrt(variance);
        const sorted = [...values].sort((a,b) => a-b);
        const median = n % 2 === 0 ? (sorted[n/2-1]+sorted[n/2])/2 : sorted[Math.floor(n/2)];
        return { mean, std, min: sorted[0], max: sorted[n-1], median };
    }

    function groupByDevice(data) {
        const map = {};
        data.forEach(row => {
            if (!map[row.deviceName]) map[row.deviceName] = [];
            map[row.deviceName].push(row);
        });
        return map;
    }

    function groupByRun(deviceData) {
        const map = {};
        deviceData.forEach(row => {
            if (!map[row.run]) map[row.run] = [];
            map[row.run].push(row);
        });
        return map;
    }

    function groupBySite(data) {
        const map = {};
        data.forEach(row => {
            if (!map[row.site]) map[row.site] = [];
            map[row.site].push(row);
        });
        return map;
    }

    function groupByWeek(data) {
        const map = {};
        data.forEach(row => {
            const key = row.weekKey || 'Unknown';
            if (!map[key]) map[key] = [];
            map[key].push(row);
        });
        return map;
    }

    function groupByMonth(data) {
        const map = {};
        data.forEach(row => {
            const key = row.monthKey || 'Unknown';
            if (!map[key]) map[key] = [];
            map[key].push(row);
        });
        return map;
    }

    // Low yield detection: runs where lot yield < runAvgYield - 1*std
    function detectLowYieldLots(runData) {
        const lots = runData;
        const yields = lots.map(l => l.yield);
        const stats = computeStats(yields);
        const threshold = stats.mean - stats.std;
        return lots.map(lot => ({
            ...lot,
            runAvgYield: stats.mean,
            runStd: stats.std,
            isLowYield: lot.yield < threshold,
            isWarnYield: lot.yield >= threshold && lot.yield < stats.mean - 0.5 * stats.std,
            yieldDiff: lot.yield - stats.mean,
            stats
        }));
    }

    // Get top failing HBINs (02~10) for a lot
    function getTopHbins(lotRow, topN = 5) {
        const bins = [];
        for (let i = 2; i <= 10; i++) {
            const key = 'HBIN' + String(i).padStart(2,'0');
            const val = lotRow.hbins[key] || 0;
            if (val > 0) bins.push({ bin: key, count: val });
        }
        bins.sort((a,b) => b.count - a.count);
        const total = lotRow.fail || 1;
        return bins.slice(0, topN).map(b => ({
            ...b,
            pct: total > 0 ? (b.count / total * 100) : 0
        }));
    }

    // Get top failing SBINs (002~100) for a lot
    function getTopSbins(lotRow, topN = 10) {
        const bins = [];
        for (let i = 2; i <= 100; i++) {
            const key = 'SBIN' + String(i).padStart(3,'0');
            const val = lotRow.sbins[key] || 0;
            if (val > 0) bins.push({ bin: key, count: val });
        }
        bins.sort((a,b) => b.count - a.count);
        const total = lotRow.fail || 1;
        return bins.slice(0, topN).map(b => ({
            ...b,
            pct: total > 0 ? (b.count / total * 100) : 0
        }));
    }

    // Aggregate HBIN/SBIN for multiple lots
    function aggregateBins(lots) {
        const hbins = {};
        const sbins = {};
        HBIN_COLS.forEach(k => { hbins[k] = 0; });
        SBIN_COLS.forEach(k => { sbins[k] = 0; });

        lots.forEach(lot => {
            HBIN_COLS.forEach(k => { hbins[k] += (lot.hbins[k] || 0); });
            SBIN_COLS.forEach(k => { sbins[k] += (lot.sbins[k] || 0); });
        });

        return { hbins, sbins };
    }

    return {
        parseCSV,
        computeStats,
        groupByDevice,
        groupByRun,
        groupBySite,
        groupByWeek,
        groupByMonth,
        detectLowYieldLots,
        getTopHbins,
        getTopSbins,
        aggregateBins,
        getRun,
        HBIN_COLS,
        SBIN_COLS
    };
})();
