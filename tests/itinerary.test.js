import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCalendarMonths,
  filterStops,
  getCurrentStop,
  getUpcomingStop,
  groupStopsByMonth,
  normalizeRows
} from "../src/itinerary.js";

const rawRows = [
  {
    id: "2026-05-01-sf-ca",
    start_date: "2026-05-01",
    end_date: "2026-05-07",
    location: "SF",
    city: "San Francisco",
    region: "CA",
    country: "USA",
    notes: "Friends and dinners",
    lat: "37.7749",
    lng: "-122.4194",
    status: "confirmed"
  },
  {
    id: "2026-05-10-nyc-ny",
    start_date: "2026-05-10",
    end_date: "2026-05-16",
    location: "NYC",
    city: "New York",
    region: "NY",
    country: "USA",
    notes: "Work and family",
    lat: "40.7128",
    lng: "-74.0060",
    status: ""
  },
  {
    id: "2026-06-01-cdmx",
    start_date: "2026-06-01",
    end_date: "2026-06-14",
    location: "CDMX",
    city: "Mexico City",
    region: "CDMX",
    country: "Mexico",
    notes: "Long stay",
    lat: "19.4326",
    lng: "-99.1332",
    status: "planned"
  },
  {
    id: "2026-07-01-sicily",
    start_date: "2026-07-01",
    end_date: "2026-07-10",
    location: "Sicily",
    city: "Palermo",
    region: "Sicily",
    country: "Italy",
    notes: "Family visit",
    lat: "38.1157",
    lng: "13.3615",
    status: "planned"
  },
  {
    id: "2026-08-05-colombia",
    start_date: "2026-08-05",
    end_date: "2026-08-20",
    location: "Colombia",
    city: "Medellin",
    region: "Antioquia",
    country: "Colombia",
    notes: "Remote work",
    lat: "6.2442",
    lng: "-75.5812",
    status: "tentative"
  }
];

test("normalizeRows sorts stops and parses status and coordinates", () => {
  const stops = normalizeRows(rawRows, { today: "2026-05-12" });

  assert.equal(stops.length, 5);
  assert.equal(stops[0].id, "2026-05-01-sf-ca");
  assert.equal(stops[1].status, "planned");
  assert.equal(stops[0].lat, 37.7749);
  assert.equal(stops[0].isCurrent, false);
  assert.equal(stops[1].isCurrent, true);
  assert.equal(stops[4].isFuture, true);
});

test("shared filtering matches across location fields", () => {
  const stops = normalizeRows(rawRows, { today: "2026-05-12" });

  assert.deepEqual(filterStops(stops, "SF").map((stop) => stop.id), ["2026-05-01-sf-ca"]);
  assert.deepEqual(filterStops(stops, "NYC").map((stop) => stop.id), ["2026-05-10-nyc-ny"]);
  assert.deepEqual(filterStops(stops, "CDMX").map((stop) => stop.id), ["2026-06-01-cdmx"]);
  assert.deepEqual(filterStops(stops, "Sicily").map((stop) => stop.id), ["2026-07-01-sicily"]);
  assert.deepEqual(filterStops(stops, "Colombia").map((stop) => stop.id), ["2026-08-05-colombia"]);
});

test("timeline grouping keeps stops under editorial month labels", () => {
  const stops = normalizeRows(rawRows, { today: "2026-05-12" });
  const groups = groupStopsByMonth(stops);

  assert.deepEqual(groups.map((group) => group.label), [
    "May 2026",
    "June 2026",
    "July 2026",
    "August 2026"
  ]);
  assert.equal(groups[0].stops.length, 2);
});

test("calendar view summarizes stops by month and day ranges", () => {
  const stops = normalizeRows(rawRows, { today: "2026-05-12" });
  const months = buildCalendarMonths(stops);

  assert.equal(months.length, 4);
  assert.equal(months[0].days[0].isoDate, "2026-05-01");
  assert.equal(months[0].days[0].stops[0].dateLabel, "May 1-7");
  assert.equal(months[0].days[9].stops[0].dateLabel, "May 10-16");
});

test("current and upcoming highlights come from the same normalized data", () => {
  const stops = normalizeRows(rawRows, { today: "2026-05-12" });

  assert.equal(getCurrentStop(stops)?.id, "2026-05-10-nyc-ny");
  assert.equal(getUpcomingStop(stops)?.id, "2026-06-01-cdmx");
});
