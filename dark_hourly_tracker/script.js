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
const calendarTitle = document.getElementById('calendarTitle');
const calendarGrid = document.getElementById('calendarGrid');
const calendarPrev = document.getElementById('calendarPrev');
const calendarNext = document.getElementById('calendarNext');
// Chart instance variable
let reportChart;
let calendarDate = new Date();
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

function syncExtraTotalsFromEntries() {
  weekdayCalloutTotal = 0;
  weekendCalloutTotal = 0;
  commissionsTotal = 0;
  entries.forEach(entry => {
    const calloutPay = Number(entry.calloutPay) || 0;
    const commission = Number(entry.commission) || 0;
    commissionsTotal += commission;
    if (calloutPay > 0) {
      const day = new Date(entry.date).getDay();
      if (day === 0 || day === 6) {
        weekendCalloutTotal += calloutPay;
      } else {
        weekdayCalloutTotal += calloutPay;
      }
    }
  });
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
syncExtraTotalsFromEntries();

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
  if (recent.length === 0) {
    entriesBody.innerHTML = '<tr><td colspan="10" class="empty-cell">No entries yet. Start a timer or add a call-out to populate this table.</td></tr>';
    renderAllEntries();
    renderCalendar();
    return;
  }
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
      <td><button class="delete-entry" data-index="${index}">Delete</button></td>
    `;
    // attach delete handler
    tr.querySelector('.delete-entry').addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      deleteEntry(idx);
    });
    entriesBody.appendChild(tr);
  });
  renderAllEntries();
  renderCalendar();
}

// Render all entries in the Time Entries section
function renderAllEntries() {
  if (!allEntriesBody) return;
  allEntriesBody.innerHTML = '';
  // Sort by date ascending
  const sorted = [...entries];
  sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length === 0) {
    allEntriesBody.innerHTML = '<tr><td colspan="10" class="empty-cell">No time entries have been saved yet.</td></tr>';
    return;
  }
  sorted.forEach(entry => {
    const idx = entries.indexOf(entry);
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
      <td><button class="delete-entry" data-index="${idx}">Delete</button></td>
    `;
    // attach delete handler
    tr.querySelector('.delete-entry').addEventListener('click', (e) => {
      const delIdx = parseInt(e.target.getAttribute('data-index'));
      deleteEntry(delIdx);
    });
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
if (calloutTypeClone) calloutTypeClone.addEventListener('change', updateCalloutPreviewClone);
if (calloutTypeClone) updateCalloutPreviewClone();

// Update callout summary display
function updateCalloutSummary() {
  syncExtraTotalsFromEntries();
  weekdayTotalDisplay.textContent = `$${weekdayCalloutTotal.toFixed(2)}`;
  weekendTotalDisplay.textContent = `$${weekendCalloutTotal.toFixed(2)}`;
  const totalCall = weekdayCalloutTotal + weekendCalloutTotal;
  totalCalloutDisplay.textContent = `$${totalCall.toFixed(2)}`;
  // Update clone summary as well
  const wt2 = document.getElementById('weekdayTotal2');
  const wk2 = document.getElementById('weekendTotal2');
  const ct2 = document.getElementById('commissionTotal2');
  const tt2 = document.getElementById('totalCallout2');
  if (wt2) wt2.textContent = `$${weekdayCalloutTotal.toFixed(2)}`;
  if (wk2) wk2.textContent = `$${weekendCalloutTotal.toFixed(2)}`;
  if (ct2) ct2.textContent = `$${commissionsTotal.toFixed(2)}`;
  if (tt2) tt2.textContent = `$${(weekdayCalloutTotal + weekendCalloutTotal + commissionsTotal).toFixed(2)}`;
  // Refresh paycheck estimate whenever callout totals change
  updatePaycheckEstimate();
}

function updateCommissionSummary() {
  commissionTotalDisplay.textContent = `$${commissionsTotal.toFixed(2)}`;
  // Update clone as well
  if (commissionTotalDisplay2) commissionTotalDisplay2.textContent = `$${commissionsTotal.toFixed(2)}`;
  updatePaycheckEstimate();
}

// Update summary for today (regular, overtime, total and pay)
function updateSummaryForToday() {
  // Sum durations and overtime for entries with today’s date
  const today = new Date().toLocaleDateString();
  let totalMs = 0;
  let overtimeMs = 0;
  let regMs = 0;
  let totalPay = 0;
  entries.forEach(entry => {
    if (entry.date === today) {
      totalMs += entry.durationMs;
      overtimeMs += entry.overtimeMs;
      regMs += (entry.durationMs - entry.overtimeMs);
      totalPay += entry.totalPay;
    }
  });
  regularHoursDisplay.textContent = formatDuration(regMs);
  summaryOvertimeDisplay.textContent = formatDuration(overtimeMs);
  summaryTotalDisplay.textContent = formatDuration(totalMs);
  const regPay = (regMs / 3600000) * settings.regularRate;
  const overPay = (overtimeMs / 3600000) * settings.overtimeRate;
  regularPayDisplay.textContent = `$${regPay.toFixed(2)}`;
  overtimePayDisplay.textContent = `$${overPay.toFixed(2)}`;
  totalPayDisplay.textContent = `$${(regPay + overPay).toFixed(2)}`;
}

// Callout handling
function addCallout(type, date) {
  const amount = type === 'weekday' ? settings.weekdayCalloutRate : settings.weekendCalloutRate;
  if (type === 'weekday') {
    weekdayCalloutTotal += amount;
  } else {
    weekendCalloutTotal += amount;
  }
  // Update summary and maybe assign to entry
  updateCalloutSummary();
  // Add to last entry or new entry
  const entryDate = date || new Date().toLocaleDateString();
  let entry;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].date === entryDate) {
      entry = entries[i];
      break;
    }
  }
  if (entry) {
    entry.calloutPay += amount;
    entry.totalPay += amount;
  } else {
    entry = {
      date: entryDate,
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
}

function addCalloutToEntries(type, date) {
  const amount = type === 'weekday' ? settings.weekdayCalloutRate : settings.weekendCalloutRate;
  const dateStr = date || new Date().toLocaleDateString();
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
  syncExtraTotalsFromEntries();
  renderEntries();
  updateSummaryForToday();
  updateCalloutSummary();
  saveData();
}

// Event listeners for callout button
if (document.getElementById('addCalloutBtn')) {
  document.getElementById('addCalloutBtn').addEventListener('click', () => {
    const type = calloutTypeSelect.value;
    const dateStr = calloutDateInput.value ? new Date(calloutDateInput.value).toLocaleDateString() : new Date().toLocaleDateString();
    addCalloutToEntries(type, dateStr);
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
    const dateStr = calloutDateClone.value ? new Date(calloutDateClone.value).toLocaleDateString() : new Date().toLocaleDateString();
    addCalloutToEntries(type, dateStr);
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
      // Display branding under the dashboard heading rather than the generic description.
      // The subtitle persists even after navigating away and back to the dashboard.
      subtitle.textContent = 'ServiceNow Employee Time Tracker';
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
      subtitle.textContent = 'Review saved work by month';
      renderCalendar();
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

// "View All Entries" button navigates to the Time Entries section and activates nav
const viewAllBtnElem = document.getElementById('viewAllBtn');
if (viewAllBtnElem) {
  viewAllBtnElem.addEventListener('click', () => {
    // Show the time entries section
    showSection('timeEntriesSection');
    // Update nav active state
    navItems.forEach(li => li.classList.remove('active'));
    const targetItem = document.querySelector('.nav li[data-target="timeEntriesSection"]');
    if (targetItem) {
      targetItem.classList.add('active');
    }
  });
}

// Delete an entry by index and refresh all related UI elements
function deleteEntry(idx) {
  if (idx == null || idx < 0 || idx >= entries.length) return;
  // Remove entry from array
  entries.splice(idx, 1);
  syncExtraTotalsFromEntries();
  saveData();
  // Refresh summaries and lists
  updateSummaryForToday();
  updateCalloutSummary();
  renderEntries();
  // Refresh paycheck estimate
  updatePaycheckEstimate();
  renderCalendar();
}

function renderCalendar() {
  if (!calendarTitle || !calendarGrid) return;
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  calendarTitle.textContent = monthName;
  calendarGrid.innerHTML = '';

  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    const cell = document.createElement('div');
    cell.className = 'calendar-head';
    cell.textContent = day;
    calendarGrid.appendChild(cell);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'calendar-cell muted-cell';
    calendarGrid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = date.toLocaleDateString();
    const dayEntries = entries.filter(entry => entry.date === key);
    const hours = dayEntries.reduce((sum, entry) => sum + (entry.durationMs || 0), 0);
    const extras = dayEntries.reduce((sum, entry) => sum + (entry.calloutPay || 0) + (entry.commission || 0), 0);
    const pay = dayEntries.reduce((sum, entry) => sum + (entry.totalPay || 0), 0);
    const cell = document.createElement('div');
    cell.className = `calendar-cell${dayEntries.length ? ' has-entry' : ''}`;
    cell.innerHTML = `
      <span class="calendar-day">${day}</span>
      ${dayEntries.length ? `<span>${formatDuration(hours)}</span><span>$${pay.toFixed(2)}</span>${extras ? '<small>Extras logged</small>' : ''}` : ''}
    `;
    calendarGrid.appendChild(cell);
  }
}

if (calendarPrev) {
  calendarPrev.addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
    renderCalendar();
  });
}
if (calendarNext) {
  calendarNext.addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    renderCalendar();
  });
}

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
    updateCalloutPreview();
    updateCalloutPreviewClone();
    alert('Settings saved');
  });
}
