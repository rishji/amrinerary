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
    return { isPast: true, isCurrent: false, isFuture: false };
  }

  if (startDate > today) {
    return { isPast: false, isCurrent: false, isFuture: true };
  }

  return { isPast: false, isCurrent: true, isFuture: false };
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
        status: (row.status ?? "").trim() || "planned",
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

export function groupStopsByMonth(stops) {
  const groups = [];
  const seen = new Map();

  for (const stop of stops) {
    const key = `${stop.startDate.getUTCFullYear()}-${stop.startDate.getUTCMonth()}`;

    if (!seen.has(key)) {
      const group = {
        key,
        label: monthFormatter.format(stop.startDate),
        stops: []
      };
      seen.set(key, group);
      groups.push(group);
    }

    seen.get(key).stops.push(stop);
  }

  return groups;
}

export function buildCalendarMonths(stops) {
  const months = groupStopsByMonth(stops);

  return months.map((month) => ({
    key: month.key,
    label: month.label,
    days: buildMonthDays(month)
  }));
}

export function getCurrentStop(stops) {
  return stops.find((stop) => stop.isCurrent) ?? null;
}

export function getUpcomingStop(stops) {
  return stops.find((stop) => stop.isFuture) ?? null;
}

function buildMonthDays(month) {
  const [yearText, monthIndexText] = month.key.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthIndexText);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const stopMap = new Map(
    month.stops.map((stop) => [
      stop.startDateIso,
      {
        isoDate: stop.startDateIso,
        dayNumber: stop.startDate.getUTCDate(),
        weekday: stop.startDate.toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC"
        }),
        stops: [stop]
      }
    ])
  );

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(Date.UTC(year, monthIndex, day));
    const isoDate = toIsoDate(date);

    return (
      stopMap.get(isoDate) ?? {
        isoDate,
        dayNumber: day,
        weekday: date.toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC"
        }),
        stops: []
      }
    );
  });
}
