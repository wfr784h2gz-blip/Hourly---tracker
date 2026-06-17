(() => {
  // Constants
  const HOURLY_RATE = 32;
  const OT_RATE = 48;
  const DAILY_LIMIT_MIN = 8 * 60;
  const calloutRates = { weekday: 25, weekend: 50 };

  // Persistent state
  let startTimestamp = null;
  let entries = JSON.parse(localStorage.getItem('entries') || '[]');
  let callouts = JSON.parse(localStorage.getItem('callouts') || '[]');
  let commissions = JSON.parse(localStorage.getItem('commissions') || '[]');

  // DOM elements
  const liveDateEl = document.getElementById('liveDate');
  const startTimeDisplay = document.getElementById('startTimeDisplay');
  const endTimeDisplay = document.getElementById('endTimeDisplay');
  const runningRegularEl = document.getElementById('runningRegular');
  const runningOvertimeEl = document.getElementById('runningOvertime');
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

  const entriesBody = document.getElementById('entriesBody');

  // Helpers
  function formatTime(min) {
    const hours = Math.floor(min / 60);
    const minutes = Math.floor(min % 60);
    return `${hours}h ${minutes}m`;
  }
  function formatCurrency(num) {
    return `$${num.toFixed(2)}`;
  }
  function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  function updateLiveDate() {
    const today = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    liveDateEl.textContent = today.toLocaleDateString(undefined, options);
  }

  // Time tracking handlers
  startBtn.addEventListener('click', () => {
    if (startTimestamp) return;
    startTimestamp = Date.now();
    const startDate = new Date(startTimestamp);
    startTimeDisplay.value = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    endTimeDisplay.value = '';
    runningRegularEl.textContent = '0h 0m';
    runningOvertimeEl.textContent = '0h 0m';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    // ensure callout/commission dates default to today
    const tzOffsetMs = new Date().getTimezoneOffset() * 60000;
    const todayIso = new Date(Date.now() - tzOffsetMs).toISOString().split('T')[0];
    if (!calloutDateEl.value) calloutDateEl.value = todayIso;
    if (!commissionDateEl.value) commissionDateEl.value = todayIso;
  });

  stopBtn.addEventListener('click', () => {
    if (!startTimestamp) return;
    const endTimestamp = Date.now();
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);
    const totalMinutes = Math.floor((endTimestamp - startTimestamp) / 60000);
    const regMin = Math.min(totalMinutes, DAILY_LIMIT_MIN);
    const otMin = Math.max(0, totalMinutes - DAILY_LIMIT_MIN);
    const regPay = (regMin / 60) * HOURLY_RATE;
    const otPay = (otMin / 60) * OT_RATE;
    const entry = {
      date: startDate.toISOString(),
      start: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalMinutes: totalMinutes,
      overtimeMinutes: otMin,
      hoursPay: regPay + otPay,
      calloutPay: 0,
      commission: 0,
      totalPay: regPay + otPay
    };
    entries.push(entry);
    localStorage.setItem('entries', JSON.stringify(entries));
    // reset running state
    startTimestamp = null;
    startTimeDisplay.value = '';
    endTimeDisplay.value = '';
    runningRegularEl.textContent = '0h 0m';
    runningOvertimeEl.textContent = '0h 0m';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateUI();
  });

  // Call‑out display
  function updateCalloutDisplay() {
    const type = calloutTypeEl.value;
    const amount = calloutRates[type] || 0;
    calloutAmountEl.textContent = formatCurrency(amount);
    calloutDescEl.textContent = type === 'weekday' ? 'Weekday Call‑Out' : 'Weekend Call‑Out';
  }
  calloutTypeEl.addEventListener('change', updateCalloutDisplay);

  // Add call‑out
  addCalloutBtn.addEventListener('click', () => {
    const type = calloutTypeEl.value;
    const dateVal = calloutDateEl.value;
    if (!dateVal) {
      alert('Please select a call‑out date.');
      return;
    }
    const amount = calloutRates[type] || 0;
    callouts.push({ type, date: dateVal, amount });
    localStorage.setItem('callouts', JSON.stringify(callouts));
    updateUI();
  });

  // Add commission
  addCommissionBtn.addEventListener('click', () => {
    const amount = parseFloat(commissionAmountEl.value);
    const dateVal = commissionDateEl.value;
    if (!dateVal || isNaN(amount) || amount <= 0) {
      alert('Please enter a valid commission amount and date.');
      return;
    }
    commissions.push({ amount, date: dateVal });
    localStorage.setItem('commissions', JSON.stringify(commissions));
    commissionAmountEl.value = '';
    updateUI();
  });

  // Delete entry handler using event delegation
  entriesBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const idx = parseInt(e.target.getAttribute('data-index'));
      if (!isNaN(idx)) {
        entries.splice(idx, 1);
        localStorage.setItem('entries', JSON.stringify(entries));
        updateUI();
      }
    }
  });

  // UI update
  function updateUI() {
    // Summary calculations
    const todayStr = getToday().toLocaleDateString();
    let regMin = 0;
    let otMin = 0;
    let calloutTodaySum = 0;
    let commissionTodaySum = 0;
    let weekdayTotal = 0;
    let weekendTotal = 0;
    let commissionSum = 0;
    // compute entries
    entries.forEach((entry) => {
      const entryDateStr = new Date(entry.date).toLocaleDateString();
      if (entryDateStr === todayStr) {
        regMin += Math.min(entry.totalMinutes, DAILY_LIMIT_MIN);
        otMin += entry.overtimeMinutes;
      }
    });
    // compute callouts
    callouts.forEach((c) => {
      const cDateStr = new Date(c.date).toLocaleDateString();
      if (cDateStr === todayStr) {
        calloutTodaySum += c.amount;
      }
      if (c.type === 'weekday') {
        weekdayTotal += c.amount;
      } else if (c.type === 'weekend') {
        weekendTotal += c.amount;
      }
    });
    // compute commissions
    commissions.forEach((c) => {
      const cDateStr = new Date(c.date).toLocaleDateString();
      commissionSum += c.amount;
      if (cDateStr === todayStr) {
        commissionTodaySum += c.amount;
      }
    });
    const regPayTotal = (regMin / 60) * HOURLY_RATE;
    const otPayTotal = (otMin / 60) * OT_RATE;
    const totalPay = regPayTotal + otPayTotal + calloutTodaySum + commissionTodaySum;
    // update summary elements
    todayRegEl.textContent = formatTime(regMin);
    todayOTEl.textContent = formatTime(otMin);
    todayTotalHoursEl.textContent = formatTime(regMin + otMin);
    todayRegPayEl.textContent = formatCurrency(regPayTotal);
    todayOTPayEl.textContent = formatCurrency(otPayTotal);
    todayCommissionEl.textContent = formatCurrency(commissionTodaySum);
    todayTotalPayEl.textContent = formatCurrency(totalPay);
    // update call‑out/commission totals
    weekdayTotalEl.textContent = formatCurrency(weekdayTotal);
    weekendTotalEl.textContent = formatCurrency(weekendTotal);
    commissionTotalEl.textContent = formatCurrency(commissionSum);
    calloutCommissionTotalEl.textContent = formatCurrency(weekdayTotal + weekendTotal + commissionSum);
    // populate entries table
    entriesBody.innerHTML = '';
    const displayEntries = entries.slice().reverse().slice(0, 5);
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
        formatCurrency(entry.totalPay || (entry.hoursPay + (entry.calloutPay||0) + (entry.commission||0)))
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

  // Default date values for forms
  function setDefaultDates() {
    const tzOffsetMs = new Date().getTimezoneOffset() * 60000;
    const todayIso = new Date(Date.now() - tzOffsetMs).toISOString().split('T')[0];
    calloutDateEl.value = calloutDateEl.value || todayIso;
    commissionDateEl.value = commissionDateEl.value || todayIso;
  }

  // Initialize
  updateLiveDate();
  updateCalloutDisplay();
  setDefaultDates();
  updateUI();
})();
