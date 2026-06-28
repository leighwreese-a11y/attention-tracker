// Tjikko — an almanac of where the attention goes.
// All data lives in THIS browser only (localStorage). Nothing leaves the device.

const WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// Starter "roots". Fully editable via Tend categories.
const DEFAULT_CATEGORIES = [
  "Deep work", "Making art", "Reading", "The garden",
  "People I love", "The body", "Rest", "The wander",
  "Small screens", "Cooking", "Money & admin", "The unnamed",
];

// One earthy colour per category, by position.
const COLORS = [
  "#8b9b6a", "#c07a4b", "#9a86b4", "#6fa080",
  "#c08585", "#5f9a92", "#c2b06a", "#88a0bd",
  "#b56a4a", "#cda35a", "#a9a596", "#9a978c",
];

// --- Saving & loading --------------------------------------------------

function getCategories() {
  const raw = localStorage.getItem("categories");
  return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES.slice();
}
function saveCategories(list) {
  localStorage.setItem("categories", JSON.stringify(list));
}

// A mark is { c: categoryIndex, t: timestamp(ms) }. One per category per day.
function getCheckins() {
  const raw = localStorage.getItem("checkins");
  return raw ? JSON.parse(raw) : [];
}
function saveCheckins(list) {
  localStorage.setItem("checkins", JSON.stringify(list));
}

// --- Dates -------------------------------------------------------------

function localDayStr(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function noonOf(ms) {
  const d = new Date(ms);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

// Drop marks older than the rolling window (keeps storage tiny).
function pruneOld() {
  const cutoff = Date.now() - WINDOW_DAYS * DAY_MS;
  const kept = getCheckins().filter(function (item) { return item.t >= cutoff; });
  saveCheckins(kept);
  return kept;
}

// The set of category indices marked on a given day ("YYYY-MM-DD").
function marksForDay(dayStr) {
  const set = new Set();
  getCheckins().forEach(function (item) {
    if (localDayStr(item.t) === dayStr) set.add(item.c);
  });
  return set;
}

// Days-marked per category across the rolling window.
function countsLast14() {
  const counts = getCategories().map(function () { return 0; });
  pruneOld().forEach(function (item) {
    if (item.c >= 0 && item.c < counts.length) counts[item.c]++;
  });
  return counts;
}

// The day currently being tended. Starts on today.
let selectedMs = noonOf(Date.now());

function oldestMs() { return noonOf(Date.now() - (WINDOW_DAYS - 1) * DAY_MS); }

// --- Elements ----------------------------------------------------------

const grid = document.getElementById("grid");
const summaryEl = document.getElementById("summary");
const calendarEl = document.getElementById("calendar");
const tendTitle = document.getElementById("tend-title");
const tallyEl = document.getElementById("tally");
const dayCaps = document.getElementById("day-caps");
const dayPrev = document.getElementById("day-prev");
const dayNext = document.getElementById("day-next");

// --- Rendering ---------------------------------------------------------

function renderDay() {
  const sel = localDayStr(selectedMs);
  const isToday = sel === localDayStr(Date.now());

  dayCaps.textContent = "✦ " + new Date(selectedMs)
    .toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase() + " ✦";

  tendTitle.textContent = isToday ? "The grove I tend today" : "The grove I tended";
  dayNext.disabled = isToday;
  dayPrev.disabled = sel === localDayStr(oldestMs());
}

function renderTally() {
  const n = marksForDay(localDayStr(selectedMs)).size;
  tallyEl.innerHTML = "<strong>" + n + "</strong> of 12 roots tended.";
}

function renderGrid() {
  const cats = getCategories();
  const marks = marksForDay(localDayStr(selectedMs));
  grid.innerHTML = "";

  cats.forEach(function (name, i) {
    const on = marks.has(i);
    const btn = document.createElement("button");
    btn.className = "root" + (on ? " active" : "");
    btn.innerHTML =
      '<span class="dot" style="background:' + COLORS[i] +
      ";opacity:" + (on ? 1 : 0.3) + '"></span>' +
      '<span class="name">' + escapeHtml(name) + "</span>";

    btn.addEventListener("click", function () {
      const list = getCheckins();
      const sel = localDayStr(selectedMs);
      const existing = list.findIndex(function (item) {
        return item.c === i && localDayStr(item.t) === sel;
      });
      if (existing >= 0) list.splice(existing, 1);   // tap again = take it back
      else list.push({ c: i, t: selectedMs });        // mark the chosen day
      saveCheckins(list);
      refresh();
    });

    grid.appendChild(btn);
  });
}

function renderCalendar() {
  calendarEl.innerHTML = "";
  const today = noonOf(Date.now());
  const selStr = localDayStr(selectedMs);

  for (let k = WINDOW_DAYS - 1; k >= 0; k--) {
    const ms = noonOf(today - k * DAY_MS);
    const ds = localDayStr(ms);
    const has = marksForDay(ds).size > 0;
    const cell = document.createElement("button");
    cell.className = "cal-cell" + (ds === selStr ? " selected" : "") + (has ? " has" : "");
    cell.innerHTML =
      '<span class="cal-wd">' +
      new Date(ms).toLocaleDateString([], { weekday: "narrow" }) + "</span>" +
      '<span class="cal-day">' + new Date(ms).getDate() + "</span>" +
      '<span class="cal-mark"></span>';
    cell.addEventListener("click", function () {
      selectedMs = ms;
      refresh();
    });
    calendarEl.appendChild(cell);
  }
}

function renderSummary() {
  const cats = getCategories();
  const counts = countsLast14();
  summaryEl.innerHTML = "";

  cats.forEach(function (name, i) {
    const c = counts[i];
    const status = c === 0 ? "dormant · 0 of 14" : "tended · " + c + " of 14";

    let segs = "";
    for (let s = 0; s < WINDOW_DAYS; s++) {
      segs += '<span class="seg" style="' +
        (s < c ? "background:" + COLORS[i] : "") + '"></span>';
    }

    const row = document.createElement("div");
    row.className = "sum-row";
    row.innerHTML =
      '<div class="sum-top"><span class="sum-name">' + escapeHtml(name) +
      '</span><span class="sum-status">' + status + "</span></div>" +
      '<div class="segments">' + segs + "</div>";
    summaryEl.appendChild(row);
  });
}

function refresh() {
  renderDay();
  renderTally();
  renderGrid();
  renderCalendar();
  renderSummary();
}

// --- Day arrows --------------------------------------------------------

dayPrev.addEventListener("click", function () {
  if (dayPrev.disabled) return;
  selectedMs = noonOf(selectedMs - DAY_MS);
  refresh();
});
dayNext.addEventListener("click", function () {
  if (dayNext.disabled) return;
  selectedMs = noonOf(selectedMs + DAY_MS);
  refresh();
});

// --- Tend categories (rename) -----------------------------------------

const tendBtn = document.getElementById("tend-btn");
const tendPanel = document.getElementById("tend-panel");
const tendFields = document.getElementById("tend-fields");
const tendDone = document.getElementById("tend-done");

tendBtn.addEventListener("click", function () {
  const cats = getCategories();
  tendFields.innerHTML = "";
  cats.forEach(function (name, i) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = name;
    input.dataset.index = i;
    tendFields.appendChild(input);
  });
  tendPanel.hidden = false;
  tendPanel.scrollIntoView({ behavior: "smooth" });
});

tendDone.addEventListener("click", function () {
  const cats = getCategories();
  tendFields.querySelectorAll("input").forEach(function (input) {
    const value = input.value.trim();
    if (value) cats[Number(input.dataset.index)] = value;
  });
  saveCategories(cats);
  tendPanel.hidden = true;
  refresh();
});

// --- Share -------------------------------------------------------------

document.getElementById("share-btn").addEventListener("click", async function () {
  const data = {
    title: "Tjikko",
    text: "an almanac of where the attention goes",
    url: location.href,
  };
  if (navigator.share) {
    try { await navigator.share(data); } catch (e) { /* cancelled */ }
  } else {
    try {
      await navigator.clipboard.writeText(location.href);
      alert("Link copied — share it with your people.");
    } catch (e) {
      alert(location.href);
    }
  }
});

// --- Helpers & startup -------------------------------------------------

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

refresh();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js");
  });
}
