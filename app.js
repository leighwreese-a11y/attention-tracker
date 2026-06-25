// Attention Tracker — all data lives in THIS browser only (localStorage).
// Nothing is sent anywhere, so each person's data stays on their own phone.

// A key like "intention-2026-06-25" so each day is stored separately.
function todayKey(prefix) {
  const today = new Date().toISOString().slice(0, 10); // e.g. "2026-06-25"
  return prefix + "-" + today;
}

// --- Grab the bits of the page we need to talk to ---
const intentionInput = document.getElementById("intention-input");
const saveIntentionBtn = document.getElementById("save-intention");
const intentionDisplay = document.getElementById("intention-display");

const checkinInput = document.getElementById("checkin-input");
const addCheckinBtn = document.getElementById("add-checkin");
const checkinList = document.getElementById("checkin-list");
const emptyNote = document.getElementById("empty-note");

// --- Today's intention ---
function loadIntention() {
  const saved = localStorage.getItem(todayKey("intention"));
  intentionDisplay.textContent = saved ? "Intention: " + saved : "";
}

saveIntentionBtn.addEventListener("click", function () {
  const value = intentionInput.value.trim();
  if (!value) return;
  localStorage.setItem(todayKey("intention"), value);
  intentionInput.value = "";
  loadIntention();
});

// --- Attention check-ins (a list saved as text) ---
function getCheckins() {
  const raw = localStorage.getItem(todayKey("checkins"));
  return raw ? JSON.parse(raw) : [];
}

function saveCheckins(list) {
  localStorage.setItem(todayKey("checkins"), JSON.stringify(list));
}

function renderCheckins() {
  const list = getCheckins();
  checkinList.innerHTML = "";
  emptyNote.style.display = list.length ? "none" : "block";

  list.forEach(function (item, index) {
    const li = document.createElement("li");

    const left = document.createElement("span");
    left.innerHTML =
      '<span class="time">' + item.time + "</span>" + escapeHtml(item.text);

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "Delete";
    del.addEventListener("click", function () {
      const current = getCheckins();
      current.splice(index, 1);
      saveCheckins(current);
      renderCheckins();
    });

    li.appendChild(left);
    li.appendChild(del);
    checkinList.appendChild(li);
  });
}

addCheckinBtn.addEventListener("click", function () {
  const value = checkinInput.value.trim();
  if (!value) return;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const list = getCheckins();
  list.push({ text: value, time: time });
  saveCheckins(list);

  checkinInput.value = "";
  renderCheckins();
});

// Keep any typed text from being treated as HTML (basic safety).
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// --- Start the app ---
loadIntention();
renderCheckins();

// Register the service worker so the app can be installed / work offline.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js");
  });
}
