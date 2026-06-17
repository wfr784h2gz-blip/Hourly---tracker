// ServiceNow Hourly Tracker application logic
(function () {
  // Persistent state
  let startTimestamp = null;

  // Retrieve stored arrays from localStorage
  const entries = JSON.parse(localStorage.getItem('entries') || '[]');
  const callouts = JSON.parse(localStorage.getItem('callouts') || '[]');
  const commissions = JSON.parse(localStorage.getItem('commissions') || '[]');

  // DOM references
  const clockDisplay = document.getElementById('clockDisplay');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const regularHoursEl = document.getElementById('regularHours');
  const overtimeHoursEl = document.getElementById('overtimeHours');
  const totalHoursEl = document.getElementById('totalHours');
  const regularPayEl = document.getElementById('regularPay');
  const overtimePayEl = document.getElementById('overtimePay');
  const commissionPayEl = document.getElementById('commissionPay');
  const totalPayEl = document.getElementById('totalPay');

  const calloutTypeEl = document.getElementById('calloutType');
  const calloutDateEl = document.getElementById('calloutDate');
  const calloutDisplayAmountEl = document.getElementById('calloutDisplayAmount');
  const calloutDisplayDescEl = document.getElementById('calloutDisplayDesc');
  const addCalloutBtn = document.getElementById('addCalloutBtn');
  const weekdaySumEl = document.getElementById('weekdaySum');
  const weekendSumEl = document.getElementById('weekendSum');
  const commissionSumEl = document.getElementById('commissionSum');
  const calloutCommissionSumEl = document.getElementById('calloutCommissionSum');

  const commissionAmountEl = document.getElementById('commissionAmount');
  const commissionDateEl = document.getElementById('commissionDate');
  const addCommissionBtn = document.getElementById('addCommissionBtn');

  const entriesTableBody = document.getElementById('entriesTableBody');

  // Constants
  const HOURLY_RATE = 32; // Base hourly rate ($/hr)
  const OVERTIME_MULTIPLIER = 1.5;
  const calloutRates = {
    weekday: 25,
    weekend: 50,
  };

  // Utility functions
  function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  function formatCurrency(num) {
    return `$${num.toFixed(2)}`;
  }

  function getTodayDateString() {
    return new Date().toLocaleDateString();
  }

  // Clock update: show current time (HH:mm) when timer not running; show running start time when running
  function updateClock() {
    if (startTimestamp) {
      const d = new Date(startTimestamp);
      clockDisplay.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      const now = new Date();
      clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Update callout display when type changes
  function updateCalloutDisplay() {
    const type = calloutTypeEl.value;
    const amount = calloutRates[type];
    calloutDisplayAmountEl.textContent = formatCurrency(amount);
    calloutDisplayDescEl.textContent = type === 'weekday' ? 'Weekday Call‑Out' : 'Weekend Call‑Out';
  }
  calloutTypeEl.addEventListener('change', updateCalloutDisplay);
  updateCalloutDisplay();

  // Start button handler
  startBtn.addEventListener('click', function () {
    if (startTimestamp) return;
    startTimestamp = Date.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    // Set date input default for callout/commission to today if empty
    if (!calloutDateEl.value) {
      calloutDateEl.valueAsNumber = Date.now() - new Date().getTimezoneOffset() * 60000;
    }
    if (!commissionDateEl.value) {
      commissionDateEl.valueAsNumber = Date.now() - new Date().getTimezoneOffset() * 60000;
    }
    updateClock();
  });

  // Stop button handler
  stopBtn.addEventListener('click', function () {
    if (!startTimestamp) return;
    const endTimestamp = Date.now();
    const start = new Date(startTimestamp);
    const end = new Date(endTimestamp);
    const diffMs = endTimestamp - startTimestamp;
    const totalMinutes = Math.floor(diffMs / 60000);
    const regularMinutes = Math.min(totalMinutes, 8 * 60);
    const overtimeMinutes = Math.max(0, totalMinutes - 8 * 60);
    const regularPay = (regularMinutes / 60) * HOURLY_RATE;
    const overtimePay = (overtimeMinutes / 60) * HOURLY_RATE * OVERTIME_MULTIPLIER;
    const hoursPay = regularPay + overtimePay;
    // Build entry object
    const entry = {
      date: start.toLocaleDateString(),
      start: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalMinutes: totalMinutes,
      overtimeMinutes: overtimeMinutes,
      hoursPay: hoursPay,
      calloutPay: 0,
      commission: 0,
      totalPay: hoursPay,
    };
    entries.push(entry);
    localStorage.setItem('entries', JSON.stringify(entries));
    // Reset state
    startTimestamp = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateUI();
  });

  // Add callout handler
  addCalloutBtn.addEventListener('click', function () {
    const type = calloutTypeEl.value;
    const dateVal = calloutDateEl.value;
    if (!dateVal) {
      alert('Please select a call‑out date.');
      return;
    }
    const amount = calloutRates[type];
    callouts.push({ type, date: dateVal, amount });
    localStorage.setItem('callouts', JSON.stringify(callouts));
    updateUI();
  });

  // Add commission handler
  addCommissionBtn.addEventListener('click', function () {
    const amount = parseFloat(commissionAmountEl.value);
    const dateVal = commissionDateEl.value;
    if (!dateVal || isNaN(amount) || amount <= 0) {
      alert('Please enter a commission amount and date.');
      return;
    }
    commissions.push({ amount, date: dateVal });
    localStorage.setItem('commissions', JSON.stringify(commissions));
    commissionAmountEl.value = '';
    updateUI();
  });

  // Delete entry handler (delegated)
  entriesTableBody.addEventListener('click', function (e) {
    if (e.target.classList.contains('delete-btn')) {
      const idx = parseInt(e.target.getAttribute('data-index'));
      if (!isNaN(idx)) {
        entries.splice(idx, 1);
        localStorage.setItem('entries', JSON.stringify(entries));
        updateUI();
      }
    }
  });

  // Calculate totals and update UI
  function updateUI() {
    const today = getTodayDateString();
    let regMin = 0;
    let otMin = 0;
    let hoursPaySum = 0;
    // Today-specific call‑out and commission totals
    let calloutTodaySum = 0;
    let commissionTodaySum = 0;
    // All call‑out totals
    let weekdayTotal = 0;
    let weekendTotal = 0;
    // Compute entries
    entries.forEach((entry) => {
      if (entry.date === today) {
        regMin += Math.min(entry.totalMinutes, 8 * 60);
        otMin += entry.overtimeMinutes;
        hoursPaySum += entry.hoursPay;
      }
    });
    // Compute callouts
    callouts.forEach((c) => {
      // date in ISO format from input; convert to locale date string for comparison
      const cDate = new Date(c.date).toLocaleDateString();
      if (cDate === today) {
        calloutTodaySum += c.amount;
      }
      if (c.type === 'weekday') {
        weekdayTotal += c.amount;
      } else if (c.type === 'weekend') {
        weekendTotal += c.amount;
      }
    });
    // Compute commissions
    commissions.forEach((c) => {
      const cDate = new Date(c.date).toLocaleDateString();
      if (cDate === today) {
        commissionTodaySum += c.amount;
      }
    });
    // Update summary elements
    regularHoursEl.textContent = formatTime(regMin);
    overtimeHoursEl.textContent = formatTime(otMin);
    totalHoursEl.textContent = formatTime(regMin + otMin);
    const regularPayTotal = (regMin / 60) * HOURLY_RATE;
    const overtimePayTotal = (otMin / 60) * HOURLY_RATE * OVERTIME_MULTIPLIER;
    regularPayEl.textContent = formatCurrency(regularPayTotal);
    overtimePayEl.textContent = formatCurrency(overtimePayTotal);
    commissionPayEl.textContent = formatCurrency(commissionTodaySum);
    const totalPay = regularPayTotal + overtimePayTotal + calloutTodaySum + commissionTodaySum;
    totalPayEl.textContent = formatCurrency(totalPay);
    // Update call‑out summary
    weekdaySumEl.textContent = formatCurrency(weekdayTotal);
    weekendSumEl.textContent = formatCurrency(weekendTotal);
    commissionSumEl.textContent = formatCurrency(commissions.reduce((sum, c) => sum + c.amount, 0));
    calloutCommissionSumEl.textContent = formatCurrency(weekdayTotal + weekendTotal + commissions.reduce((sum, c) => sum + c.amount, 0));
    // Populate entries table (show most recent first)
    entriesTableBody.innerHTML = '';
    // We'll display the last 5 entries
    const displayEntries = entries.slice().reverse().slice(0, 5);
    displayEntries.forEach((entry, displayIndex) => {
      const idx = entries.length - 1 - displayIndex; // actual index in entries array
      const tr = document.createElement('tr');
      const row = [
        entry.date,
        entry.start,
        entry.end,
        formatTime(entry.totalMinutes),
        formatTime(entry.overtimeMinutes),
        formatCurrency(entry.hoursPay),
        formatCurrency(entry.calloutPay || 0),
        formatCurrency(entry.commission || 0),
        formatCurrency(entry.totalPay),
        ''
      ];
      row.forEach((val, colIdx) => {
        const td = document.createElement(colIdx === row.length - 1 ? 'td' : 'td');
        td.textContent = val;
        tr.appendChild(td);
      });
      // Delete button
      const delTd = tr.lastChild;
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'delete-btn';
      delBtn.setAttribute('data-index', idx.toString());
      delTd.textContent = '';
      delTd.appendChild(delBtn);
      entriesTableBody.appendChild(tr);
    });
  }

  // Initial render
  updateUI();

  // Service worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    });
  }
})();
