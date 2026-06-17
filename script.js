(() => {
  /**
   * Hourly Tracker – completely rebuilt for better mobile support
   *
   * This script manages time tracking, call‑outs, commissions, pay settings,
   * paycheck estimation, and summary calculations. Data is persisted in
   * localStorage so the app can be used offline as a PWA.
   */

  // State arrays loaded from localStorage
  let entries = JSON.parse(localStorage.getItem('entries')) || [];
  let callouts = JSON.parse(localStorage.getItem('callouts')) || [];
  let commissions = JSON.parse(localStorage.getItem('commissions')) || [];

  // Validate persisted data: if schema changed, reset arrays to prevent NaN
  function validateData() {
    // Validate entries: should have regMinutes, otMinutes and pay
    if (
      Array.isArray(entries) &&
      entries.some(
        (e) =>
          typeof e.regMinutes !== 'number' ||
          typeof e.otMinutes !== 'number' ||
          typeof e.pay !== 'number'
      )
    ) {
      entries = [];
      localStorage.setItem('entries', JSON.stringify(entries));
    }
    // Validate callouts: should have type and date
    if (
      Array.isArray(callouts) &&
      callouts.some((c) => !c.type || !c.date)
    ) {
      callouts = [];
      localStorage.setItem('callouts', JSON.stringify(callouts));
    }
    // Validate commissions: should have amount and date
    if (
      Array.isArray(commissions) &&
      commissions.some((c) => typeof c.amount !== 'number' || !c.date)
    ) {
      commissions = [];
      localStorage.setItem('commissions', JSON.stringify(commissions));
    }
  }

  // Pay rate settings with defaults
  let regularRate = parseFloat(localStorage.getItem('regularRate')) || 32;
  let overtimeRate = parseFloat(localStorage.getItem('overtimeRate')) || 48;
  let weekdayCalloutRate = parseFloat(localStorage.getItem('weekdayCalloutRate')) || 25;
  let weekendCalloutRate = parseFloat(localStorage.getItem('weekendCalloutRate')) || 50;

  // Idle detection settings
  let idleDetectionEnabled = JSON.parse(localStorage.getItem('idleDetectionEnabled')) || false;
  // Idle timeout in seconds (defaults to 5 minutes)
  let idleTimeoutSecs = parseInt(localStorage.getItem('idleTimeoutSecs')) || 300;
  // Timestamp of the last detected user activity
  let lastActivityTime = Date.now();

  // Current shift tracking
  let currentShift = null; // { start: Date }
  let timerInterval = null;

  /* Helper functions */

  // Format minutes as "xh ym"
  function formatMinutes(mins) {
    const hours = Math.floor(mins / 60);
    const minutes = Math.floor(mins % 60);
    return `${hours}h\u00a0${minutes}m`;
  }

  // Format currency
  function formatCurrency(value) {
    return `$${value.toFixed(2)}`;
  }

  // Update today's date and time
  function updateTodayDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('todayDate').textContent = now.toLocaleDateString(undefined, options);
  }

  // Compute if a date is weekend
  function isWeekend(d) {
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday (0) or Saturday (6)
  }

  // Start shift handler
  function startShift() {
    if (currentShift) return;
    currentShift = { start: new Date() };
    document.getElementById('startTime').textContent = currentShift.start
      .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('startShiftBtn').disabled = true;
    document.getElementById('stopShiftBtn').disabled = false;
    updateRunningDisplay(0, 0);
    timerInterval = setInterval(updateRunningTime, 1000);
  }

  // Stop shift handler
  function stopShift() {
    if (!currentShift) return;
    clearInterval(timerInterval);
    const end = new Date();
    const diffMs = end - currentShift.start;
    const totalMinutes = Math.floor(diffMs / 60000);
    const regMinutes = Math.min(totalMinutes, 480); // up to 8 hours (480 mins)
    const otMinutes = Math.max(totalMinutes - 480, 0);
    // Compute pay
    const regPay = (regMinutes / 60) * regularRate;
    const otPay = (otMinutes / 60) * overtimeRate;
    const pay = regPay + otPay;
    // Store entry
    const entry = {
      date: currentShift.start.toISOString(),
      start: currentShift.start.toISOString(),
      end: end.toISOString(),
      regMinutes,
      otMinutes,
      totalMinutes,
      pay,
      // default category and notes for auto entries
      category: '',
      notes: '',
    };
    entries.push(entry);
    localStorage.setItem('entries', JSON.stringify(entries));
    currentShift = null;
    document.getElementById('startShiftBtn').disabled = false;
    document.getElementById('stopShiftBtn').disabled = true;
    document.getElementById('startTime').textContent = '--:--';
    updateRunningDisplay(0, 0);
    updateUI();
  }

  // Update running timer display
  function updateRunningTime() {
    if (!currentShift) return;
    const now = new Date();
    const diffMs = now - currentShift.start;
    const totalMinutes = Math.floor(diffMs / 60000);
    const regMinutes = Math.min(totalMinutes, 480);
    const otMinutes = Math.max(totalMinutes - 480, 0);
    updateRunningDisplay(regMinutes, otMinutes);
  }

  function updateRunningDisplay(regMinutes, otMinutes) {
    document.getElementById('runningTime').textContent = formatMinutes(regMinutes);
    document.getElementById('runningOvertime').textContent = formatMinutes(otMinutes);
  }

  // Add call‑out
  function addCallout() {
    const type = document.getElementById('calloutType').value;
    const dateVal = document.getElementById('calloutDate').value;
    if (!dateVal) {
      alert('Please select a date for the call‑out.');
      return;
    }
    const date = new Date(dateVal);
    const callout = {
      date: date.toISOString(),
      type,
    };
    callouts.push(callout);
    localStorage.setItem('callouts', JSON.stringify(callouts));
    updateUI();
  }

  // Add commission
  function addCommission() {
    const amountVal = parseFloat(document.getElementById('commissionAmount').value);
    const dateVal = document.getElementById('commissionDate').value;
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Enter a valid commission amount.');
      return;
    }
    if (!dateVal) {
      alert('Select a date for the commission.');
      return;
    }
    const commission = {
      date: new Date(dateVal).toISOString(),
      amount: amountVal,
    };
    commissions.push(commission);
    localStorage.setItem('commissions', JSON.stringify(commissions));
    document.getElementById('commissionAmount').value = '';
    updateUI();
  }

  // Save pay rates
  function saveRates() {
    const reg = parseFloat(document.getElementById('rateRegular').value);
    const ot = parseFloat(document.getElementById('rateOvertime').value);
    const weekday = parseFloat(
      document.getElementById('rateWeekdayCallout').value
    );
    const weekend = parseFloat(
      document.getElementById('rateWeekendCallout').value
    );
    if (
      [reg, ot, weekday, weekend].some(
        (v) => isNaN(v) || v < 0
      )
    ) {
      alert('Please enter valid pay rates.');
      return;
    }
    regularRate = reg;
    overtimeRate = ot;
    weekdayCalloutRate = weekday;
    weekendCalloutRate = weekend;
    localStorage.setItem('regularRate', regularRate);
    localStorage.setItem('overtimeRate', overtimeRate);
    localStorage.setItem('weekdayCalloutRate', weekdayCalloutRate);
    localStorage.setItem('weekendCalloutRate', weekendCalloutRate);
    alert('Rates saved!');
    updateUI();
  }

  // Estimate paycheck
  function estimatePay() {
    const regHours = parseFloat(document.getElementById('estRegHours').value) || 0;
    const overHours = parseFloat(document.getElementById('estOverHours').value) || 0;
    const weekdayCount = parseInt(
      document.getElementById('estWeekdayCallouts').value
    ) || 0;
    const weekendCount = parseInt(
      document.getElementById('estWeekendCallouts').value
    ) || 0;
    const commission = parseFloat(
      document.getElementById('estCommission').value
    ) || 0;
    const frequencyMultiplier = parseFloat(
      document.getElementById('estFrequency').value
    );
    const regPay = regHours * regularRate;
    const otPay = overHours * overtimeRate;
    const calloutPay =
      weekdayCount * weekdayCalloutRate + weekendCount * weekendCalloutRate;
    const gross = (regPay + otPay + calloutPay + commission) * frequencyMultiplier;
    document.getElementById('estResult').textContent = formatCurrency(gross);
  }

  // Add a manual entry with custom times, call‑out, commission, category and notes
  function addManualEntry() {
    const dateVal = document.getElementById('manualDate').value;
    const startVal = document.getElementById('manualStart').value;
    const endVal = document.getElementById('manualEnd').value;
    if (!dateVal || !startVal || !endVal) {
      alert('Please enter a date, start time and end time for the manual entry.');
      return;
    }
    // Construct full Date objects
    const startDate = new Date(`${dateVal}T${startVal}`);
    const endDate = new Date(`${dateVal}T${endVal}`);
    if (isNaN(startDate) || isNaN(endDate) || endDate <= startDate) {
      alert('End time must be after start time.');
      return;
    }
    const totalMinutes = Math.floor((endDate - startDate) / 60000);
    const regMinutes = Math.min(totalMinutes, 480);
    const otMinutes = Math.max(totalMinutes - 480, 0);
    const regPay = (regMinutes / 60) * regularRate;
    const otPay = (otMinutes / 60) * overtimeRate;
    const pay = regPay + otPay;
    // Category and notes
    const category = document.getElementById('manualCategory').value.trim();
    const notes = document.getElementById('manualNotes').value.trim();
    // Build and store entry
    const entry = {
      date: startDate.toISOString(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      regMinutes,
      otMinutes,
      totalMinutes,
      pay,
      category,
      notes,
    };
    entries.push(entry);
    localStorage.setItem('entries', JSON.stringify(entries));
    // Optional call‑out
    const calloutType = document.getElementById('manualCallout').value;
    if (calloutType) {
      const callout = {
        date: startDate.toISOString(),
        type: calloutType,
      };
      callouts.push(callout);
      localStorage.setItem('callouts', JSON.stringify(callouts));
    }
    // Optional commission
    const commissionVal = parseFloat(
      document.getElementById('manualCommission').value
    );
    if (!isNaN(commissionVal) && commissionVal > 0) {
      const commissionObj = {
        date: startDate.toISOString(),
        amount: commissionVal,
      };
      commissions.push(commissionObj);
      localStorage.setItem('commissions', JSON.stringify(commissions));
    }
    // Reset form fields
    const todayIso = new Date().toISOString().substring(0, 10);
    document.getElementById('manualDate').value = todayIso;
    document.getElementById('manualStart').value = '';
    document.getElementById('manualEnd').value = '';
    document.getElementById('manualCallout').value = '';
    document.getElementById('manualCommission').value = '';
    document.getElementById('manualCategory').value = '';
    document.getElementById('manualNotes').value = '';
    updateUI();
  }

  // Export entries and extras to CSV file
  function exportCsv() {
    // Prepare CSV header
    let csv = 'Type,Date,Start,End,Reg Minutes,OT Minutes,Total Pay,Category,Notes\n';
    // Add entries
    entries.forEach((entry) => {
      const date = new Date(entry.start);
      const dateStr = date.toISOString().substring(0, 10);
      const startTime = date.toTimeString().substring(0, 5);
      const endTime = new Date(entry.end).toTimeString().substring(0, 5);
      csv += `Entry,${dateStr},${startTime},${endTime},${entry.regMinutes},${entry.otMinutes},${entry.pay.toFixed(
        2
      )},${entry.category || ''},${entry.notes || ''}\n`;
    });
    // Add call‑outs
    callouts.forEach((co) => {
      const d = new Date(co.date);
      const dateStr = d.toISOString().substring(0, 10);
      csv += `Call‑Out,${dateStr},,,,,${
        co.type === 'weekday' ? weekdayCalloutRate : weekendCalloutRate
      }.00,,\n`;
    });
    // Add commissions
    commissions.forEach((com) => {
      const d = new Date(com.date);
      const dateStr = d.toISOString().substring(0, 10);
      csv += `Commission,${dateStr},,,,,${com.amount.toFixed(2)},,\n`;
    });
    // Create blob and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hourly_tracker_data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Compute custom range summary
  function computeRangeSummary() {
    const startVal = document.getElementById('rangeStart').value;
    const endVal = document.getElementById('rangeEnd').value;
    if (!startVal || !endVal) {
      alert('Select start and end dates for the summary.');
      return;
    }
    const startDate = new Date(`${startVal}T00:00:00`);
    const endDate = new Date(`${endVal}T23:59:59`);
    let rangeMinutes = 0;
    let rangePay = 0;
    let rangeCall = 0;
    let rangeCom = 0;
    // Process entries
    entries.forEach((entry) => {
      const entryDate = new Date(entry.start);
      if (entryDate >= startDate && entryDate <= endDate) {
        const totalMin = typeof entry.totalMinutes === 'number' ? entry.totalMinutes : (entry.regMinutes + entry.otMinutes);
        rangeMinutes += totalMin;
        rangePay += entry.pay;
      }
    });
    // Process callouts
    callouts.forEach((co) => {
      const coDate = new Date(co.date);
      if (coDate >= startDate && coDate <= endDate) {
        rangeCall += co.type === 'weekday' ? weekdayCalloutRate : weekendCalloutRate;
      }
    });
    // Process commissions
    commissions.forEach((com) => {
      const comDate = new Date(com.date);
      if (comDate >= startDate && comDate <= endDate) {
        rangeCom += com.amount;
      }
    });
    // Update display
    document.getElementById('rangeHours').textContent = formatMinutes(rangeMinutes);
    document.getElementById('rangePay').textContent = formatCurrency(rangePay);
    document.getElementById('rangeCallout').textContent = formatCurrency(rangeCall);
    document.getElementById('rangeCommission').textContent = formatCurrency(rangeCom);
    const rangeGross = rangePay + rangeCall + rangeCom;
    document.getElementById('rangeGross').textContent = formatCurrency(rangeGross);
  }

  // Delete entry by index
  function deleteEntry(index) {
    entries.splice(index, 1);
    localStorage.setItem('entries', JSON.stringify(entries));
    updateUI();
  }

  // Edit entry by index
  function editEntry(index) {
    const entry = entries[index];
    if (!entry) return;
    const entryDate = new Date(entry.start);
    // Prefill manual entry form
    document.getElementById('manualDate').value = entryDate.toISOString().substring(0, 10);
    document.getElementById('manualStart').value = entryDate
      .toISOString()
      .substring(11, 16);
    document.getElementById('manualEnd').value = new Date(entry.end)
      .toISOString()
      .substring(11, 16);
    document.getElementById('manualCallout').value = '';
    document.getElementById('manualCommission').value = '';
    document.getElementById('manualCategory').value = entry.category || '';
    document.getElementById('manualNotes').value = entry.notes || '';
    // Remove from array and update
    entries.splice(index, 1);
    localStorage.setItem('entries', JSON.stringify(entries));
    updateUI();
    // Scroll to manual entry form
    const manualCard = document.getElementById('manualEntry');
    if (manualCard) manualCard.scrollIntoView({ behavior: 'smooth' });
  }

  // Summary calculations and UI update
  function updateUI() {
    // Reset totals
    let todayReg = 0;
    let todayOt = 0;
    let todayRegPay = 0;
    let todayOtPay = 0;
    let todayCallPay = 0;
    let todayCommissionPay = 0;
    let weekMinutes = 0;
    let weekPay = 0;
    const today = new Date();
    const todayKey = today.toISOString().substring(0, 10);
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    // Process entries
    entries.forEach((entry) => {
      const dateKey = entry.start.substring(0, 10);
      const entryDate = new Date(entry.start);
      const totalMins = typeof entry.totalMinutes === 'number' ? entry.totalMinutes : (entry.regMinutes + entry.otMinutes);
      if (dateKey === todayKey) {
        todayReg += entry.regMinutes;
        todayOt += entry.otMinutes;
        const payRate = entry.pay;
        todayRegPay += (entry.regMinutes / 60) * regularRate;
        todayOtPay += (entry.otMinutes / 60) * overtimeRate;
      }
      if (entryDate >= weekStart && entryDate < weekEnd) {
        weekMinutes += totalMins;
        weekPay += entry.pay;
      }
    });
    // Process callouts
    callouts.forEach((co) => {
      const dateKey = co.date.substring(0, 10);
      const coDate = new Date(co.date);
      const rate = co.type === 'weekday' ? weekdayCalloutRate : weekendCalloutRate;
      if (dateKey === todayKey) todayCallPay += rate;
      if (coDate >= weekStart && coDate < weekEnd) {
        weekPay += rate;
      }
    });
    // Process commissions
    commissions.forEach((com) => {
      const dateKey = com.date.substring(0, 10);
      const comDate = new Date(com.date);
      if (dateKey === todayKey) todayCommissionPay += com.amount;
      if (comDate >= weekStart && comDate < weekEnd) weekPay += com.amount;
    });
    // Update today summary
    const todayHours = todayReg + todayOt;
    document.getElementById('todayHours').textContent = formatMinutes(todayReg);
    document.getElementById('todayOvertime').textContent = formatMinutes(todayOt);
    document.getElementById('todayTotalHours').textContent = formatMinutes(todayHours);
    document.getElementById('todayRegPay').textContent = formatCurrency(todayRegPay);
    document.getElementById('todayOverPay').textContent = formatCurrency(todayOtPay);
    document.getElementById('todayCalloutPay').textContent = formatCurrency(todayCallPay);
    document.getElementById('todayCommission').textContent = formatCurrency(todayCommissionPay);
    const todayGross = todayRegPay + todayOtPay + todayCallPay + todayCommissionPay;
    document.getElementById('todayGrossPay').textContent = formatCurrency(todayGross);
    // Update weekly summary
    document.getElementById('weekTotalHours').textContent = formatMinutes(
      weekMinutes
    );
    document.getElementById('weekTotalPay').textContent = formatCurrency(weekPay);
    // Update entries table
    const tbody = document.querySelector('#entriesTable tbody');
    tbody.innerHTML = '';
    entries
      .slice()
      .reverse()
      .forEach((entry, idx) => {
        const tr = document.createElement('tr');
        const entryDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        const displayIndex = entries.length - 1 - idx;
        tr.innerHTML = `
          <td>${entryDate.toLocaleDateString()}</td>
          <td>${entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${formatMinutes(entry.regMinutes)}</td>
          <td>${formatMinutes(entry.otMinutes)}</td>
          <td>${formatCurrency(entry.pay)}</td>
          <td>${entry.category || ''}</td>
          <td>${entry.notes || ''}</td>
          <td><button class="edit-btn" data-index="${displayIndex}">Edit</button></td>
          <td><button class="delete-btn" data-index="${displayIndex}">Delete</button></td>
        `;
        tbody.appendChild(tr);
      });
    // Update quick summary if present
    if (document.getElementById('quickRunningTime')) {
      updateQuickSummary();
    }
    // Update insights card if present
    if (document.getElementById('avgShift')) {
      updateInsights();
    }
    // Update quick start buttons state
    if (typeof updateQuickButtons === 'function') {
      updateQuickButtons();
    }
  }

  // Event listeners
  document.getElementById('startShiftBtn').addEventListener('click', startShift);
  document.getElementById('stopShiftBtn').addEventListener('click', stopShift);
  document.getElementById('addCalloutBtn').addEventListener('click', addCallout);
  document.getElementById('addCommissionBtn').addEventListener('click', addCommission);
  document.getElementById('saveRatesBtn').addEventListener('click', saveRates);
  document.getElementById('estimateBtn').addEventListener('click', estimatePay);

  // Additional features event listeners
  const manualBtn = document.getElementById('addManualEntryBtn');
  if (manualBtn) {
    manualBtn.addEventListener('click', addManualEntry);
  }
  const exportBtn = document.getElementById('exportCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCsv);
  }
  const rangeBtn = document.getElementById('computeRangeBtn');
  if (rangeBtn) {
    rangeBtn.addEventListener('click', computeRangeSummary);
  }

  // Delegated delete and edit handler for dynamic buttons
  document
    .querySelector('#entriesTable tbody')
    .addEventListener('click', (e) => {
      const target = e.target;
      // Delete button
      if (target.classList.contains('delete-btn')) {
        const index = parseInt(target.getAttribute('data-index'), 10);
        deleteEntry(index);
      }
      // Edit button
      if (target.classList.contains('edit-btn')) {
        const index = parseInt(target.getAttribute('data-index'), 10);
        editEntry(index);
      }
    });

  /* ====================
     Quick Start and Idle Detection
     ==================== */
  // Quick start buttons
  const quickStartBtn = document.getElementById('quickStartBtn');
  const quickStopBtn = document.getElementById('quickStopBtn');
  function updateQuickButtons() {
    if (!quickStartBtn || !quickStopBtn) return;
    // If a shift is running, disable start and enable stop
    quickStartBtn.disabled = currentShift !== null;
    quickStopBtn.disabled = currentShift === null;
  }
  if (quickStartBtn && quickStopBtn) {
    quickStartBtn.addEventListener('click', () => {
      startShift();
      updateQuickButtons();
    });
    quickStopBtn.addEventListener('click', () => {
      stopShift();
      updateQuickButtons();
    });
  }

  // Update quick summary display
  function updateQuickSummary() {
    const runningSpan = document.getElementById('quickRunningTime');
    const grossSpan = document.getElementById('quickGrossPay');
    if (runningSpan) {
      runningSpan.textContent = document.getElementById('runningTime').textContent;
    }
    if (grossSpan) {
      grossSpan.textContent = document.getElementById('todayGrossPay').textContent;
    }
  }

  // Insights update function
  function updateInsights() {
    // Average shift length
    let totalMinutesSum = 0;
    entries.forEach((e) => {
      const tm = typeof e.totalMinutes === 'number' ? e.totalMinutes : (e.regMinutes + e.otMinutes);
      totalMinutesSum += tm;
    });
    const avgShiftMins = entries.length ? totalMinutesSum / entries.length : 0;
    // Average hours per day in last 7 days
    const sevenDayStart = new Date();
    sevenDayStart.setHours(0, 0, 0, 0);
    sevenDayStart.setDate(sevenDayStart.getDate() - 6);
    const dayTotals = {};
    entries.forEach((e) => {
      const d = new Date(e.start);
      if (d >= sevenDayStart) {
        const key = d.toISOString().substring(0, 10);
        const tm = typeof e.totalMinutes === 'number' ? e.totalMinutes : (e.regMinutes + e.otMinutes);
        dayTotals[key] = (dayTotals[key] || 0) + tm;
      }
    });
    const dayCount = Object.keys(dayTotals).length;
    const totalDayMinutes = Object.values(dayTotals).reduce((a, b) => a + b, 0);
    const avgDayMinutes = dayCount ? totalDayMinutes / dayCount : 0;
    // Top category by count
    const categoryCounts = {};
    entries.forEach((e) => {
      if (e.category) {
        categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
      }
    });
    let topCategory = 'N/A';
    let maxCount = 0;
    for (const cat in categoryCounts) {
      if (categoryCounts[cat] > maxCount) {
        maxCount = categoryCounts[cat];
        topCategory = cat;
      }
    }
    // Update DOM
    const avgShiftElem = document.getElementById('avgShift');
    const avgHoursElem = document.getElementById('avgHours');
    const topCatElem = document.getElementById('topCategory');
    if (avgShiftElem) avgShiftElem.textContent = formatMinutes(avgShiftMins);
    if (avgHoursElem) avgHoursElem.textContent = formatMinutes(avgDayMinutes);
    if (topCatElem) topCatElem.textContent = topCategory;
  }

  // Idle detection activity reset
  function resetIdleTimer() {
    lastActivityTime = Date.now();
  }
  ['mousemove', 'keydown', 'touchstart'].forEach((evt) => {
    document.addEventListener(evt, resetIdleTimer);
  });
  // Idle detection timer
  setInterval(() => {
    if (idleDetectionEnabled && currentShift) {
      const idleSecs = (Date.now() - lastActivityTime) / 1000;
      if (idleSecs >= idleTimeoutSecs) {
        stopShift();
        alert('Shift paused due to inactivity.');
      }
    }
  }, 60000);

  // Idle detection toggle
  const idleToggleElem = document.getElementById('idleToggle');
  if (idleToggleElem) {
    idleToggleElem.checked = idleDetectionEnabled;
    idleToggleElem.addEventListener('change', (e) => {
      idleDetectionEnabled = e.target.checked;
      localStorage.setItem('idleDetectionEnabled', idleDetectionEnabled);
    });
  }

  // Initialize default dates
  function initDates() {
    const todayIso = new Date().toISOString().substring(0, 10);
    document.getElementById('calloutDate').value = todayIso;
    document.getElementById('commissionDate').value = todayIso;
    // Initialize manual entry date if field exists
    const manualDateInput = document.getElementById('manualDate');
    if (manualDateInput) {
      manualDateInput.value = todayIso;
    }
  }

  // Initialize pay settings inputs
  function initPaySettings() {
    document.getElementById('rateRegular').value = regularRate;
    document.getElementById('rateOvertime').value = overtimeRate;
    document.getElementById('rateWeekdayCallout').value = weekdayCalloutRate;
    document.getElementById('rateWeekendCallout').value = weekendCalloutRate;
    // Idle toggle
    const idleElem = document.getElementById('idleToggle');
    if (idleElem) idleElem.checked = idleDetectionEnabled;
  }

  // Initialize app
  function init() {
    // Clean up any stale data from previous versions
    validateData();
    updateTodayDate();
    initDates();
    initPaySettings();
    updateUI();
    // Update date header every minute
    setInterval(updateTodayDate, 60000);
    // Update quick start and insights on init
    if (typeof updateQuickButtons === 'function') {
      updateQuickButtons();
    }
    if (typeof updateQuickSummary === 'function') {
      updateQuickSummary();
    }
    if (typeof updateInsights === 'function') {
      updateInsights();
    }
  }

  init();
})();