// This file is an enhanced version of the dark_hourly_tracker/script.js from
// the Hourly Tracker project. In addition to persisting the active start
// time across page reloads, it also provides a live timer that updates
// the displayed hours, overtime and pay as time elapses. When the user
// clicks Start, the timer begins updating every second, and it stops
// automatically when the user clicks Stop. Upon reload, if there is
// an active start time saved and no end time, the timer resumes.

// Helper to format duration into hours and minutes
function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

// Parse a time string (HH:MM) into milliseconds
function parseTimeToMs(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return ((h * 60) + m) * 60000;
}

// Store entries, call‑out totals, commissions and settings
let entries = [];
let weekdayCalloutTotal = 0;
let weekendCalloutTotal = 0;
let commissionsTotal = 0;
let settings = {
  regularRate: 32,
  overtimeRate: 48,
  weekdayCalloutRate: 25,
  weekendCalloutRate: 50
};

// Persist state to and from localStorage
function loadData() {
  try {
    const saved = localStorage.getItem('hourlyTrackerData');
    if (saved) {
      const data = JSON.parse(saved);
      entries = data.entries || [];
      weekdayCalloutTotal = data.weekdayCalloutTotal || 0;
      weekendCalloutTotal = data.weekendCalloutTotal || 0;
      commissionsTotal = data.commissionsTotal || 0;
      settings = Object.assign(settings, data.settings || {});
    }
  } catch (e) {
    console.error('Failed to load data', e);
  }
}

function saveData() {
  try {
    localStorage.setItem('hourlyTrackerData', JSON.stringify({
      entries,
      weekdayCalloutTotal,
      weekendCalloutTotal,
      commissionsTotal,
      settings
    }));
  } catch (e) {
    console.error('Failed to save data', e);
  }
}

// Persistence of active start time across reloads
function loadActiveStartTime() {
  try {
    const savedStart = localStorage.getItem('activeStartTime');
    if (savedStart) {
      startTimeInput.value = savedStart;
      // If there is no end time yet, resume the live timer
      if (!endTimeInput.value) {
        startTimer();
      } else {
        updateTimeCalculation();
      }
    }
  } catch (e) {
    console.error('Failed to load active start time', e);
  }
}

function persistActiveStartTime(timeStr) {
  try {
    localStorage.setItem('activeStartTime', timeStr);
  } catch (e) {
    console.error('Failed to save active start time', e);
  }
}

function clearActiveStartTime() {
  try {
    localStorage.removeItem('activeStartTime');
  } catch (e) {
    console.error('Failed to clear active start time', e);
  }
}

// Timer state for live counter
let timerInterval = null;

// Update the live timer display based on the current time and the start time
function updateLiveTimer() {
  if (!startTimeInput.value) return;
  const startMs = parseTimeToMs(startTimeInput.value);
  const now = new Date();
  // milliseconds since start of day
  const nowMs = (now.getHours() * 60 + now.getMinutes()) * 60000 + now.getSeconds() * 1000;
  let durationMs = nowMs - startMs;
  if (durationMs < 0) {
    // handle overnight shifts
    durationMs += 24 * 3600000;
  }
  const overtimeMs = Math.max(0, durationMs - 8 * 3600000);
  const regularMs = durationMs - overtimeMs;
  // Update display elements
  totalTimeDisplay.textContent = formatDuration(durationMs);
  overtimeDisplay.textContent = formatDuration(overtimeMs) + (overtimeMs > 0 ? ' overtime' : '');
  regularHoursDisplay.textContent = formatDuration(regularMs);
  summaryOvertimeDisplay.textContent = formatDuration(overtimeMs);
  summaryTotalDisplay.textContent = formatDuration(durationMs);
  const overtimePay = (overtimeMs / 3600000) * settings.overtimeRate;
  const regPay = (regularMs / 3600000) * settings.regularRate;
  regularPayDisplay.textContent = `$${regPay.toFixed(2)}`;
  overtimePayDisplay.textContent = `$${overtimePay.toFixed(2)}`;
  totalPayDisplay.textContent = `$${(regPay + overtimePay).toFixed(2)}`;
}

// Start the live timer interval
function startTimer() {
  // update immediately
  updateLiveTimer();
  // clear any existing interval
  if (timerInterval) clearInterval(timerInterval);
  // update every second
  timerInterval = setInterval(updateLiveTimer, 1000);
}

// Stop the live timer interval
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Grab DOM elements
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const totalTimeDisplay = document.getElementById('totalTime');
const overtimeDisplay = document.getElementById('overtime');
const regularHoursDisplay = document.getElementById('regularHours');
const summaryOvertimeDisplay = document.getElementById('summaryOvertime');
const summaryTotalDisplay = document.getElementById('summaryTotal');
const regularPayDisplay = document.getElementById('regularPay');
const overtimePayDisplay = document.getElementById('overtimePay');
const totalPayDisplay = document.getElementById('totalPay');
const calloutTypeSelect = document.getElementById('calloutType');
const calloutDateInput = document.getElementById('calloutDate');
const calloutPayAmount = document.getElementById('calloutPayAmount');
const calloutPayDesc = document.getElementById('calloutPayDesc');
const weekdayTotalDisplay = document.getElementById('weekdayTotal');
const weekendTotalDisplay = document.getElementById('weekendTotal');
const totalCalloutDisplay = document.getElementById('totalCallout');
const entriesBody = document.getElementById('entriesBody');

// Additional DOM elements
const commissionPayDisplay = document.getElementById('commissionPay');
const commissionTotalDisplay = document.getElementById('commissionTotal');
const commissionTotalDisplay2 = document.getElementById('commissionTotal2');
const commissionAmountInput = document.getElementById('commissionAmount');
const commissionDateInput = document.getElementById('commissionDate');
const commissionAmountInputClone = document.getElementById('commissionAmountClone');
const commissionDateInputClone = document.getElementById('commissionDateClone');
const calloutTypeClone = document.getElementById('calloutTypeClone');
const calloutDateClone = document.getElementById('calloutDateClone');
const calloutPayAmountClone = document.getElementById('calloutPayAmountClone');
const calloutPayDescClone = document.getElementById('calloutPayDescClone');
const allEntriesBody = document.getElementById('allEntriesBody');
const reportChartCanvas = document.getElementById('reportChart');
const reportStartDate = document.getElementById('reportStartDate');
const reportEndDate = document.getElementById('reportEndDate');
const reportSummary = document.getElementById('reportSummary');
const regularRateInput = document.getElementById('regularRate');
const overtimeRateInput = document.getElementById('overtimeRate');
const weekdayCalloutRateInput = document.getElementById('weekdayCalloutRate');
const weekendCalloutRateInput = document.getElementById('weekendCalloutRate');
// Chart instance variable
let reportChart;

// Update the header date
function updateCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString(undefined, options);
}
updateCurrentDate();

// Load persisted data and active start time
loadData();

// Apply settings to rate inputs when available
function populateSettings() {
  if (regularRateInput) regularRateInput.value = settings.regularRate;
  if (overtimeRateInput) overtimeRateInput.value = settings.overtimeRate;
  if (weekdayCalloutRateInput) weekdayCalloutRateInput.value = settings.weekdayCalloutRate;
  if (weekendCalloutRateInput) weekendCalloutRateInput.value = settings.weekendCalloutRate;
}
// Populate settings if section exists
populateSettings();

// Initial UI updates for stored totals and entries
updateCalloutSummary();
updateSummaryForToday();
renderEntries();
// Restore any saved start time after rendering (and resume timer if needed)
loadActiveStartTime();

// Handle the start button: record the current time into the start field, persist it and start live timer
document.getElementById('startBtn').addEventListener('click', () => {
  const now = new Date();
  const startStr = now.toTimeString().slice(0, 5);
  startTimeInput.value = startStr;
  persistActiveStartTime(startStr);
  startTimer();
});

// Handle the stop button: stop the live timer, record the current time into the end field, compute totals and clear active start time
document.getElementById('stopBtn').addEventListener('click', () => {
  stopTimer();
  const now = new Date();
  endTimeInput.value = now.toTimeString().slice(0, 5);
  updateTimeCalculation();
  clearActiveStartTime();
});

function updateTimeCalculation() {
  const start = startTimeInput.value;
  const end = endTimeInput.value;
  if (!start || !end) return;
  let startMs = parseTimeToMs(start);
  let endMs = parseTimeToMs(end);
  let durationMs = endMs - startMs;
  if (durationMs < 0) {
    // handle overnight shifts
    durationMs += 24 * 3600000;
  }
  const overtimeMs = Math.max(0, durationMs - 8 * 3600000);
  const regularMs = durationMs - overtimeMs;
  // Display results
  totalTimeDisplay.textContent = formatDuration(durationMs);
  overtimeDisplay.textContent = formatDuration(overtimeMs) + (overtimeMs > 0 ? ' overtime' : '');
  regularHoursDisplay.textContent = formatDuration(regularMs);
  summaryOvertimeDisplay.textContent = formatDuration(overtimeMs);
  summaryTotalDisplay.textContent = formatDuration(durationMs);
  const overtimePay = (overtimeMs / 3600000) * settings.overtimeRate;
  const regPay = (regularMs / 3600000) * settings.regularRate;
  regularPayDisplay.textContent = `$${regPay.toFixed(2)}`;
  overtimePayDisplay.textContent = `$${overtimePay.toFixed(2)}`;
  // Total pay currently only includes hours pay; call‑out and commission added later
  totalPayDisplay.textContent = `$${(regPay + overtimePay).toFixed(2)}`;
  // Create an entry object and add to entries array
  const entry = {
    date: new Date().toLocaleDateString(),
    startTime: start,
    endTime: end,
    durationMs,
    overtimeMs,
    hoursPay: regPay + overtimePay,
    calloutPay: 0,
    commission: 0,
    totalPay: regPay + overtimePay
  };
  entries.push(entry);
  saveData();
  renderEntries();
  updateSummaryForToday();
}

// Render the latest entries in the table (showing up to 5 most recent)
function renderEntries() {
  entriesBody.innerHTML = '';
  const recent = entries.slice(-5).reverse();
  recent.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.startTime}</td>
      <td>${entry.endTime}</td>
      <td>${formatDuration(entry.durationMs)}</td>
      <td>${formatDuration(entry.overtimeMs)}</td>
      <td>$${entry.hoursPay.toFixed(2)}</td>
      <td>$${entry.calloutPay.toFixed(2)}</td>
      <td>$${entry.commission.toFixed(2)}</td>
      <td>$${entry.totalPay.toFixed(2)}</td>
    `;
    entriesBody.appendChild(tr);
  });
  renderAllEntries();
}

// Render all entries in the Time Entries section
function renderAllEntries() {
  if (!allEntriesBody) return;
  allEntriesBody.innerHTML = '';
  // Sort by date ascending
  const sorted = [...entries];
  sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.startTime}</td>
      <td>${entry.endTime}</td>
      <td>${formatDuration(entry.durationMs)}</td>
      <td>${formatDuration(entry.overtimeMs)}</td>
      <td>$${entry.hoursPay.toFixed(2)}</td>
      <td>$${entry.calloutPay.toFixed(2)}</td>
      <td>$${entry.commission.toFixed(2)}</td>
      <td>$${entry.totalPay.toFixed(2)}</td>
    `;
    allEntriesBody.appendChild(tr);
  });
}

// Update callout preview when the type changes
function updateCalloutPreview() {
  const type = calloutTypeSelect.value;
  const amount = type === 'weekday' ? settings.weekdayCalloutRate : settings.weekendCalloutRate;
  calloutPayAmount.textContent = `$${amount.toFixed(2)}`;
  calloutPayDesc.textContent = type === 'weekday' ? 'Weekday Call‑Out' : 'Weekend Call‑Out';
}
calloutTypeSelect.addEventListener('change', updateCalloutPreview);
updateCalloutPreview();

// Update callout preview for clone section
function updateCalloutPreviewClone() {
  if (!calloutTypeClone) return;
  const type = calloutTypeClone.value;
  const amount = type === 'weekday' ? settings.weekdayCalloutRate : settings.weekendCalloutRate;
  calloutPayAmountClone.textContent = `$${amount.toFixed(2)}`;
  calloutPayDescClone.textContent = type === 'weekday' ? 'Weekday Call‑Out' : 'Weekend Call‑Out';
}
if (calloutTypeClone) {
  calloutTypeClone.addEventListener('change', updateCalloutPreviewClone);
  updateCalloutPreviewClone();
}

// Handle adding a call‑out to the latest entry or as standalone
document.getElementById('addCalloutBtn').addEventListener('click', () => {
  const type = calloutTypeSelect.value;
  const amount = type === 'weekday' ? settings.weekdayCalloutRate : settings.weekendCalloutRate;
  // accumulate totals
  if (type === 'weekday') {
    weekdayCalloutTotal += amount;
  } else {
    weekendCalloutTotal += amount;
  }
  updateCalloutSummary();
  // Apply to last entry if exists; else create new entry
  let entry;
  if (entries.length > 0) {
    entry = entries[entries.length - 1];
    entry.calloutPay += amount;
    entry.totalPay += amount;
  } else {
    entry = {
      date: new Date().toLocaleDateString(),
      startTime: '--',
      endTime: '--',
      durationMs: 0,
      overtimeMs: 0,
      hoursPay: 0,
      calloutPay: amount,
      commission: 0,
      totalPay: amount
    };
    entries.push(entry);
  }
  saveData();
  renderEntries();
  updateSummaryForToday();
});

function updateCalloutSummary() {
  // Update first set
  weekdayTotalDisplay.textContent = `$${weekdayCalloutTotal.toFixed(2)}`;
  weekendTotalDisplay.textContent = `$${weekendCalloutTotal.toFixed(2)}`;
  const totalCall = weekdayCalloutTotal + weekendCalloutTotal + commissionsTotal;
  totalCalloutDisplay.textContent = `$${totalCall.toFixed(2)}`;
  // Update second set if exists
  if (typeof weekdayTotal2 !== 'undefined') {
    const wd2 = document.getElementById('weekdayTotal2');
    const we2 = document.getElementById('weekendTotal2');
    const tot2 = document.getElementById('totalCallout2');
    if (wd2) wd2.textContent = `$${weekdayCalloutTotal.toFixed(2)}`;
    if (we2) we2.textContent = `$${weekendCalloutTotal.toFixed(2)}`;
    if (tot2) tot2.textContent = `$${totalCall.toFixed(2)}`;
  }
  updateCommissionSummary();
  saveData();
}

function updateCommissionSummary() {
  if (commissionTotalDisplay) commissionTotalDisplay.textContent = `$${commissionsTotal.toFixed(2)}`;
  if (commissionTotalDisplay2) commissionTotalDisplay2.textContent = `$${commissionsTotal.toFixed(2)}`;
}

// Update summary card for today's totals
function updateSummaryForToday() {
  const today = new Date().toLocaleDateString();
  let totalDuration = 0;
  let totalOvertime = 0;
  let totalCallout = 0;
  let totalCommission = 0;
  entries.forEach(entry => {
    if (entry.date === today) {
      totalDuration += entry.durationMs;
      totalOvertime += entry.overtimeMs;
      totalCallout += entry.calloutPay;
      totalCommission += entry.commission;
    }
  });
  const regularMs = Math.max(0, totalDuration - totalOvertime);
  regularHoursDisplay.textContent = formatDuration(regularMs);
  summaryOvertimeDisplay.textContent = formatDuration(totalOvertime);
  summaryTotalDisplay.textContent = formatDuration(totalDuration);
  const regPay = (regularMs / 3600000) * settings.regularRate;
  const overPay = (totalOvertime / 3600000) * settings.overtimeRate;
  regularPayDisplay.textContent = `$${regPay.toFixed(2)}`;
  overtimePayDisplay.textContent = `$${overPay.toFixed(2)}`;
  commissionPayDisplay.textContent = `$${totalCommission.toFixed(2)}`;
  const totalPay = regPay + overPay + totalCallout + totalCommission;
  totalPayDisplay.textContent = `$${totalPay.toFixed(2)}`;
  saveData();
}

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.error(err));
  });
}

// Commission handling
function addCommission(amount, date) {
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return;
  commissionsTotal += amt;
  // Assign to last entry if exists on same date; else create new entry
  let entry;
  const entryDate = date || new Date().toLocaleDateString();
  // find last entry with same date
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].date === entryDate) {
      entry = entries[i];
      break;
    }
  }
  if (entry) {
    entry.commission += amt;
    entry.totalPay += amt;
  } else {
    entry = {
      date: entryDate,
      startTime: '--',
      endTime: '--',
      durationMs: 0,
      overtimeMs: 0,
      hoursPay: 0,
      calloutPay: 0,
      commission: amt,
      totalPay: amt
    };
    entries.push(entry);
  }
  updateCommissionSummary();
  updateCalloutSummary();
  renderEntries();
  updateSummaryForToday();
  saveData();
}

// Event listeners for commission buttons
if (document.getElementById('addCommissionBtn')) {
  document.getElementById('addCommissionBtn').addEventListener('click', () => {
    const amount = commissionAmountInput.value;
    const date = commissionDateInput.value ? new Date(commissionDateInput.value).toLocaleDateString() : undefined;
    addCommission(amount, date);
    commissionAmountInput.value = '';
    commissionDateInput.value = '';
  });
}
if (document.getElementById('addCommissionBtnClone')) {
  document.getElementById('addCommissionBtnClone').addEventListener('click', () => {
    const amount = commissionAmountInputClone.value;
    const date = commissionDateInputClone.value ? new Date(commissionDateInputClone.value).toLocaleDateString() : undefined;
    addCommission(amount, date);
    commissionAmountInputClone.value = '';
    commissionDateInputClone.value = '';
  });
}

// Event listeners for callout clone
if (document.getElementById('addCalloutBtnClone')) {
  document.getElementById('addCalloutBtnClone').addEventListener('click', () => {
    const type = calloutTypeClone.value;
    const amount = type === 'weekday' ? settings.weekdayCalloutRate : settings.weekendCalloutRate;
    if (type === 'weekday') {
      weekdayCalloutTotal += amount;
    } else {
      weekendCalloutTotal += amount;
    }
    updateCalloutSummary();
    // Add to last entry or new entry with date from clone field
    const dateStr = calloutDateClone.value ? new Date(calloutDateClone.value).toLocaleDateString() : new Date().toLocaleDateString();
    let entry;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].date === dateStr) {
        entry = entries[i];
        break;
      }
    }
    if (entry) {
      entry.calloutPay += amount;
      entry.totalPay += amount;
    } else {
      entry = {
        date: dateStr,
        startTime: '--',
        endTime: '--',
        durationMs: 0,
        overtimeMs: 0,
        hoursPay: 0,
        calloutPay: amount,
        commission: 0,
        totalPay: amount
      };
      entries.push(entry);
    }
    renderEntries();
    updateSummaryForToday();
    saveData();
  });
}

// Navigation handling
const navItems = document.querySelectorAll('.nav li');
const sections = document.querySelectorAll('.section');
function showSection(id) {
  sections.forEach(sec => {
    sec.style.display = 'none';
    sec.classList.remove('active');
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
  }
  // Update header title and subtitle
  const title = document.getElementById('mainTitle');
  const subtitle = document.getElementById('mainSubtitle');
  switch (id) {
    case 'dashboardSection':
      title.textContent = 'Dashboard';
      subtitle.textContent = 'Track your hours, overtime, call‑outs and commissions';
      break;
    case 'timeEntriesSection':
      title.textContent = 'Time Entries';
      subtitle.textContent = 'View all your recorded entries';
      break;
    case 'calloutSection':
      title.textContent = 'Call‑Out & Commission';
      subtitle.textContent = 'Manage your call‑outs and commissions';
      break;
    case 'reportsSection':
      title.textContent = 'Reports & Analytics';
      subtitle.textContent = 'Generate pay reports and charts';
      break;
    case 'calendarSection':
      title.textContent = 'Calendar';
      subtitle.textContent = 'View your schedule';
      break;
    case 'settingsSection':
      title.textContent = 'Settings';
      subtitle.textContent = 'Customize your rates';
      populateSettings();
      break;
    default:
      title.textContent = '';
      subtitle.textContent = '';
  }
  // Special actions per section
  if (id === 'timeEntriesSection') {
    renderAllEntries();
  }
}
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(li => li.classList.remove('active'));
    item.classList.add('active');
    const targetId = item.getAttribute('data-target');
    showSection(targetId);
  });
});

// Report generation
if (document.getElementById('generateReportBtn')) {
  document.getElementById('generateReportBtn').addEventListener('click', generateReport);
}
function generateReport() {
  const startVal = reportStartDate.value;
  const endVal = reportEndDate.value;
  if (!startVal || !endVal) {
    alert('Please select a start and end date');
    return;
  }
  const start = new Date(startVal);
  const end = new Date(endVal);
  if (end < start) {
    alert('End date must be after start date');
    return;
  }
  // Prepare data structures
  const labels = [];
  const hoursPays = [];
  const calloutPays = [];
  const commissionPays = [];
  let totalHoursPay = 0;
  let totalCallPay = 0;
  let totalCommPay = 0;
  // Create a map from date to aggregated amounts
  const map = {};
  entries.forEach(entry => {
    const dateObj = new Date(entry.date);
    if (dateObj >= start && dateObj <= end) {
      const key = entry.date;
      if (!map[key]) {
        map[key] = { hours: 0, call: 0, comm: 0 };
      }
      map[key].hours += entry.hoursPay;
      map[key].call += entry.calloutPay;
      map[key].comm += entry.commission;
    }
  });
  Object.keys(map).sort((a, b) => new Date(a) - new Date(b)).forEach(date => {
    labels.push(date);
    hoursPays.push(map[date].hours);
    calloutPays.push(map[date].call);
    commissionPays.push(map[date].comm);
    totalHoursPay += map[date].hours;
    totalCallPay += map[date].call;
    totalCommPay += map[date].comm;
  });
  // Destroy existing chart
  if (reportChart) {
    reportChart.destroy();
  }
  reportChart = new Chart(reportChartCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Hours Pay',
          data: hoursPays,
          backgroundColor: 'rgba(31, 119, 212, 0.6)',
          borderColor: 'rgba(31, 119, 212, 1)',
          borderWidth: 1
        },
        {
          label: 'Call‑Out Pay',
          data: calloutPays,
          backgroundColor: 'rgba(233, 138, 21, 0.6)',
          borderColor: 'rgba(233, 138, 21, 1)',
          borderWidth: 1
        },
        {
          label: 'Commission',
          data: commissionPays,
          backgroundColor: 'rgba(132, 94, 247, 0.6)',
          borderColor: 'rgba(132, 94, 247, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#e6f1ff' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          stacked: true,
          ticks: { color: '#e6f1ff' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#e6f1ff' }
        }
      }
    }
  });
  // Update summary text
  reportSummary.innerHTML = `
    <p><strong>Total Hours Pay:</strong> $${totalHoursPay.toFixed(2)}</p>
    <p><strong>Total Call‑Out Pay:</strong> $${totalCallPay.toFixed(2)}</p>
    <p><strong>Total Commission:</strong> $${totalCommPay.toFixed(2)}</p>
    <p><strong>Grand Total:</strong> $${(totalHoursPay + totalCallPay + totalCommPay).toFixed(2)}</p>
  `;
}

// Settings save handler
if (document.getElementById('saveSettingsBtn')) {
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    settings.regularRate = parseFloat(regularRateInput.value) || settings.regularRate;
    settings.overtimeRate = parseFloat(overtimeRateInput.value) || settings.overtimeRate;
    settings.weekdayCalloutRate = parseFloat(weekdayCalloutRateInput.value) || settings.weekdayCalloutRate;
    settings.weekendCalloutRate = parseFloat(weekendCalloutRateInput.value) || settings.weekendCalloutRate;
    saveData();
    alert('Settings saved');
  });
}
