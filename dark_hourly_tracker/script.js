// This file is an enhanced version of the dark_hourly_tracker/script.js from
// the Hourly Tracker project. In addition to persisting the active start
// time across page reloads, it also provides a live timer that updates
// the displayed hours, overtime and pay as time elapses. When the user
// clicks Start, the timer begins updating every second, and it stops
// automatically when the user clicks Stop. Upon reload, if there is
// an active start time saved and no end time, the timer resumes.

// Register a service worker for offline support. When the page loads and
// service workers are supported, the browser will attempt to register the
// service-worker.js file from this directory. Any registration errors are
// logged to the console instead of interrupting the app.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });
  });
}

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
// Paycheck estimate DOM elements
const paycheckHoursPayDisplay = document.getElementById('paycheckHoursPay');
const paycheckCalloutPayDisplay = document.getElementById('paycheckCalloutPay');
const paycheckCommissionPayDisplay = document.getElementById('paycheckCommissionPay');
const paycheckTotalPayDisplay = document.getElementById('paycheckTotalPay');

//
// Calculate and update the paycheck estimate section. This aggregates all entries
// recorded in the system and computes the total pay derived from hours worked,
// call‑out pay and commissions. The computed values are written to the
// respective placeholders on the Paycheck Estimate card. If any of the DOM
// elements do not exist (for example if the user navigates away from the
// dashboard) then the function safely returns without side effects.
function updatePaycheckEstimate() {
  // Ensure the DOM elements exist before attempting to update them
  if (!paycheckHoursPayDisplay || !paycheckCalloutPayDisplay || !paycheckCommissionPayDisplay || !paycheckTotalPayDisplay) {
    return;
  }
  // Aggregate totals across all entries
  let totalHoursPay = 0;
  let totalCalloutPay = 0;
  let totalCommissionPay = 0;
  entries.forEach(entry => {
    totalHoursPay += entry.hoursPay;
    totalCalloutPay += entry.calloutPay;
    totalCommissionPay += entry.commission;
  });
  // Use the global commissionsTotal and callout totals as fallback if entries
  // haven't been populated yet (e.g. on first load before renderEntries runs).
  if (entries.length === 0) {
    totalCalloutPay = weekdayCalloutTotal + weekendCalloutTotal;
    totalCommissionPay = commissionsTotal;
  }
  const totalGrossPay = totalHoursPay + totalCalloutPay + totalCommissionPay;
  // Update the UI with formatted values
  paycheckHoursPayDisplay.textContent = `$${totalHoursPay.toFixed(2)}`;
  paycheckCalloutPayDisplay.textContent = `$${totalCalloutPay.toFixed(2)}`;
  paycheckCommissionPayDisplay.textContent = `$${totalCommissionPay.toFixed(2)}`;
  paycheckTotalPayDisplay.textContent = `$${totalGrossPay.toFixed(2)}`;
}

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
// Update paycheck estimate on load
updatePaycheckEstimate();

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
  // Refresh paycheck estimate after computing new entry
  updatePaycheckEstimate();
}

// Render the latest entries in the table (showing up to 5 most recent)
function renderEntries() {
  entriesBody.innerHTML = '';
  const recent = entries.slice(-5).reverse();
  recent.forEach(entry => {
    const index = entries.indexOf(entry);
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
      <td><button class="btn transparent" onclick="deleteEntry(${index})">Delete</button></td>
    `;
    entriesBody.appendChild(tr);
  });
}

// Render all entries in the full table for the Time Entries section
function renderAllEntries() {
  allEntriesBody.innerHTML = '';
  entries.forEach((entry, index) => {
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
      <td><button class="btn transparent" onclick="deleteEntry(${index})">Delete</button></td>
    `;
    allEntriesBody.appendChild(tr);
  });
}

function deleteEntry(index) {
  entries.splice(index, 1);
  saveData();
  renderEntries();
  renderAllEntries();
  updateCalloutSummary();
  updateSummaryForToday();
  updatePaycheckEstimate();
}

// Update call‑out and commission summaries
function updateCalloutSummary() {
  weekdayTotalDisplay.textContent = `$${weekdayCalloutTotal.toFixed(2)}`;
  weekendTotalDisplay.textContent = `$${weekendCalloutTotal.toFixed(2)}`;
  commissionTotalDisplay.textContent = `$${commissionsTotal.toFixed(2)}`;
  totalCalloutDisplay.textContent = `$${(weekdayCalloutTotal + weekendCalloutTotal + commissionsTotal).toFixed(2)}`;
  // update clones for callout & commission sections
  document.getElementById('weekdayTotal2').textContent = `$${weekdayCalloutTotal.toFixed(2)}`;
  document.getElementById('weekendTotal2').textContent = `$${weekendCalloutTotal.toFixed(2)}`;
  document.getElementById('commissionTotal2').textContent = `$${commissionsTotal.toFixed(2)}`;
  document.getElementById('totalCallout2').textContent = `$${(weekdayCalloutTotal + weekendCalloutTotal + commissionsTotal).toFixed(2)}`;
}

// Update today's summary (on dashboard)
function updateSummaryForToday() {
  const today = new Date().toLocaleDateString();
  let dailyDuration = 0;
  let dailyOvertime = 0;
  let dailyRegular = 0;
  entries.forEach(entry => {
    if (entry.date === today) {
      dailyDuration += entry.durationMs;
      dailyOvertime += entry.overtimeMs;
      dailyRegular += (entry.durationMs - entry.overtimeMs);
    }
  });
  summaryTotalDisplay.textContent = formatDuration(dailyDuration);
  summaryOvertimeDisplay.textContent = formatDuration(dailyOvertime);
  regularHoursDisplay.textContent = formatDuration(dailyRegular);
  const overtimePay = (dailyOvertime / 3600000) * settings.overtimeRate;
  const regPay = (dailyRegular / 3600000) * settings.regularRate;
  overtimePayDisplay.textContent = `$${overtimePay.toFixed(2)}`;
  regularPayDisplay.textContent = `$${regPay.toFixed(2)}`;
  totalPayDisplay.textContent = `$${(regPay + overtimePay).toFixed(2)}`;
}

// Navigation controls for sidebar
const navItems = document.querySelectorAll('.nav li');
navItems.forEach(item => {
  item.addEventListener('click', () => {
    document.querySelector('.nav li.active').classList.remove('active');
    item.classList.add('active');
    const target = item.getAttribute('data-target');
    document.querySelector('.section.active').classList.remove('active');
    document.getElementById(target).classList.add('active');
    // Update page title and subtitle
    const mainTitle = document.getElementById('mainTitle');
    const mainSubtitle = document.getElementById('mainSubtitle');
    if (target === 'dashboardSection') {
      mainTitle.textContent = 'Dashboard';
      mainSubtitle.textContent = 'ServiceNow Employee Time Tracker';
      renderEntries();
    } else if (target === 'timeEntriesSection') {
      mainTitle.textContent = 'Time Entries';
      mainSubtitle.textContent = 'Full list of time entries';
      renderAllEntries();
    } else if (target === 'calloutSection') {
      mainTitle.textContent = 'Call‑Outs & Commissions';
      mainSubtitle.textContent = 'Add or review call‑outs and commissions';
    } else if (target === 'reportsSection') {
      mainTitle.textContent = 'Reports';
      mainSubtitle.textContent = 'Charts and analytics';
    } else if (target === 'calendarSection') {
      mainTitle.textContent = 'Calendar';
      mainSubtitle.textContent = 'Monthly view of entries';
      renderCalendar();
    } else if (target === 'settingsSection') {
      mainTitle.textContent = 'Settings';
      mainSubtitle.textContent = 'Adjust your preferences';
    }
  });
});

// Add call‑out entry (Dashboard)
document.getElementById('addCalloutBtn').addEventListener('click', () => {
  const type = calloutTypeSelect.value;
  const date = calloutDateInput.value;
  if (!date) return;
  const amount = type === 'weekday' ? settings.weekdayCalloutRate : settings.weekendCalloutRate;
  const desc = type === 'weekday' ? 'Weekday Call‑Out' : 'Weekend Call‑Out';
  if (type === 'weekday') {
    weekdayCalloutTotal += amount;
  } else {
    weekendCalloutTotal += amount;
  }
  // Save callout to entries
  const entry = {
    date: new Date(date).toLocaleDateString(),
    startTime: '',
    endTime: '',
    durationMs: 0,
    overtimeMs: 0,
    hoursPay: 0,
    calloutPay: amount,
    commission: 0,
    totalPay: amount
  };
  entries.push(entry);
  saveData();
  updateCalloutSummary();
  updatePaycheckEstimate();
  renderEntries();
  // Reset inputs
  calloutDateInput.value = '';
});

// Add commission entry (Dashboard)
document.getElementById('addCommissionBtn').addEventListener('click', () => {
  const amount = parseFloat(commissionAmountInput.value);
  const date = commissionDateInput.value;
  if (!date || isNaN(amount)) return;
  commissionsTotal += amount;
  const entry = {
    date: new Date(date).toLocaleDateString(),
    startTime: '',
    endTime: '',
    durationMs: 0,
    overtimeMs: 0,
    hoursPay: 0,
    calloutPay: 0,
    commission: amount,
    totalPay: amount
  };
  entries.push(entry);
  saveData();
  updateCalloutSummary();
  updatePaycheckEstimate();
  renderEntries();
  // Reset inputs
  commissionAmountInput.value = '';
  commissionDateInput.value = '';
});

// Add call‑out entry (Call‑Outs section clone)
document.getElementById('addCalloutBtnClone').addEventListener('click', () => {
  const type = calloutTypeClone.value;
  const date = calloutDateClone.value;
  if (!date) return;
  const amount = type === 'weekday' ? settings.weekdayCalloutRate : settings.weekendCalloutRate;
  const desc = type === 'weekday' ? 'Weekday Call‑Out' : 'Weekend Call‑Out';
  if (type === 'weekday') {
    weekdayCalloutTotal += amount;
  } else {
    weekendCalloutTotal += amount;
  }
  // Save callout to entries
  const entry = {
    date: new Date(date).toLocaleDateString(),
    startTime: '',
    endTime: '',
    durationMs: 0,
    overtimeMs: 0,
    hoursPay: 0,
    calloutPay: amount,
    commission: 0,
    totalPay: amount
  };
  entries.push(entry);
  saveData();
  updateCalloutSummary();
  updatePaycheckEstimate();
  renderEntries();
  // Reset inputs
  calloutDateClone.value = '';
});

// Add commission entry (Call‑Outs section clone)
document.getElementById('addCommissionBtnClone').addEventListener('click', () => {
  const amount = parseFloat(commissionAmountInputClone.value);
  const date = commissionDateInputClone.value;
  if (!date || isNaN(amount)) return;
  commissionsTotal += amount;
  const entry = {
    date: new Date(date).toLocaleDateString(),
    startTime: '',
    endTime: '',
    durationMs: 0,
    overtimeMs: 0,
    hoursPay: 0,
    calloutPay: 0,
    commission: amount,
    totalPay: amount
  };
  entries.push(entry);
  saveData();
  updateCalloutSummary();
  updatePaycheckEstimate();
  renderEntries();
  // Reset inputs
  commissionAmountInputClone.value = '';
  commissionDateInputClone.value = '';
});

// Chart.js report for the Reports section
function generateReport() {
  // Compute dataset for each entry by date (sum of regular + OT + callout + commission)
  const dataMap = {};
  entries.forEach(entry => {
    const d = entry.date;
    if (!dataMap[d]) dataMap[d] = 0;
    dataMap[d] += entry.totalPay;
  });
  const labels = Object.keys(dataMap);
  const values = labels.map(l => dataMap[l]);
  // Destroy previous chart if exists
  if (reportChart) {
    reportChart.destroy();
  }
  reportChart = new Chart(reportChartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Pay ($)',
          data: values,
          backgroundColor: '#1f77d4'
        }
      ]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

document.getElementById('generateReportBtn')?.addEventListener('click', () => {
  const start = reportStartDate.value;
  const end = reportEndDate.value;
  if (!start || !end) return;
  const filtered = entries.filter(entry => entry.date >= new Date(start).toLocaleDateString() && entry.date <= new Date(end).toLocaleDateString());
  if (!filtered.length) {
    reportSummary.textContent = 'No data for selected range.';
    return;
  }
  const total = filtered.reduce((sum, entry) => sum + entry.totalPay, 0);
  reportSummary.textContent = `Total pay from ${start} to ${end}: $${total.toFixed(2)}`;
  // Generate chart with filtered entries
  const dataMap = {};
  filtered.forEach(entry => {
    const d = entry.date;
    if (!dataMap[d]) dataMap[d] = 0;
    dataMap[d] += entry.totalPay;
  });
  const labels = Object.keys(dataMap);
  const values = labels.map(l => dataMap[l]);
  if (reportChart) {
    reportChart.destroy();
  }
  reportChart = new Chart(reportChartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Pay ($)',
          data: values,
          backgroundColor: '#1f77d4'
        }
      ]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
});

// Calendar view
function renderCalendar() {
  // For this simplified version, we'll just show total pay per date in the current month
  const calendarContainer = document.getElementById('calendarSection');
  calendarContainer.innerHTML = '<h3>Calendar</h3><p>Monthly overview of total pay (combined hours, call-out & commission)</p>';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.style.gap = '5px';
  // Fill blanks
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement('div'));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toLocaleDateString();
    const dayDiv = document.createElement('div');
    dayDiv.style.border = '1px solid rgba(255,255,255,0.1)';
    dayDiv.style.padding = '5px';
    const total = entries.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.totalPay, 0);
    dayDiv.innerHTML = `<strong>${d}</strong><br><span style="font-size:0.8rem;">$${total.toFixed(2)}</span>`;
    grid.appendChild(dayDiv);
  }
  calendarContainer.appendChild(grid);
}
*** End Patch