import {
  buildCalendarMonths,
  filterStops,
  getCurrentStop,
  getUpcomingStop,
  groupStopsByMonth,
  normalizeRows
} from "./itinerary.js";

const appConfig = {
  today: new Date().toISOString().slice(0, 10),
  sheetCsvUrl:
    "https://docs.google.com/spreadsheets/d/1p6LYKwtvTj6tSq1ECNP-yfHx-jVgTk7DWRT1r7eTbuQ/export?format=csv&gid=510334876",
  sheetJsonUrl: "",
  fallbackDataUrl: "./sample-data.json",
  commentBoxProjectId: "5632126837850112-proj"
};

const state = {
  allStops: [],
  filteredStops: [],
  query: "",
  activeView: "timeline",
  activeStopId: null
};

const elements = {
  calendarView: document.querySelector("#calendar-view"),
  currentStop: document.querySelector("#current-stop"),
  dialog: document.querySelector("#stop-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogCommentbox: document.querySelector("#dialog-commentbox"),
  dialogCommentboxHelp: document.querySelector("#dialog-commentbox-help"),
  dialogDate: document.querySelector("#dialog-date"),
  dialogNotes: document.querySelector("#dialog-notes"),
  dialogSubtitle: document.querySelector("#dialog-subtitle"),
  dialogTitle: document.querySelector("#dialog-title"),
  mapEmpty: document.querySelector("#map-empty"),
  resultsSummary: document.querySelector("#results-summary"),
  searchInput: document.querySelector("#search-input"),
  timelineView: document.querySelector("#timeline-view"),
  upcomingStop: document.querySelector("#upcoming-stop"),
  viewButtons: [...document.querySelectorAll(".view-button")],
  viewPanels: [...document.querySelectorAll(".view-panel")]
};

let map;
let mapLayer;
let markers = [];

bootstrap().catch((error) => {
  console.error(error);
  elements.resultsSummary.textContent = "Could not load itinerary data.";
});

async function bootstrap() {
  installGlobalHandlers();
  const rows = await loadRows();
  state.allStops = normalizeRows(rows, { today: appConfig.today });
  state.filteredStops = state.allStops;
  render();
}

async function loadRows() {
  if (appConfig.sheetJsonUrl) {
    const response = await fetch(appConfig.sheetJsonUrl);
    return await response.json();
  }

  if (appConfig.sheetCsvUrl) {
    const response = await fetch(appConfig.sheetCsvUrl);
    return parseCsv(await response.text());
  }

  const response = await fetch(appConfig.fallbackDataUrl);
  return await response.json();
}

function installGlobalHandlers() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.filteredStops = filterStops(state.allStops, state.query);
    render();
  });

  for (const button of elements.viewButtons) {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      renderViewState();
      if (state.activeView === "map") {
        requestAnimationFrame(() => {
          map?.invalidateSize();
          fitMapToStops(state.filteredStops);
        });
      }
    });
  }

  elements.dialogClose.addEventListener("click", () => {
    elements.dialog.close();
  });
}

function render() {
  renderHighlights();
  renderSummary();
  renderViewState();
  renderTimeline();
  renderCalendar();
  renderMap();
}

function renderHighlights() {
  const current = getCurrentStop(state.filteredStops) ?? getCurrentStop(state.allStops);
  const upcoming = getUpcomingStop(state.filteredStops) ?? getUpcomingStop(state.allStops);

  elements.currentStop.innerHTML = current ? renderHighlightMarkup(current, "Current stop") : "No current stop.";
  elements.currentStop.classList.toggle("highlight-card-empty", !current);

  elements.upcomingStop.innerHTML = upcoming
    ? renderHighlightMarkup(upcoming, "Upcoming stop")
    : "No upcoming stop.";
  elements.upcomingStop.classList.toggle("highlight-card-empty", !upcoming);
}

function renderHighlightMarkup(stop, label) {
  return `
    <p class="stop-meta">${label}</p>
    <h2>${stop.location}</h2>
    <p>${stop.dateLabel}</p>
    <p>${[stop.city, stop.region, stop.country].filter(Boolean).join(", ")}</p>
  `;
}

function renderSummary() {
  const count = state.filteredStops.length;
  const total = state.allStops.length;
  const queryLabel = state.query.trim() ? ` for "${state.query.trim()}"` : "";
  elements.resultsSummary.textContent = `${count} of ${total} stops shown${queryLabel}.`;
}

function renderViewState() {
  for (const button of elements.viewButtons) {
    button.classList.toggle("is-active", button.dataset.view === state.activeView);
  }

  for (const panel of elements.viewPanels) {
    panel.classList.toggle("is-active", panel.id === `${state.activeView}-view`);
  }
}

function renderTimeline() {
  if (!state.filteredStops.length) {
    elements.timelineView.innerHTML = `<div class="empty-state">No itinerary stops match this search.</div>`;
    return;
  }

  const groups = groupStopsByMonth(state.filteredStops, { prioritizeUpcoming: true });
  const futureGroups = groups.filter((group) => !group.isPast);
  const pastGroups = groups.filter((group) => group.isPast);

  elements.timelineView.innerHTML = `
    ${futureGroups.length ? futureGroups.map(renderTimelineMonth).join("") : `<div class="empty-state">No upcoming stops match this search.</div>`}
    ${
      pastGroups.length
        ? `<details class="past-stops">
            <summary>Past stops</summary>
            <div class="past-stops-body">
              ${pastGroups.map(renderTimelineMonth).join("")}
            </div>
          </details>`
        : ""
    }
  `;

  bindCommentButtons(elements.timelineView);
}

function renderTimelineMonth(group) {
  return `
    <section class="timeline-month ${group.isPast ? "timeline-month-past" : ""}">
      <p class="timeline-month-label">${group.label}</p>
      <div class="timeline-cards">
        ${group.stops.map(renderTimelineCard).join("")}
      </div>
    </section>
  `;
}

function renderTimelineCard(stop) {
  return `
    <article class="timeline-card ${stop.isPast ? "is-past" : ""}">
      <div class="timeline-card-header">
        <div>
          <p class="stop-meta">${stop.dateLabel}</p>
          <h3>${stop.location}</h3>
        </div>
        <span class="status-pill">${stop.status}</span>
      </div>
      <p>${[stop.city, stop.region, stop.country].filter(Boolean).join(", ")}</p>
      <p>${stop.notes || "No notes yet."}</p>
      <button class="comment-button" data-stop-id="${stop.id}" type="button">Comments</button>
    </article>
  `;
}

function renderCalendar() {
  if (!state.filteredStops.length) {
    elements.calendarView.innerHTML = `<div class="empty-state">No calendar entries match this search.</div>`;
    return;
  }

  const months = buildCalendarMonths(state.filteredStops);
  elements.calendarView.innerHTML = months
    .map(
      (month) => `
        <section class="calendar-month ${month.isPast ? "calendar-month-past" : ""}">
          <p class="timeline-month-label">${month.label}</p>
          <div class="calendar-weekdays">
            ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
              .map((day) => `<span class="calendar-weekday">${day}</span>`)
              .join("")}
          </div>
          <div class="calendar-days">
            ${Array.from({ length: month.leadingEmptySlots }, () => `<div class="calendar-day calendar-day-empty" aria-hidden="true"></div>`).join("")}
            ${month.days.map(renderCalendarDay).join("")}
          </div>
        </section>
      `
    )
    .join("");

  bindCommentButtons(elements.calendarView);
}

function renderCalendarDay(day) {
  return `
    <article class="calendar-day ${day.stops.length ? "has-stop" : ""}">
      <span class="calendar-day-label">${day.weekday}</span>
      <span class="calendar-day-number">${day.dayNumber}</span>
      <div class="calendar-stops">${day.stops.map(renderCalendarStop).join("")}</div>
    </article>
  `;
}

function renderCalendarStop(stop) {
  const isDetailed = stop.calendarSpanState === "single" || stop.calendarSpanState === "start";
  return `
    <div class="calendar-stop calendar-stop-${stop.calendarSpanState}">
      ${
        isDetailed
          ? `<strong>${stop.location}</strong><p>${stop.dateLabel}</p>`
          : `<span>${stop.calendarLabel}</span>`
      }
      <button class="comment-button calendar-comment-button" data-stop-id="${stop.id}" type="button">Comments</button>
    </div>
  `;
}

function renderMap() {
  const mappedStops = state.filteredStops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
  ensureMap();
  clearMapMarkers();

  if (!mappedStops.length) {
    elements.mapEmpty.classList.remove("hidden");
    return;
  }

  elements.mapEmpty.classList.add("hidden");
  markers = mappedStops.map((stop) => {
    const marker = window.L.marker([stop.lat, stop.lng]).addTo(mapLayer);
    marker.bindPopup(
      `<strong>${stop.location}</strong><br>${stop.dateLabel}<br><button class="comment-button" data-stop-id="${stop.id}" type="button">Comments</button>`
    );
    marker.on("popupopen", bindPopupButtons);
    return marker;
  });

  fitMapToStops(mappedStops);
}

function ensureMap() {
  if (map) {
    return;
  }

  map = window.L.map("map", { zoomControl: false });
  mapLayer = window.L.layerGroup().addTo(map);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

function clearMapMarkers() {
  for (const marker of markers) {
    marker.remove();
  }
  markers = [];
}

function fitMapToStops(stops) {
  if (!map || !stops.length) {
    return;
  }

  const bounds = window.L.latLngBounds(stops.map((stop) => [stop.lat, stop.lng]));
  map.fitBounds(bounds, { padding: [40, 40] });
}

function bindCommentButtons(root) {
  for (const button of root.querySelectorAll(".comment-button")) {
    button.addEventListener("click", () => {
      openStopDialog(button.dataset.stopId);
    });
  }
}

function bindPopupButtons() {
  const popupButtons = document.querySelectorAll(".leaflet-popup-content .comment-button");
  for (const button of popupButtons) {
    button.addEventListener("click", () => {
      openStopDialog(button.dataset.stopId);
    });
  }
}

function openStopDialog(stopId) {
  const stop = state.allStops.find((item) => item.id === stopId);
  if (!stop) {
    return;
  }

  state.activeStopId = stop.id;
  elements.dialogDate.textContent = stop.dateLabel;
  elements.dialogTitle.textContent = stop.location;
  elements.dialogSubtitle.textContent = [stop.city, stop.region, stop.country].filter(Boolean).join(", ");
  elements.dialogNotes.textContent = stop.notes || "No notes yet.";
  elements.dialogCommentbox.innerHTML = "";

  if (appConfig.commentBoxProjectId) {
    elements.dialogCommentboxHelp.classList.add("hidden");
    mountCommentBox(stop.id);
  } else {
    elements.dialogCommentboxHelp.classList.remove("hidden");
  }

  elements.dialog.showModal();
}

function mountCommentBox(stopId) {
  const containerClass = "commentbox-thread";
  elements.dialogCommentbox.innerHTML = `<div class="${containerClass}"></div>`;

  const existingScript = document.querySelector("script[data-commentbox-script]");
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/commentbox.io/dist/commentBox.min.js";
    script.dataset.commentboxScript = "true";
    script.onload = () => renderCommentThread(stopId, containerClass);
    document.body.append(script);
    return;
  }

  renderCommentThread(stopId, containerClass);
}

function renderCommentThread(stopId, containerClass) {
  if (typeof window.commentBox !== "function") {
    return;
  }

  window.commentBox(appConfig.commentBoxProjectId, {
    className: containerClass,
    defaultBoxId: stopId,
    tlcParam: `thread-${stopId}`
  });
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(current);
      rows.push(currentRow);
      current = "";
      currentRow = [];
      continue;
    }

    current += char;
  }

  if (current || currentRow.length) {
    currentRow.push(current);
    rows.push(currentRow);
  }

  const [header, ...body] = rows.filter((row) => row.some((cell) => cell !== ""));
  return body.map((row) =>
    Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""]))
  );
}
