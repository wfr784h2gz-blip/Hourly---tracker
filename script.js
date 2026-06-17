(() => {
  'use strict';

  const STORE_KEY = 'hourlyTrackerData_v3';
  const OLD_KEYS = ['hourlyTrackerData', 'entries', 'callouts', 'commissions'];
  const DEFAULT_SETTINGS = {
    regularRate: 32,
    overtimeRate: 48,
    weekdayCalloutRate: 25,
    weekendCalloutRate: 50,
    overtimeAfterHours: 8
  };

  const $ = (id) => document.getElementById(id);
  const money = (value) => `$${Number(value || 0).toFixed(2)}`;
  const pad = (num) => String(num).padStart(2, '0');
  const todayIso = () => toIsoDate(new Date());

  function toIsoDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseLocalDate(iso) {
    if (!iso) return new Date();
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function msToDuration(ms) {
    const totalMinutes = Math.max(0, Math.floor((ms || 0) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  function minutesToDuration(minutes) {
    return msToDuration((minutes || 0) * 60000);
  }

  function timeFromDate(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function niceTime(time) {
    if (!time || time === '--') return '--';
    const [hour, minute] = time.split(':').map(Number);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${pad(minute || 0)} ${suffix}`;
  }

  function dateTimeMs(dateIso, timeString) {
    const d = parseLocalDate(dateIso);
    if (timeString && timeString !== '--') {
      const [hours, minutes] = timeString.split(':').map(Number);
      d.setHours(hours || 0, minutes || 0, 0, 0);
    }
    return d.getTime();
  }

  function calculateMinutes(startMs, endMs) {
    let ms = endMs - startMs;
    if (ms < 0) ms += 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor(ms / 60000));
  }

  function splitPay(totalMinutes) {
    const otLimit = state.settings.overtimeAfterHours * 60;
    const regularMinutes = Math.min(totalMinutes, otLimit);
    const overtimeMinutes = Math.max(0, totalMinutes - otLimit);
    const regularPay = (regularMinutes / 60) * state.settings.regularRate;
    const overtimePay = (overtimeMinutes / 60) * state.settings.overtimeRate;
    return { regularMinutes, overtimeMinutes, regularPay, overtimePay, hoursPay: regularPay + overtimePay };
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function getWeekStart(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffToMonday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diffToMonday);
    return d;
  }

  function inRange(iso, startIso, endIso) {
    return iso >= startIso && iso <= endIso;
  }

  function baseState() {
    return {
      entries: [],
      extras: [],
      activeShift: null,
      settings: { ...DEFAULT_SETTINGS }
    };
  }

  let state = loadState();
  let tickTimer = null;
  let reportChart = null;

  function loadState() {
    const fresh = baseState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved) {
        return normalizeState({ ...fresh, ...saved, settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) } });
      }
    } catch (error) {
      console.warn('Could not load v3 data', error);
    }

    const migrated = migrateOldState();
    if (migrated) return migrated;
    return fresh;
  }

  function migrateOldState() {
    try {
      const old = JSON.parse(localStorage.getItem('hourlyTrackerData') || 'null');
      if (old) {
        const migratedSettings = { ...DEFAULT_SETTINGS, ...(old.settings || {}) };
        const entries = (old.entries || []).map((entry) => {
          const date = entry.date && entry.date.includes('-') ? entry.date : toIsoDate(new Date(entry.date || Date.now()));
          const totalMinutes = Math.floor((entry.durationMs || entry.totalMinutes || 0) / (entry.durationMs ? 60000 : 1));
          const pay = splitPayWithSettings(totalMinutes, migratedSettings);
          return {
            id: uid('entry'),
            date,
            startTime: entry.startTime || entry.start || '--',
            endTime: entry.endTime || entry.end || '--',
            totalMinutes,
            regularMinutes: pay.regularMinutes,
            overtimeMinutes: Math.floor((entry.overtimeMs || entry.overtimeMinutes || pay.overtimeMinutes) / (entry.overtimeMs ? 60000 : 1)),
            hoursPay: Number(entry.hoursPay || pay.hoursPay || 0),
            calloutPay: Number(entry.calloutPay || 0),
            commission: Number(entry.commission || 0),
            totalPay: Number(entry.totalPay || entry.hoursPay || pay.hoursPay || 0)
          };
        });
        const migrated = normalizeState({
          ...baseState(),
          entries,
          settings: migratedSettings
        });
        saveState(migrated);
        return migrated;
      }
    } catch (error) {
      console.warn('Old data migration skipped', error);
    }
    return null;
  }

  function normalizeState(raw) {
    const normalized = baseState();
    normalized.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
    normalized.entries = Array.isArray(raw.entries) ? raw.entries.map((entry) => {
      const totalMinutes = Number(entry.totalMinutes || 0);
      const split = splitPayWithSettings(totalMinutes, normalized.settings);
      const calloutPay = Number(entry.calloutPay || 0);
      const commission = Number(entry.commission || 0);
      const hoursPay = Number.isFinite(Number(entry.hoursPay)) ? Number(entry.hoursPay) : split.hoursPay;
      return {
        id: entry.id || uid('entry'),
        date: entry.date || todayIso(),
        startTime: entry.startTime || entry.start || '--',
        endTime: entry.endTime || entry.end || '--',
        totalMinutes,
        regularMinutes: Number.isFinite(Number(entry.regularMinutes)) ? Number(entry.regularMinutes) : split.regularMinutes,
        overtimeMinutes: Number.isFinite(Number(entry.overtimeMinutes)) ? Number(entry.overtimeMinutes) : split.overtimeMinutes,
        hoursPay,
        calloutPay,
        commission,
        totalPay: Number.isFinite(Number(entry.totalPay)) ? Number(entry.totalPay) : hoursPay + calloutPay + commission
      };
    }) : [];
    normalized.extras = Array.isArray(raw.extras) ? raw.extras.map((extra) => ({
      id: extra.id || uid('extra'),
      kind: extra.kind === 'commission' ? 'commission' : 'callout',
      type: extra.type || null,
      date: extra.date || todayIso(),
      amount: Number(extra.amount || 0)
    })) : [];
    normalized.activeShift = raw.activeShift && raw.activeShift.startMs ? raw.activeShift : null;
    return normalized;
  }

  function splitPayWithSettings(totalMinutes, settings) {
    const otLimit = settings.overtimeAfterHours * 60;
    const regularMinutes = Math.min(totalMinutes, otLimit);
    const overtimeMinutes = Math.max(0, totalMinutes - otLimit);
    const regularPay = (regularMinutes / 60) * settings.regularRate;
    const overtimePay = (overtimeMinutes / 60) * settings.overtimeRate;
    return { regularMinutes, overtimeMinutes, regularPay, overtimePay, hoursPay: regularPay + overtimePay };
  }

  function saveState(next = state) {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  }

  function toast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2400);
  }

  function setDefaults() {
    const today = todayIso();
    ['calloutDate', 'commissionDate', 'calloutDateClone', 'commissionDateClone', 'reportStartDate', 'reportEndDate', 'paycheckStartDate', 'paycheckEndDate'].forEach((id) => {
      const el = $(id);
      if (el && !el.value) el.value = today;
    });
    $('regularRate').value = state.settings.regularRate;
    $('overtimeRate').value = state.settings.overtimeRate;
    $('weekdayCalloutRate').value = state.settings.weekdayCalloutRate;
    $('weekendCalloutRate').value = state.settings.weekendCalloutRate;
    $('overtimeAfterHours').value = state.settings.overtimeAfterHours;
    updateRateBadge();
  }

  function updateRateBadge() {
    $('rateBadge').textContent = `${money(state.settings.regularRate)}/hr • OT ${money(state.settings.overtimeRate)}/hr`;
  }

  function startShift() {
    if (state.activeShift) {
      toast('A shift is already running.');
      return;
    }
    const now = new Date();
    const date = todayIso();
    const chosenStart = $('startTime').value || timeFromDate(now);
    const startMs = dateTimeMs(date, chosenStart);
    state.activeShift = { date, startTime: chosenStart, startMs };
    $('startTime').value = chosenStart;
    $('endTime').value = '';
    saveState();
    updateActiveShiftUI();
    startTicker();
    toast('Shift started and saved.');
  }

  function stopShift() {
    if (!state.activeShift) {
      saveManualEntry();
      return;
    }
    const now = new Date();
    const endTime = $('endTime').value || timeFromDate(now);
    const endMs = dateTimeMs(state.activeShift.date, endTime);
    addEntryFromTimes(state.activeShift.date, state.activeShift.startTime, endTime, state.activeShift.startMs, endMs);
    state.activeShift = null;
    saveState();
    $('startTime').value = '';
    $('endTime').value = '';
    updateActiveShiftUI();
    stopTicker();
    renderAll();
    toast('Shift stopped and saved.');
  }

  function saveManualEntry() {
    const date = state.activeShift?.date || todayIso();
    const startTime = $('startTime').value;
    const endTime = $('endTime').value;
    if (!startTime || !endTime) {
      toast('Enter a start and end time first.');
      return;
    }
    const startMs = dateTimeMs(date, startTime);
    const endMs = dateTimeMs(date, endTime);
    addEntryFromTimes(date, startTime, endTime, startMs, endMs);
    if (state.activeShift) state.activeShift = null;
    saveState();
    $('startTime').value = '';
    $('endTime').value = '';
    updateActiveShiftUI();
    stopTicker();
    renderAll();
    toast('Manual entry saved.');
  }

  function addEntryFromTimes(date, startTime, endTime, startMs, endMs) {
    const totalMinutes = calculateMinutes(startMs, endMs);
    const split = splitPay(totalMinutes);
    state.entries.push({
      id: uid('entry'),
      date,
      startTime,
      endTime,
      totalMinutes,
      regularMinutes: split.regularMinutes,
      overtimeMinutes: split.overtimeMinutes,
      hoursPay: split.hoursPay,
      calloutPay: 0,
      commission: 0,
      totalPay: split.hoursPay
    });
    saveState();
  }

  function clearActiveShift() {
    if (!state.activeShift) {
      toast('No running shift to clear.');
      return;
    }
    state.activeShift = null;
    saveState();
    $('startTime').value = '';
    $('endTime').value = '';
    updateActiveShiftUI();
    stopTicker();
    toast('Running shift cleared.');
  }

  function startTicker() {
    stopTicker();
    tickTimer = setInterval(updateActiveShiftUI, 1000);
  }

  function stopTicker() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  function updateActiveShiftUI() {
    const active = state.activeShift;
    const status = $('shiftStatus');
    const startBtn = $('startBtn');
    const stopBtn = $('stopBtn');
    if (!active) {
      status.textContent = 'Ready';
      status.className = 'pill idle';
      startBtn.disabled = false;
      stopBtn.disabled = true;
      $('totalTime').textContent = '0h 0m';
      $('overtime').textContent = '0h 0m';
      $('runningPay').textContent = '$0.00';
      return;
    }
    $('startTime').value = active.startTime;
    status.textContent = 'Running';
    status.className = 'pill running';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    const endTimeValue = $('endTime').value;
    const endMs = endTimeValue ? dateTimeMs(active.date, endTimeValue) : Date.now();
    const totalMinutes = calculateMinutes(active.startMs, endMs);
    const split = splitPay(totalMinutes);
    $('totalTime').textContent = minutesToDuration(totalMinutes);
    $('overtime').textContent = minutesToDuration(split.overtimeMinutes);
    $('runningPay').textContent = money(split.hoursPay);
  }

  function addCallout(type, date) {
    const amount = type === 'weekend' ? state.settings.weekendCalloutRate : state.settings.weekdayCalloutRate;
    state.extras.push({ id: uid('extra'), kind: 'callout', type, date, amount });
    saveState();
    renderAll();
    toast('Call-out added.');
  }

  function addCommission(amount, date) {
    const clean = Number(amount);
    if (!Number.isFinite(clean) || clean <= 0) {
      toast('Enter a valid commission amount.');
      return;
    }
    state.extras.push({ id: uid('extra'), kind: 'commission', type: 'commission', date, amount: clean });
    saveState();
    renderAll();
    toast('Commission added.');
  }

  function deleteEntry(id) {
    state.entries = state.entries.filter((entry) => entry.id !== id);
    saveState();
    renderAll();
    toast('Entry deleted.');
  }

  function deleteExtra(id) {
    state.extras = state.extras.filter((extra) => extra.id !== id);
    saveState();
    renderAll();
    toast('Item deleted.');
  }

  function totalsForRange(startIso, endIso) {
    const totals = {
      regularMinutes: 0,
      overtimeMinutes: 0,
      totalMinutes: 0,
      regularPay: 0,
      overtimePay: 0,
      hoursPay: 0,
      calloutPay: 0,
      commission: 0,
      totalPay: 0
    };
    state.entries.forEach((entry) => {
      if (inRange(entry.date, startIso, endIso)) {
        totals.regularMinutes += entry.regularMinutes || 0;
        totals.overtimeMinutes += entry.overtimeMinutes || 0;
        totals.totalMinutes += entry.totalMinutes || 0;
        const split = splitPay(entry.totalMinutes || 0);
        totals.regularPay += split.regularPay;
        totals.overtimePay += split.overtimePay;
        totals.hoursPay += split.hoursPay;
      }
    });
    state.extras.forEach((extra) => {
      if (inRange(extra.date, startIso, endIso)) {
        if (extra.kind === 'commission') totals.commission += extra.amount || 0;
        else totals.calloutPay += extra.amount || 0;
      }
    });
    totals.totalPay = totals.hoursPay + totals.calloutPay + totals.commission;
    return totals;
  }

  function renderSummary() {
    const today = todayIso();
    const weekStartIso = toIsoDate(getWeekStart(new Date()));
    const todayTotals = totalsForRange(today, today);
    const weekTotals = totalsForRange(weekStartIso, today);

    $('regularHours').textContent = minutesToDuration(todayTotals.regularMinutes);
    $('summaryOvertime').textContent = minutesToDuration(todayTotals.overtimeMinutes);
    $('summaryTotal').textContent = minutesToDuration(todayTotals.totalMinutes);
    $('regularPay').textContent = money(todayTotals.regularPay);
    $('overtimePay').textContent = money(todayTotals.overtimePay);
    $('todayCalloutPay').textContent = money(todayTotals.calloutPay);
    $('commissionPay').textContent = money(todayTotals.commission);
    $('totalPay').textContent = money(todayTotals.totalPay);

    $('weekRegular').textContent = minutesToDuration(weekTotals.regularMinutes);
    $('weekOvertime').textContent = minutesToDuration(weekTotals.overtimeMinutes);
    $('weekHours').textContent = minutesToDuration(weekTotals.totalMinutes);
    $('weekCalloutPay').textContent = money(weekTotals.calloutPay);
    $('weekCommissionPay').textContent = money(weekTotals.commission);
    $('weekPay').textContent = money(weekTotals.totalPay);

    const weekdayTotal = state.extras.filter((x) => x.kind === 'callout' && x.type === 'weekday').reduce((sum, x) => sum + x.amount, 0);
    const weekendTotal = state.extras.filter((x) => x.kind === 'callout' && x.type === 'weekend').reduce((sum, x) => sum + x.amount, 0);
    const commissionTotal = state.extras.filter((x) => x.kind === 'commission').reduce((sum, x) => sum + x.amount, 0);
    $('weekdayTotal').textContent = money(weekdayTotal);
    $('weekendTotal').textContent = money(weekendTotal);
    $('commissionTotal').textContent = money(commissionTotal);
    $('totalCallout').textContent = money(weekdayTotal + weekendTotal + commissionTotal);
  }

  function renderEntries() {
    const recentBody = $('entriesBody');
    const allBody = $('allEntriesBody');
    recentBody.innerHTML = '';
    allBody.innerHTML = '';
    const sorted = [...state.entries].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    const recent = [...sorted].reverse().slice(0, 5);
    recent.forEach((entry) => recentBody.appendChild(entryRow(entry, true)));
    [...sorted].reverse().forEach((entry) => allBody.appendChild(entryRow(entry, false)));
    if (!recent.length) recentBody.innerHTML = '<tr><td colspan="8">No saved entries yet.</td></tr>';
    if (!sorted.length) allBody.innerHTML = '<tr><td colspan="11">No saved entries yet.</td></tr>';
  }

  function entryRow(entry, compact) {
    const tr = document.createElement('tr');
    const cells = compact ? [
      entry.date,
      niceTime(entry.startTime),
      niceTime(entry.endTime),
      minutesToDuration(entry.totalMinutes),
      minutesToDuration(entry.overtimeMinutes),
      money(entry.hoursPay),
      money((entry.hoursPay || 0) + (entry.calloutPay || 0) + (entry.commission || 0))
    ] : [
      entry.date,
      niceTime(entry.startTime),
      niceTime(entry.endTime),
      minutesToDuration(entry.totalMinutes),
      minutesToDuration(entry.regularMinutes),
      minutesToDuration(entry.overtimeMinutes),
      money(entry.hoursPay),
      money(entry.calloutPay),
      money(entry.commission),
      money((entry.hoursPay || 0) + (entry.calloutPay || 0) + (entry.commission || 0))
    ];
    cells.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });
    const action = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'delete-btn';
    button.textContent = 'Delete';
    button.addEventListener('click', () => deleteEntry(entry.id));
    action.appendChild(button);
    tr.appendChild(action);
    return tr;
  }

  function renderExtras() {
    const body = $('extraBody');
    body.innerHTML = '';
    const sorted = [...state.extras].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    sorted.forEach((extra) => {
      const tr = document.createElement('tr');
      const label = extra.kind === 'commission' ? 'Commission' : (extra.type === 'weekend' ? 'Weekend Call-Out' : 'Weekday Call-Out');
      [extra.date, label, money(extra.amount)].forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      const td = document.createElement('td');
      const button = document.createElement('button');
      button.className = 'delete-btn';
      button.textContent = 'Delete';
      button.addEventListener('click', () => deleteExtra(extra.id));
      td.appendChild(button);
      tr.appendChild(td);
      body.appendChild(tr);
    });
    if (!sorted.length) body.innerHTML = '<tr><td colspan="4">No call-outs or commissions yet.</td></tr>';
  }

  function updateCalloutPreview(source = '') {
    const type = $(source ? 'calloutTypeClone' : 'calloutType').value;
    const amount = type === 'weekend' ? state.settings.weekendCalloutRate : state.settings.weekdayCalloutRate;
    const amountEl = $(source ? 'calloutPayAmountClone' : 'calloutPayAmount');
    const descEl = $(source ? 'calloutPayDescClone' : 'calloutPayDesc');
    amountEl.textContent = money(amount);
    descEl.textContent = type === 'weekend' ? 'Weekend Call-Out' : 'Weekday Call-Out';
  }

  function renderAll() {
    renderSummary();
    renderEntries();
    renderExtras();
    updateCalloutPreview();
    updateCalloutPreview('clone');
    updateActiveShiftUI();
  }

  function showSection(id) {
    document.querySelectorAll('.section').forEach((section) => section.classList.remove('active'));
    const target = $(id);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.target === id));
    const titles = {
      dashboardSection: ['Dashboard', 'Track hours, overtime, call-outs, commissions, and pay.'],
      timeEntriesSection: ['Time Entries', 'View, export, and delete saved time entries.'],
      calloutSection: ['Call-Out & Commission', 'Track call-outs and commission money.'],
      reportsSection: ['Reports & Analytics', 'Generate daily, weekly, monthly, or yearly reports.'],
      paycheckSection: ['Paycheck Check', 'Compare tracker pay against your check.'],
      settingsSection: ['Settings', 'Change pay rates and overtime rule.']
    };
    const [title, subtitle] = titles[id] || titles.dashboardSection;
    $('mainTitle').textContent = title;
    $('mainSubtitle').textContent = subtitle;
  }

  function groupKey(dateIso, group) {
    const d = parseLocalDate(dateIso);
    if (group === 'week') return toIsoDate(getWeekStart(d));
    if (group === 'month') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    if (group === 'year') return String(d.getFullYear());
    return dateIso;
  }

  function generateReport() {
    const start = $('reportStartDate').value;
    const end = $('reportEndDate').value;
    const group = $('reportGroup').value;
    if (!start || !end || end < start) {
      toast('Select a valid report date range.');
      return;
    }
    const buckets = {};
    state.entries.forEach((entry) => {
      if (!inRange(entry.date, start, end)) return;
      const key = groupKey(entry.date, group);
      buckets[key] ??= { hours: 0, callout: 0, commission: 0 };
      buckets[key].hours += splitPay(entry.totalMinutes).hoursPay;
    });
    state.extras.forEach((extra) => {
      if (!inRange(extra.date, start, end)) return;
      const key = groupKey(extra.date, group);
      buckets[key] ??= { hours: 0, callout: 0, commission: 0 };
      if (extra.kind === 'commission') buckets[key].commission += extra.amount;
      else buckets[key].callout += extra.amount;
    });
    const labels = Object.keys(buckets).sort();
    const hours = labels.map((key) => buckets[key].hours);
    const callout = labels.map((key) => buckets[key].callout);
    const commission = labels.map((key) => buckets[key].commission);
    const totals = totalsForRange(start, end);
    $('reportSummary').innerHTML = `
      <strong>Report Total:</strong> ${money(totals.totalPay)}<br>
      Hours Pay: ${money(totals.hoursPay)} • Call-Out: ${money(totals.calloutPay)} • Commission: ${money(totals.commission)}<br>
      Total Hours: ${minutesToDuration(totals.totalMinutes)} • Overtime: ${minutesToDuration(totals.overtimeMinutes)}
    `;
    const canvas = $('reportChart');
    if (!window.Chart || !canvas) return;
    if (reportChart) reportChart.destroy();
    reportChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Hours Pay', data: hours },
          { label: 'Call-Out Pay', data: callout },
          { label: 'Commission', data: commission }
        ]
      },
      options: {
        responsive: true,
        scales: { x: { stacked: true }, y: { stacked: true } }
      }
    });
  }

  function comparePaycheck() {
    const start = $('paycheckStartDate').value;
    const end = $('paycheckEndDate').value;
    const actual = Number($('actualPaycheck').value || 0);
    if (!start || !end || end < start) {
      toast('Select a valid paycheck date range.');
      return;
    }
    const totals = totalsForRange(start, end);
    const diff = actual - totals.totalPay;
    $('paycheckResult').innerHTML = `
      Tracker total: <strong>${money(totals.totalPay)}</strong><br>
      Actual check: <strong>${money(actual)}</strong><br>
      Difference: <strong>${money(diff)}</strong>
    `;
  }

  function exportCsv() {
    const header = ['Date', 'Start', 'End', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Hours Pay', 'Call-Out Pay', 'Commission', 'Total Pay'];
    const rows = state.entries.map((entry) => [
      entry.date,
      entry.startTime,
      entry.endTime,
      (entry.totalMinutes / 60).toFixed(2),
      (entry.regularMinutes / 60).toFixed(2),
      (entry.overtimeMinutes / 60).toFixed(2),
      Number(entry.hoursPay || 0).toFixed(2),
      Number(entry.calloutPay || 0).toFixed(2),
      Number(entry.commission || 0).toFixed(2),
      Number(entry.totalPay || 0).toFixed(2)
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hourly-tracker-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveSettings() {
    state.settings.regularRate = Number($('regularRate').value) || DEFAULT_SETTINGS.regularRate;
    state.settings.overtimeRate = Number($('overtimeRate').value) || DEFAULT_SETTINGS.overtimeRate;
    state.settings.weekdayCalloutRate = Number($('weekdayCalloutRate').value) || DEFAULT_SETTINGS.weekdayCalloutRate;
    state.settings.weekendCalloutRate = Number($('weekendCalloutRate').value) || DEFAULT_SETTINGS.weekendCalloutRate;
    state.settings.overtimeAfterHours = Number($('overtimeAfterHours').value) || DEFAULT_SETTINGS.overtimeAfterHours;
    state.entries = state.entries.map((entry) => {
      const split = splitPay(entry.totalMinutes || 0);
      return { ...entry, regularMinutes: split.regularMinutes, overtimeMinutes: split.overtimeMinutes, hoursPay: split.hoursPay, totalPay: split.hoursPay + (entry.calloutPay || 0) + (entry.commission || 0) };
    });
    saveState();
    updateRateBadge();
    renderAll();
    toast('Settings saved.');
  }

  function clearAllData() {
    const confirmed = window.confirm('Clear all saved entries, call-outs, commissions, and running shift?');
    if (!confirmed) return;
    OLD_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(STORE_KEY);
    state = baseState();
    saveState();
    setDefaults();
    stopTicker();
    renderAll();
    toast('All saved data cleared.');
  }

  function bindEvents() {
    $('startBtn').addEventListener('click', startShift);
    $('stopBtn').addEventListener('click', stopShift);
    $('saveManualBtn').addEventListener('click', saveManualEntry);
    $('clearActiveBtn').addEventListener('click', clearActiveShift);
    $('endTime').addEventListener('input', updateActiveShiftUI);
    $('startTime').addEventListener('input', () => {
      if (state.activeShift) {
        state.activeShift.startTime = $('startTime').value;
        state.activeShift.startMs = dateTimeMs(state.activeShift.date, state.activeShift.startTime);
        saveState();
        updateActiveShiftUI();
      }
    });

    $('calloutType').addEventListener('change', () => updateCalloutPreview());
    $('calloutTypeClone').addEventListener('change', () => updateCalloutPreview('clone'));
    $('addCalloutBtn').addEventListener('click', () => addCallout($('calloutType').value, $('calloutDate').value || todayIso()));
    $('addCalloutBtnClone').addEventListener('click', () => addCallout($('calloutTypeClone').value, $('calloutDateClone').value || todayIso()));
    $('addCommissionBtn').addEventListener('click', () => {
      addCommission($('commissionAmount').value, $('commissionDate').value || todayIso());
      $('commissionAmount').value = '';
    });
    $('addCommissionBtnClone').addEventListener('click', () => {
      addCommission($('commissionAmountClone').value, $('commissionDateClone').value || todayIso());
      $('commissionAmountClone').value = '';
    });
    $('viewAllBtn').addEventListener('click', () => showSection('timeEntriesSection'));
    $('exportCsvBtn').addEventListener('click', exportCsv);
    $('generateReportBtn').addEventListener('click', generateReport);
    $('comparePaycheckBtn').addEventListener('click', comparePaycheck);
    $('saveSettingsBtn').addEventListener('click', saveSettings);
    $('resetDemoBtn').addEventListener('click', clearAllData);
    document.querySelectorAll('.nav-item').forEach((button) => {
      button.addEventListener('click', () => showSection(button.dataset.target));
    });
  }

  function updateHeaderDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    $('currentDate').textContent = new Date().toLocaleDateString(undefined, options);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js?v=20260617-3')
        .then((registration) => registration.update())
        .catch((error) => console.warn('Service worker registration failed', error));
    });
  }

  function init() {
    updateHeaderDate();
    bindEvents();
    setDefaults();
    renderAll();
    if (state.activeShift) startTicker();
    registerServiceWorker();
  }

  init();
})();
