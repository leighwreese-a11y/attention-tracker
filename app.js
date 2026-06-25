// Attention Tracker — all data lives in THIS browser only (localStorage).
// Each person's data stays on their own device. Nothing is sent anywhere.

// How many days the rolling window covers.
const WINDOW_DAYS = 14;

// Starter names for the 12 categories. Fully editable in the app.
const DEFAULT_CATEGORIES = [
  "Deep work", "Email", "Meetings",
  "Phone / scrolling", "Family", "Exercise",
  "Rest", "Reading", "Chores",
  "Social", "Planning", "Other",
];

// --- Saving & loading data ---------------------------------------------

function getCategories() {
  const raw = localStorage.getItem("categories");
  return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES.slice();
}

function saveCategories(list) {
  localStorage.setItem("categories", JSON.stringify(list));
}

// A check-in is { c: categoryIndex, t: timestamp(ms) }.
function getCheckins() {
  const raw = localStorage.getItem("checkins");
  return raw ? JSON.parse(raw) : [];
}

function saveCheckins(list) {
  localStorage.setItem("checkins", JSON.stringify(list));
}

// Throw away anything older than the rolling window (keeps storage tiny).
function pruneOld() {
  const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const kept = getCheckins().filter(function (item) {
    return item.t >= cutoff;
  });
  saveCheckins(kept);
  return kept;
}

// Count taps per category within the rolling window.
function countsLast14() {
  const cats = getCategories();
  const counts = cats.map(function () { return 0; });
  pruneOld().forEach(function (item) {
    if (item.c >= 0 && item.c < counts.length) counts[item.c]++;
  });
  return counts;
}

// --- The tap grid ------------------------------------------------------

const grid = document.getElementById("grid");

function renderGrid() {
  const cats = getCategories();
  const counts = countsLast14();
  grid.innerHTML = "";

  cats.forEach(function (name, index) {
    const btn = document.createElement("button");
    btn.className = "cat-btn";
    btn.innerHTML =
      '<span class="count">' + counts[index] + "</span>" +
      "<span>" + escapeHtml(name) + "</span>";

    btn.addEventListener("click", function () {
      const list = getCheckins();
      list.push({ c: index, t: Date.now() });
      saveCheckins(list);

      // brief flash so you know the tap landed
      btn.classList.add("tapped");
      setTimeout(function () { btn.classList.remove("tapped"); }, 180);

      renderGrid();
      renderSummary();
    });

    grid.appendChild(btn);
  });
}

// --- The 14-day summary bars ------------------------------------------

const summary = document.getElementById("summary");

function renderSummary() {
  const cats = getCategories();
  const counts = countsLast14();

  // pair up name + count, then sort highest first
  const rows = cats.map(function (name, index) {
    return { name: name, count: counts[index] };
  }).sort(function (a, b) { return b.count - a.count; });

  const max = Math.max.apply(null, counts.concat([1]));
  const total = counts.reduce(function (a, b) { return a + b; }, 0);

  if (total === 0) {
    summary.innerHTML = '<p class="hint">No taps yet. Tap a category above to start.</p>';
    return;
  }

  summary.innerHTML = "";
  rows.forEach(function (row) {
    const width = Math.round((row.count / max) * 100);
    const el = document.createElement("div");
    el.className = "bar-row";
    el.innerHTML =
      '<div class="bar-label"><span>' + escapeHtml(row.name) + "</span>" +
      "<span>" + row.count + "</span></div>" +
      '<div class="bar-track"><div class="bar-fill" style="width:' + width + '%"></div></div>';
    summary.appendChild(el);
  });
}

// --- Editing the category names ---------------------------------------

const editToggle = document.getElementById("edit-toggle");
const editPanel = document.getElementById("edit-panel");
const editFields = document.getElementById("edit-fields");
const editDone = document.getElementById("edit-done");

editToggle.addEventListener("click", function () {
  const cats = getCategories();
  editFields.innerHTML = "";
  cats.forEach(function (name, index) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = name;
    input.dataset.index = index;
    editFields.appendChild(input);
  });
  editPanel.hidden = false;
  editToggle.hidden = true;
});

editDone.addEventListener("click", function () {
  const inputs = editFields.querySelectorAll("input");
  const cats = getCategories();
  inputs.forEach(function (input) {
    const i = Number(input.dataset.index);
    const value = input.value.trim();
    if (value) cats[i] = value;
  });
  saveCategories(cats);
  editPanel.hidden = true;
  editToggle.hidden = false;
  renderGrid();
  renderSummary();
});

// --- Helpers & startup -------------------------------------------------

// Keep typed text from being treated as HTML (basic safety).
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

renderGrid();
renderSummary();

// Register the service worker so the app can be installed / work offline.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js");
  });
}
