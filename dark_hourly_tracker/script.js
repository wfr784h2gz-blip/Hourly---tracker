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

// Store entries and call-out totals
let entries = [];
let weekdayCalloutTotal = 0;
let weekendCalloutTotal = 0;

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

// Update the header date
function updateCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString(undefined, options);
}
updateCurrentDate();

// Handle the start button: record the current time into the start field
document.getElementById('startBtn').addEventListener('click', () => {
  const now = new Date();
  startTimeInput.value = now.toTimeString().slice(0, 5);
});

// Handle the stop button: record the current time into the end field and compute totals
document.getElementById('stopBtn').addEventListener('click', () => {
  const now = new Date();
  endTimeInput.value = now.toTimeString().slice(0, 5);
  updateTimeCalculation();
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
  const regularPay = (regularMs / 3600000) * 32;
  const overtimePay = (overtimeMs / 3600000) * 48;
  regularPayDisplay.textContent = `$${regularPay.toFixed(2)}`;
  overtimePayDisplay.textContent = `$${overtimePay.toFixed(2)}`;
  totalPayDisplay.textContent = `$${(regularPay + overtimePay).toFixed(2)}`;
  // Create an entry object and add to entries array
  const entry = {
    date: new Date().toLocaleDateString(),
    startTime: start,
    endTime: end,
    durationMs,
    overtimeMs,
    hoursPay: regularPay + overtimePay,
    calloutPay: 0,
    totalPay: regularPay + overtimePay
  };
  entries.push(entry);
  renderEntries();
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
      <td>$${entry.totalPay.toFixed(2)}</td>
    `;
    entriesBody.appendChild(tr);
  });
}

// Update callout preview when the type changes
function updateCalloutPreview() {
  const type = calloutTypeSelect.value;
  const amount = type === 'weekday' ? 25 : 50;
  calloutPayAmount.textContent = `$${amount.toFixed(2)}`;
  calloutPayDesc.textContent = type === 'weekday' ? 'Weekday Call‑Out' : 'Weekend Call‑Out';
}
calloutTypeSelect.addEventListener('change', updateCalloutPreview);
updateCalloutPreview();

// Handle adding a call-out to the latest entry or as standalone
document.getElementById('addCalloutBtn').addEventListener('click', () => {
  const type = calloutTypeSelect.value;
  const amount = type === 'weekday' ? 25 : 50;
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
      totalPay: amount
    };
    entries.push(entry);
  }
  renderEntries();
});

function updateCalloutSummary() {
  weekdayTotalDisplay.textContent = `$${weekdayCalloutTotal.toFixed(2)}`;
  weekendTotalDisplay.textContent = `$${weekendCalloutTotal.toFixed(2)}`;
  totalCalloutDisplay.textContent = `$${(weekdayCalloutTotal + weekendCalloutTotal).toFixed(2)}`;
}

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.error(err));
  });
}
