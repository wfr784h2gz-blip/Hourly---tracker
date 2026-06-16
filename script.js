const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

const DEFAULT_SETTINGS = {
  regularRate: 32,
  overtimeRate: 48,
  weeklyLimit: 40,
  weekdayCalloutFee: 25,
  weekendCalloutFee: 50
};

const STORAGE_KEYS = {
  entries: "hourlyTracker.entries",
  settings: "hourlyTracker.settings",
  active: "hourlyTracker.activeShift",
  user: "hourlyTracker.userId"
};

let entries = [];
let settings = loadSettings();
let currentWeekStart = getWeekStart(new Date());
let db = null;
let cloudReady = false;
let unsubscribe = null;
let timerHandle = null;

const $ = (id) => document.getElementById(id);

window.addEventListener("DOMContentLoaded", () => {
  setDefaultDates();
  fillSettingsForm();
  bindEvents();
  registerServiceWorker();
  initCloudIfConfigured();
  loadEntries();
  startTimerLoop();
});

function bindEvents() {
  $("clock-in-btn").addEventListener("click", clockInNow);
  $("clock-out-btn").addEventListener("click", clockOutAndSave);
  $("active-callout").addEventListener("change", saveActiveExtras);
  $("active-notes").addEventListener("input", saveActiveExtras);
  $("manual-form").addEventListener("submit", addManualEntry);
  $("prev-week").addEventListener("click", () => changeWeek(-1));
  $("next-week").addEventListener("click", () => changeWeek(1));
  $("save-settings").addEventListener("click", saveSettingsFromForm);
  $("reset-settings").addEventListener("click", resetSettings);
  $("export-json").addEventListener("click", exportBackup);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.warn);
  }
}

function initCloudIfConfigured() {
  const configured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "REPLACE_ME";
  if (!configured || !window.firebase) {
    updateSyncStatus("Device save on");
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    cloudReady = true;
    updateSyncStatus("Cloud sync on");
  } catch (error) {
    console.error(error);
    updateSyncStatus("Device save on");
  }
}

function updateSyncStatus(text) {
  $("sync-status").textContent = text;
}

function getUserId() {
  let userId = localStorage.getItem(STORAGE_KEYS.user);
  if (!userId) {
    userId = `user_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    localStorage.setItem(STORAGE_KEYS.user, userId);
  }
  return userId;
}

function loadEntries() {
  const cached = localStorage.getItem(STORAGE_KEYS.entries);
  entries = cached ? JSON.parse(cached) : [];
  render();

  if (!cloudReady) return;

  const userId = getUserId();
  unsubscribe = db.collection("users").doc(userId).collection("entries").orderBy("startISO").onSnapshot(snapshot => {
    entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
    render();
  }, error => {
    console.error(error);
    updateSyncStatus("Device save on");
  });
}

async function persistEntry(entry) {
  entries = upsert(entries, entry);
  localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
  render();

  if (cloudReady) {
    const userId = getUserId();
    await db.collection("users").doc(userId).collection("entries").doc(entry.id).set(entry);
  }
}

async function deleteEntry(id) {
  entries = entries.filter(entry => entry.id !== id);
  localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
  render();

  if (cloudReady) {
    const userId = getUserId();
    await db.collection("users").doc(userId).collection("entries").doc(id).delete();
  }
}

function upsert(list, item) {
  const next = list.filter(entry => entry.id !== item.id);
  next.push(item);
  return next;
}

function clockInNow() {
  if (getActiveShift()) {
    alert("A shift is already running. Clock out first.");
    return;
  }
  const active = {
    startISO: new Date().toISOString(),
    callout: $("active-callout").checked,
    notes: $("active-notes").value.trim()
  };
  localStorage.setItem(STORAGE_KEYS.active, JSON.stringify(active));
  renderActiveShift();
}

async function clockOutAndSave() {
  const active = getActiveShift();
  if (!active) {
    alert("No running shift to clock out.");
    return;
  }
  saveActiveExtras();
  const updated = getActiveShift();
  const start = new Date(updated.startISO);
  const end = new Date();
  if (end <= start) {
    alert("End time must be after start time.");
    return;
  }
  const entry = buildEntry(start, end, updated.callout, updated.notes);
  localStorage.removeItem(STORAGE_KEYS.active);
  $("active-callout").checked = false;
  $("active-notes").value = "";
  await persistEntry(entry);
  renderActiveShift();
}

function saveActiveExtras() {
  const active = getActiveShift();
  if (!active) return;
  active.callout = $("active-callout").checked;
  active.notes = $("active-notes").value.trim();
  localStorage.setItem(STORAGE_KEYS.active, JSON.stringify(active));
}

function getActiveShift() {
  const raw = localStorage.getItem(STORAGE_KEYS.active);
  return raw ? JSON.parse(raw) : null;
}

async function addManualEntry(event) {
  event.preventDefault();
  const date = $("manual-date").value;
  const startTime = $("manual-start").value;
  const endTime = $("manual-end").value;
  const notes = $("manual-notes").value.trim();
  const callout = $("manual-callout").value === "yes";

  const start = new Date(`${date}T${startTime}`);
  let end = new Date(`${date}T${endTime}`);
  if (end <= start) end.setDate(end.getDate() + 1);

  await persistEntry(buildEntry(start, end, callout, notes));
  event.target.reset();
  setDefaultDates();
}

function buildEntry(start, end, callout, notes) {
  const hours = round2((end - start) / 36e5);
  const startISO = start.toISOString();
  return {
    id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: toDateInput(start),
    startISO,
    endISO: end.toISOString(),
    startTime: toTimeInput(start),
    endTime: toTimeInput(end),
    hours,
    callout,
    calloutFee: callout ? calloutFeeForDate(start) : 0,
    notes,
    createdAt: new Date().toISOString()
  };
}

function calloutFeeForDate(date) {
  const day = date.getDay();
  return day === 0 || day === 6 ? Number(settings.weekendCalloutFee) : Number(settings.weekdayCalloutFee);
}

function hydrateWeekEntries() {
  const weekEntries = entries
    .filter(entry => getWeekStart(new Date(entry.startISO)).getTime() === currentWeekStart.getTime())
    .sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

  let usedRegular = 0;
  return weekEntries.map(entry => {
    const regularHours = Math.max(0, Math.min(entry.hours, settings.weeklyLimit - usedRegular));
    const overtimeHours = Math.max(0, entry.hours - regularHours);
    usedRegular += regularHours;
    const regularPay = round2(regularHours * settings.regularRate);
    const overtimePay = round2(overtimeHours * settings.overtimeRate);
    const calloutFee = entry.callout ? Number(entry.calloutFee || calloutFeeForDate(new Date(entry.startISO))) : 0;
    const totalPay = round2(regularPay + overtimePay + calloutFee);
    return { ...entry, regularHours, overtimeHours, regularPay, overtimePay, calloutFee, totalPay };
  });
}

function render() {
  renderWeekLabel();
  renderActiveShift();
  renderSummaryAndEntries();
}

function renderActiveShift() {
  const active = getActiveShift();
  if (!active) {
    $("clock-state").textContent = "Not running";
    $("timer-note").textContent = "Tap Clock In when you leave. Tap Clock Out when you get home.";
    $("live-timer").textContent = "00:00:00";
    return;
  }
  const start = new Date(active.startISO);
  const ms = Date.now() - start.getTime();
  $("clock-state").textContent = "Running";
  $("timer-note").textContent = `Started ${formatDateTime(start)}`;
  $("live-timer").textContent = formatDuration(ms);
  $("active-callout").checked = Boolean(active.callout);
  $("active-notes").value = active.notes || "";
}

function renderSummaryAndEntries() {
  const hydrated = hydrateWeekEntries();
  const totals = hydrated.reduce((sum, entry) => {
    sum.hours += entry.hours;
    sum.regularPay += entry.regularPay;
    sum.overtimePay += entry.overtimePay;
    sum.totalPay += entry.totalPay;
    return sum;
  }, { hours: 0, regularPay: 0, overtimePay: 0, totalPay: 0 });

  $("week-hours").textContent = totals.hours.toFixed(2);
  $("week-regular-pay").textContent = money(totals.regularPay);
  $("week-overtime-pay").textContent = money(totals.overtimePay);
  $("week-total-pay").textContent = money(totals.totalPay);

  const list = $("entries-list");
  list.innerHTML = "";
  if (!hydrated.length) {
    list.innerHTML = '<div class="empty-state">No entries saved for this week yet.</div>';
    return;
  }

  const template = $("entry-template");
  hydrated.slice().reverse().forEach(entry => {
    const node = template.content.cloneNode(true);
    node.querySelector(".entry-date").textContent = formatDate(new Date(entry.startISO));
    node.querySelector(".entry-time").textContent = `${entry.startTime} – ${entry.endTime} • ${entry.hours.toFixed(2)} hrs`;
    node.querySelector(".entry-notes").textContent = entry.notes || (entry.callout ? "Call-out added" : "Regular shift");
    node.querySelector(".entry-pay").innerHTML = `${money(entry.totalPay)}<small>${entry.regularHours.toFixed(2)} reg / ${entry.overtimeHours.toFixed(2)} OT / ${money(entry.calloutFee)} call</small>`;
    node.querySelector(".delete-entry").addEventListener("click", () => deleteEntry(entry.id));
    list.appendChild(node);
  });
}

function startTimerLoop() {
  clearInterval(timerHandle);
  timerHandle = setInterval(renderActiveShift, 1000);
}

function changeWeek(offset) {
  currentWeekStart.setDate(currentWeekStart.getDate() + offset * 7);
  render();
}

function renderWeekLabel() {
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 6);
  $("week-label").textContent = `${formatShortDate(currentWeekStart)} – ${formatShortDate(end)}`;
}

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
}

function fillSettingsForm() {
  $("regular-rate").value = settings.regularRate;
  $("overtime-rate").value = settings.overtimeRate;
  $("weekly-limit").value = settings.weeklyLimit;
  $("weekday-fee").value = settings.weekdayCalloutFee;
  $("weekend-fee").value = settings.weekendCalloutFee;
}

function saveSettingsFromForm(event) {
  event.preventDefault();
  settings = {
    regularRate: Number($("regular-rate").value || DEFAULT_SETTINGS.regularRate),
    overtimeRate: Number($("overtime-rate").value || DEFAULT_SETTINGS.overtimeRate),
    weeklyLimit: Number($("weekly-limit").value || DEFAULT_SETTINGS.weeklyLimit),
    weekdayCalloutFee: Number($("weekday-fee").value || DEFAULT_SETTINGS.weekdayCalloutFee),
    weekendCalloutFee: Number($("weekend-fee").value || DEFAULT_SETTINGS.weekendCalloutFee)
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  render();
}

function resetSettings(event) {
  event.preventDefault();
  settings = { ...DEFAULT_SETTINGS };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  fillSettingsForm();
  render();
}

function exportBackup() {
  const backup = JSON.stringify({ entries, settings, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([backup], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hourly-tracker-backup-${toDateInput(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function setDefaultDates() {
  $("manual-date").value = toDateInput(new Date());
}

function getWeekStart(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function toDateInput(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function toTimeInput(date) {
  return date.toTimeString().slice(0, 5);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(date) {
  return `${formatDate(date)} at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
