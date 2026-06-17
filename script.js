(() => {
  'use strict';

  const APP_VERSION = '2026.06.17-4';
  const HOURLY_RATE = 32;
  const OT_RATE = 48;
  const DAILY_LIMIT_MIN = 8 * 60;
  const calloutRates = { weekday: 25, weekend: 50 };
  const ACTIVE_SHIFT_KEY = 'activeStartTimestamp';

  let startTimestamp = Number(localStorage.getItem(ACTIVE_SHIFT_KEY)) || null;
  let liveTimerInterval = null;
  let entries = readArray('entries');
  let callouts = readArray('callouts');
  let commissions = readArray('commissions');

  const liveDateEl = document.getElementById('liveDate');
  const appVersionEl = document.getElementById('appVersion');
  const shiftStatusEl = document.getElementById('shiftStatus');
  const startTimeDisplay = document.getElementById('startTimeDisplay');
  const endTimeDisplay = document.getElementById('endTimeDisplay');
  const manualEndTimeEl = document.getElementById('manualEndTime');
  const runningRegularEl = document.getElementById('runningRegular');
  const runningOvertimeEl = document.getElementById('runningOvertime');
  const runningPayEl = document.getElementById('runningPay');
  const startBtn = document.getElementById('startShiftBtn');
  const stopBtn = document.getElementById('stopShiftBtn');

  const todayRegEl = document.getElementById('todayReg');
  const todayOTEl = document.getElementById('todayOT');
  const todayTotalHoursEl = document.getElementById('todayTotalHours');
  const todayRegPayEl = document.getElementById('todayRegPay');
  const todayOTPayEl = document.getElementById('todayOTPay');
  const todayCommissionEl = document.getElementById('todayCommission');
  const todayTotalPayEl = document.getElementById('todayTotalPay');

  const calloutTypeEl = document.getElementById('calloutType');
  const calloutDateEl = document.getElementById('calloutDate');
  const calloutAmountEl = document.getElementById('calloutAmount');
  const calloutDescEl = document.getElementById('calloutDesc');
  const addCalloutBtn = document.getElementById('addCalloutBtn');

  const commissionAmountEl = document.getElementById('commissionAmount');
  const commissionDateEl = document.getElementById('commissionDate');
  const addCommissionBtn = document.getElementById('addCommissionBtn');

  const weekdayTotalEl = document.getElementById('weekdayTotal');
  const weekendTotalEl = document.getElementById('weekendTotal');
  const commissionTotalEl = document.getElementById('commissionTotal');
  const calloutCommissionTotalEl = document.getElementById('calloutCommissionTotal');
  const weekHoursEl = document.getElementById('weekHours');
  const weekPayEl = document.getElementById('weekPay');
  const entriesBody = document.getElementById('entriesBody');

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatTime(min) {
    const safeMin = Math.max(0, Math.floor(Number(min) || 0));
    const hours = Math.floor(safeMin / 60);
    const minutes = safeMin % 60;
    return `${hours}h ${minutes}m`;
  }

  function formatCurrency(num) {
    return `$${(Number(num) || 0).toFixed(2)}`;
  }

  function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function getTodayIsoDate() {
    const tzOffsetMs = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffsetMs).toISOString().split('T')[0];
  }

  function parseDateOnlyLocal(dateValue) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue))) return null;
    const [year, month, day] = dateValue.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function parseManualEnd() {
    if (!manualEndTimeEl.value) return null;
    const parsed = new Date(manualEndTimeEl.value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function displayClockTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function updateLiveDate() {
    const today = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    liveDateEl.textContent = today.toLocaleDateString(undefined, options);
    if (appVersionEl) appVersionEl.textContent = `Version ${APP_VERSION}`;
  }

  function calculateShift(startMs, endMs) {
    const totalMinutes = Math.max(0, Math.floor((endMs - startMs) / 60000));
    const regMin = Math.min(totalMinutes, DAILY_LIMIT_MIN);
    const otMin = Math.max(0, totalMinutes - DAILY_LIMIT_MIN);
    const regPay = (regMin / 60) * HOURLY_RATE;
    const otPay = (otMin / 60) * OT_RATE;
    return { totalMinutes, regMin, otMin, regPay, otPay };
  }

  function updateRunningDisplay() {
    if (!startTimestamp) {
      startTimeDisplay.value = '';
      endTimeDisplay.value = '';
      runningRegularEl.textContent = '0h 0m';
      runningOvertimeEl.textContent = '0h 0m';
      if (runningPayEl) runningPayEl.textContent = '$0.00';
      if (shiftStatusEl) shiftStatusEl.textContent = 'Not running';
      startBtn.disabled = false;
      stopBtn.disabled = true;
      return;
    }

    const now = Date.now();
    const startDate = new Date(startTimestamp);
    const running = calculateShift(startTimestamp, now);
    startTimeDisplay.value = displayClockTime(startDate);
    endTimeDisplay.value = displayClockTime(new Date(now));
    runningRegularEl.textContent = formatTime(running.regMin);
    runningOvertimeEl.textContent = formatTime(running.otMin);
    if (runningPayEl) runningPayEl.textContent = formatCurrency(running.regPay + running.otPay);
    if (shiftStatusEl) shiftStatusEl.textContent = `Running since ${displayClockTime(startDate)}. Safe to close and reopen.`;
    startBtn.disabled = true;
    stopBtn.disabled = false;
  }

  function startLiveTimer() {
    if (liveTimerInterval) clearInterval(liveTimerInterval);
    updateRunningDisplay();
    liveTimerInterval = setInterval(updateRunningDisplay, 1000);
  }

  function stopLiveTimer() {
    if (liveTimerInterval) clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }

  function startShift() {
    if (startTimestamp) return;
    startTimestamp = Date.now();
    localStorage.setItem(ACTIVE_SHIFT_KEY, String(startTimestamp));
    manualEndTimeEl.value = '';
    if (!calloutDateEl.value) calloutDateEl.value = getTodayIsoDate();
    if (!commissionDateEl.value) commissionDateEl.value = getTodayIsoDate();
    startLiveTimer();
  }

  function stopShift() {
    if (!startTimestamp) return;
    const manualEnd = parseManualEnd();
    const endTimestamp = manualEnd ? manualEnd.getTime() : Date.now();
    if (endTimestamp <= startTimestamp) {
      alert('Out time must be after the start time.');
      return;
    }

    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);
    const shift = calculateShift(startTimestamp, endTimestamp);
    entries.push({
      date: startDate.toISOString(),
      start: displayClockTime(startDate),
      end: displayClockTime(endDate),
      totalMinutes: shift.totalMinutes,
      overtimeMinutes: shift.otMin,
      hoursPay: shift.regPay + shift.otPay,
      calloutPay: 0,
      commission: 0,
      totalPay: shift.regPay + shift.otPay
    });
    saveArray('entries', entries);

    startTimestamp = null;
    localStorage.removeItem(ACTIVE_SHIFT_KEY);
    manualEndTimeEl.value = '';
    stopLiveTimer();
    updateRunningDisplay();
    updateUI();
  }

  startBtn.addEventListener('click', startShift);
  stopBtn.addEventListener('click', stopShift);
  manualEndTimeEl.addEventListener('change', () => {
    if (startTimestamp) updateRunningDisplay();
  });

  function updateCalloutDisplay() {
    const type = calloutTypeEl.value;
    const amount = calloutRates[type] || 0;
    calloutAmountEl.textContent = formatCurrency(amount);
    calloutDescEl.textContent = type === 'weekday' ? 'Weekday Call‑Out' : 'Weekend Call‑Out';
  }
  calloutTypeEl.addEventListener('change', updateCalloutDisplay);

  addCalloutBtn.addEventListener('click', () => {
    const type = calloutTypeEl.value;
    const dateVal = calloutDateEl.value;
    if (!dateVal) {
      alert('Please select a call‑out date.');
      return;
    }
    const amount = calloutRates[type] || 0;
    callouts.push({ type, date: dateVal, amount });
    saveArray('callouts', callouts);
    updateUI();
  });

  addCommissionBtn.addEventListener('click', () => {
    const amount = parseFloat(commissionAmountEl.value);
    const dateVal = commissionDateEl.value;
    if (!dateVal || isNaN(amount) || amount <= 0) {
      alert('Please enter a valid commission amount and date.');
      return;
    }
    commissions.push({ amount, date: dateVal });
    saveArray('commissions', commissions);
    commissionAmountEl.value = '';
    updateUI();
  });

  entriesBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const idx = parseInt(e.target.getAttribute('data-index'), 10);
      if (!isNaN(idx)) {
        entries.splice(idx, 1);
        saveArray('entries', entries);
        updateUI();
      }
    }
  });

  function dateMatchesToday(dateValue) {
    const parsed = parseDateOnlyLocal(dateValue) || new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.toLocaleDateString() === getToday().toLocaleDateString();
  }

  function updateUI() {
    const todayStr = getToday().toLocaleDateString();
    let regMin = 0;
    let otMin = 0;
    let calloutTodaySum = 0;
    let commissionTodaySum = 0;
    let weekdayTotal = 0;
    let weekendTotal = 0;
    let commissionSum = 0;

    entries.forEach((entry) => {
      const entryDateStr = new Date(entry.date).toLocaleDateString();
      if (entryDateStr === todayStr) {
        regMin += Math.min(Number(entry.totalMinutes) || 0, DAILY_LIMIT_MIN);
        otMin += Number(entry.overtimeMinutes) || 0;
      }
    });

    callouts.forEach((c) => {
      if (dateMatchesToday(c.date)) calloutTodaySum += Number(c.amount) || 0;
      if (c.type === 'weekday') weekdayTotal += Number(c.amount) || 0;
      if (c.type === 'weekend') weekendTotal += Number(c.amount) || 0;
    });

    commissions.forEach((c) => {
      commissionSum += Number(c.amount) || 0;
      if (dateMatchesToday(c.date)) commissionTodaySum += Number(c.amount) || 0;
    });

    const regPayTotal = (regMin / 60) * HOURLY_RATE;
    const otPayTotal = (otMin / 60) * OT_RATE;
    const totalPay = regPayTotal + otPayTotal + calloutTodaySum + commissionTodaySum;

    todayRegEl.textContent = formatTime(regMin);
    todayOTEl.textContent = formatTime(otMin);
    todayTotalHoursEl.textContent = formatTime(regMin + otMin);
    todayRegPayEl.textContent = formatCurrency(regPayTotal);
    todayOTPayEl.textContent = formatCurrency(otPayTotal);
    todayCommissionEl.textContent = formatCurrency(commissionTodaySum);
    todayTotalPayEl.textContent = formatCurrency(totalPay);
    weekdayTotalEl.textContent = formatCurrency(weekdayTotal);
    weekendTotalEl.textContent = formatCurrency(weekendTotal);
    commissionTotalEl.textContent = formatCurrency(commissionSum);
    calloutCommissionTotalEl.textContent = formatCurrency(weekdayTotal + weekendTotal + commissionSum);

    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = todayDate.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - diffToMonday);

    let weekRegMin = 0;
    let weekOTMin = 0;
    let weekCalloutSum = 0;
    let weekCommissionSum = 0;

    entries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      if (entryDay >= weekStart && entryDay <= todayDate) {
        weekRegMin += Math.min(Number(entry.totalMinutes) || 0, DAILY_LIMIT_MIN);
        weekOTMin += Number(entry.overtimeMinutes) || 0;
      }
    });
    callouts.forEach((c) => {
      const cDay = parseDateOnlyLocal(c.date);
      if (cDay && cDay >= weekStart && cDay <= todayDate) weekCalloutSum += Number(c.amount) || 0;
    });
    commissions.forEach((c) => {
      const cDay = parseDateOnlyLocal(c.date);
      if (cDay && cDay >= weekStart && cDay <= todayDate) weekCommissionSum += Number(c.amount) || 0;
    });

    const weekRegPay = (weekRegMin / 60) * HOURLY_RATE;
    const weekOTPay = (weekOTMin / 60) * OT_RATE;
    weekHoursEl.textContent = formatTime(weekRegMin + weekOTMin);
    weekPayEl.textContent = formatCurrency(weekRegPay + weekOTPay + weekCalloutSum + weekCommissionSum);

    entriesBody.innerHTML = '';
    const displayEntries = entries.slice().reverse().slice(0, 10);
    if (!displayEntries.length) {
      entriesBody.innerHTML = '<tr><td colspan="10" class="empty-row">No entries yet.</td></tr>';
      return;
    }
    displayEntries.forEach((entry, displayIndex) => {
      const idx = entries.length - 1 - displayIndex;
      const tr = document.createElement('tr');
      const rowVals = [
        new Date(entry.date).toLocaleDateString(),
        entry.start,
        entry.end,
        formatTime(entry.totalMinutes),
        formatTime(entry.overtimeMinutes),
        formatCurrency(entry.hoursPay),
        formatCurrency(entry.calloutPay || 0),
        formatCurrency(entry.commission || 0),
        formatCurrency(entry.totalPay || (entry.hoursPay + (entry.calloutPay || 0) + (entry.commission || 0)))
      ];
      rowVals.forEach((val) => {
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });
      const delTd = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'delete-btn';
      delBtn.setAttribute('data-index', idx.toString());
      delTd.appendChild(delBtn);
      tr.appendChild(delTd);
      entriesBody.appendChild(tr);
    });
  }

  function setDefaultDates() {
    const todayIso = getTodayIsoDate();
    calloutDateEl.value = calloutDateEl.value || todayIso;
    commissionDateEl.value = commissionDateEl.value || todayIso;
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`./service-worker.js?v=${encodeURIComponent(APP_VERSION)}`)
        .then((registration) => registration.update())
        .catch(() => {});
    });
  }

  window.addEventListener('focus', updateRunningDisplay);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateRunningDisplay();
  });

  updateLiveDate();
  updateCalloutDisplay();
  setDefaultDates();
  registerServiceWorker();
  updateUI();
  if (startTimestamp) startLiveTimer();
  else updateRunningDisplay();
})();
