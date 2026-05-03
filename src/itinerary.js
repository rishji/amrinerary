const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

function parseIsoDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildSearchText(row) {
  return [row.location, row.city, row.region, row.country]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function classifyStop(startDate, endDate, today) {
  if (endDate < today) {
    return { isPast: true, isCurrent: false, isFuture: false, lifecycleStatus: "past" };
  }

  if (startDate > today) {
    return { isPast: false, isCurrent: false, isFuture: true, lifecycleStatus: "planned" };
  }

  return { isPast: false, isCurrent: true, isFuture: false, lifecycleStatus: "current" };
}

export function formatDateRange(startDate, endDate) {
  const startLabel = dayFormatter.format(startDate);
  const endLabel = dayFormatter.format(endDate);
  return startLabel === endLabel ? startLabel : `${startLabel}-${endDate.getUTCDate()}`;
}

export function normalizeRows(rows, options = {}) {
  const today = parseIsoDate(options.today ?? toIsoDate(new Date()));

  return rows
    .filter((row) => row.id && row.start_date && row.end_date && row.location)
    .map((row) => {
      const startDate = parseIsoDate(row.start_date);
      const endDate = parseIsoDate(row.end_date);
      const classification = classifyStop(startDate, endDate, today);

      return {
        id: row.id.trim(),
        startDate,
        endDate,
        startDateIso: row.start_date,
        endDateIso: row.end_date,
        dateLabel: formatDateRange(startDate, endDate),
        location: row.location.trim(),
        city: (row.city ?? "").trim(),
        region: (row.region ?? "").trim(),
        country: (row.country ?? "").trim(),
        notes: (row.notes ?? "").trim(),
        lat: row.lat === "" || row.lat == null ? null : Number(row.lat),
        lng: row.lng === "" || row.lng == null ? null : Number(row.lng),
        rawStatus: (row.status ?? "").trim() || "planned",
        status: classification.lifecycleStatus,
        searchText: buildSearchText(row),
        ...classification
      };
    })
    .sort((left, right) => left.startDate - right.startDate);
}

export function filterStops(stops, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return stops;
  }

  return stops.filter((stop) => stop.searchText.includes(normalizedQuery));
}

export function groupStopsByMonth(stops, options = {}) {
  const groups = [];
  const seen = new Map();
  const prioritizeUpcoming = options.prioritizeUpcoming ?? false;

  for (const stop of stops) {
    const key = `${stop.startDate.getUTCFullYear()}-${stop.startDate.getUTCMonth()}`;

    if (!seen.has(key)) {
      const group = {
        key,
        label: monthFormatter.format(stop.startDate),
        stops: [],
        isPast: true
      };
      seen.set(key, group);
      groups.push(group);
    }

    const group = seen.get(key);
    group.stops.push(stop);
    if (!stop.isPast) {
      group.isPast = false;
    }
  }

  if (prioritizeUpcoming) {
    return [...groups.filter((group) => !group.isPast), ...groups.filter((group) => group.isPast)];
  }

  return groups;
}

export function buildCalendarMonths(stops) {
  if (!stops.length) {
    return [];
  }

  const orderedMonths = buildCalendarMonthRange(stops);
  return orderedMonths.map((month) => buildCalendarMonth(month, stops));
}

export function getCurrentStop(stops) {
  return stops.find((stop) => stop.isCurrent) ?? null;
}

export function getUpcomingStop(stops) {
  return stops.find((stop) => stop.isFuture) ?? null;
}

function buildMonthDays(month) {
  const { year, monthIndex } = month;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(Date.UTC(year, monthIndex, day));
    const isoDate = toIsoDate(date);
    const stops = month.stops
      .filter((stop) => stop.startDateIso <= isoDate && stop.endDateIso >= isoDate)
      .map((stop) => ({
        ...stop,
        calendarSpanState: getCalendarSpanState(stop, isoDate),
        calendarLabel: getCalendarLabel(stop, isoDate)
      }));

    return {
      isoDate,
      dayNumber: day,
      weekday: date.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC"
      }),
      stops
    };
  });
}

function buildCalendarMonthRange(stops) {
  const firstMonth = new Date(Date.UTC(stops[0].startDate.getUTCFullYear(), stops[0].startDate.getUTCMonth(), 1));
  const lastStop = stops.reduce((latest, stop) => (stop.endDate > latest.endDate ? stop : latest), stops[0]);
  const lastMonth = new Date(Date.UTC(lastStop.endDate.getUTCFullYear(), lastStop.endDate.getUTCMonth(), 1));
  const months = [];

  for (let cursor = firstMonth; cursor <= lastMonth; cursor = addMonth(cursor)) {
    const year = cursor.getUTCFullYear();
    const monthIndex = cursor.getUTCMonth();
    months.push({
      key: `${year}-${monthIndex}`,
      label: monthFormatter.format(cursor),
      year,
      monthIndex,
      stops: stops.filter((stop) => intersectsMonth(stop, year, monthIndex))
    });
  }

  return [...months.filter((month) => !month.stops.every((stop) => stop.isPast)), ...months.filter((month) => month.stops.every((stop) => stop.isPast))];
}

function buildCalendarMonth(month, stops) {
  const firstDay = new Date(Date.UTC(month.year, month.monthIndex, 1));
  return {
    key: month.key,
    label: month.label,
    isPast: month.stops.length ? month.stops.every((stop) => stop.isPast) : false,
    leadingEmptySlots: firstDay.getUTCDay(),
    days: buildMonthDays(month),
    featuredStops: stops.filter((stop) => intersectsMonth(stop, month.year, month.monthIndex))
  };
}

function intersectsMonth(stop, year, monthIndex) {
  const monthStart = toIsoDate(new Date(Date.UTC(year, monthIndex, 1)));
  const monthEnd = toIsoDate(new Date(Date.UTC(year, monthIndex + 1, 0)));
  return stop.startDateIso <= monthEnd && stop.endDateIso >= monthStart;
}

function addMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function getCalendarSpanState(stop, isoDate) {
  if (stop.startDateIso === isoDate && stop.endDateIso === isoDate) {
    return "single";
  }

  if (stop.startDateIso === isoDate) {
    return "start";
  }

  if (stop.endDateIso === isoDate) {
    return "end";
  }

  return "middle";
}

function getCalendarLabel(stop, isoDate) {
  const state = getCalendarSpanState(stop, isoDate);
  if (state === "start" || state === "single") {
    return stop.location;
  }

  return stop.location;
}
