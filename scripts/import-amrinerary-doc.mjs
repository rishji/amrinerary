import fs from "node:fs/promises";

const inputPath = process.argv[2];
const initialYear = Number(process.argv[3] ?? "2026");

if (!inputPath) {
  console.error("Usage: node scripts/import-amrinerary-doc.mjs <doc.txt> [initialYear]");
  process.exit(1);
}

const monthNumbers = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12"
};

const placeLookup = {
  "Attleboro, MA": { city: "Attleboro", region: "MA", country: "USA", lat: 41.9445, lng: -71.2856 },
  "Atlanta, GA": { city: "Atlanta", region: "GA", country: "USA", lat: 33.749, lng: -84.388 },
  "Bar Harbor, ME": { city: "Bar Harbor", region: "ME", country: "USA", lat: 44.3876, lng: -68.2039 },
  "Black Rock City, NV": { city: "Black Rock City", region: "NV", country: "USA", lat: 40.7864, lng: -119.2065 },
  "Boulder, CO": { city: "Boulder", region: "CO", country: "USA", lat: 40.015, lng: -105.2705 },
  "Camden, NJ": { city: "Camden", region: "NJ", country: "USA", lat: 39.9259, lng: -75.1196 },
  "Camp Navarro, CA": { city: "Navarro", region: "CA", country: "USA", lat: 39.1774, lng: -123.6761 },
  "Campbell, CA": { city: "Campbell", region: "CA", country: "USA", lat: 37.2872, lng: -121.9499 },
  "CDMX, Mexico": { city: "Mexico City", region: "CDMX", country: "Mexico", lat: 19.4326, lng: -99.1332 },
  "Chicago, IL": { city: "Chicago", region: "IL", country: "USA", lat: 41.8781, lng: -87.6298 },
  "Cle Elum, WA": { city: "Cle Elum", region: "WA", country: "USA", lat: 47.1954, lng: -120.9392 },
  Colombia: { city: "", region: "", country: "Colombia", lat: 4.5709, lng: -74.2973 },
  DC: { city: "Washington", region: "DC", country: "USA", lat: 38.9072, lng: -77.0369 },
  "Forest in VA": { city: "Forest", region: "VA", country: "USA", lat: 37.3638, lng: -79.2897 },
  "Hilton Head, SC": { city: "Hilton Head", region: "SC", country: "USA", lat: 32.2163, lng: -80.7526 },
  "Jackson Hole, WY": { city: "Jackson", region: "WY", country: "USA", lat: 43.4799, lng: -110.7624 },
  "Joshua Tree, CA": { city: "Joshua Tree", region: "CA", country: "USA", lat: 34.1347, lng: -116.3131 },
  "LA, CA": { city: "Los Angeles", region: "CA", country: "USA", lat: 34.0522, lng: -118.2437 },
  "Lake Tahoe, CA": { city: "Lake Tahoe", region: "CA", country: "USA", lat: 39.0968, lng: -120.0324 },
  "Martha's Vineyard, MA": { city: "Martha's Vineyard", region: "MA", country: "USA", lat: 41.3806, lng: -70.6455 },
  "Montgomery, AL": { city: "Montgomery", region: "AL", country: "USA", lat: 32.3668, lng: -86.3 },
  NYC: { city: "New York", region: "NY", country: "USA", lat: 40.7128, lng: -74.006 },
  "Oklahoma City, OK": { city: "Oklahoma City", region: "OK", country: "USA", lat: 35.4676, lng: -97.5164 },
  "Palm Springs, CA": { city: "Palm Springs", region: "CA", country: "USA", lat: 33.8303, lng: -116.5453 },
  "Patchogue, NY": { city: "Patchogue", region: "NY", country: "USA", lat: 40.7657, lng: -73.0151 },
  "Pittsburgh, PA": { city: "Pittsburgh", region: "PA", country: "USA", lat: 40.4406, lng: -79.9959 },
  "San Destin, FL": { city: "Miramar Beach", region: "FL", country: "USA", lat: 30.3744, lng: -86.3586 },
  "Savannah, GA": { city: "Savannah", region: "GA", country: "USA", lat: 32.0809, lng: -81.0912 },
  "Seattle, WA": { city: "Seattle", region: "WA", country: "USA", lat: 47.6061, lng: -122.3328 },
  "SF, CA": { city: "San Francisco", region: "CA", country: "USA", lat: 37.7749, lng: -122.4194 },
  Sicily: { city: "", region: "Sicily", country: "Italy", lat: 37.599, lng: 14.0154 },
  "Sicily, Italy": { city: "", region: "Sicily", country: "Italy", lat: 37.599, lng: 14.0154 },
  "Sing Sing, NY": { city: "Ossining", region: "NY", country: "USA", lat: 41.1629, lng: -73.8615 },
  "Wisconsin Dells, WI": { city: "Wisconsin Dells", region: "WI", country: "USA", lat: 43.6275, lng: -89.7709 }
};

const input = await fs.readFile(inputPath, "utf8");
const lines = input
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

let year = initialYear;
const rows = [];

for (const line of lines) {
  if (/^\d{4}$/.test(line)) {
    year = Number(line);
    continue;
  }

  if (!line.includes("=")) {
    continue;
  }

  rows.push(parseLine(line, year));
}

process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);

function parseLine(line, year) {
  const [datePart, rawPlacePart] = line.split("=").map((part) => part.trim());
  const { startDate, endDate } = parseDateRange(datePart, year);
  const { location, notes } = splitPlaceAndNotes(rawPlacePart);
  const normalizedLocation = location.replace(/\s+/g, " ").trim();
  const locationLabel = compactLocationLabel(normalizedLocation);
  const place = placeLookup[normalizedLocation] ?? inferPlace(normalizedLocation);
  const id = slugify(`${startDate}-${locationLabel}`);

  return {
    id,
    start_date: startDate,
    end_date: endDate,
    location: locationLabel,
    city: place.city,
    region: place.region,
    country: place.country,
    notes,
    lat: place.lat === null ? "" : String(place.lat ?? ""),
    lng: place.lng === null ? "" : String(place.lng ?? ""),
    status: "planned"
  };
}

function parseDateRange(datePart, year) {
  const match = datePart.match(/^([A-Z][a-z]{2})\s+(\d{1,2})(?:\s*-\s*([A-Z][a-z]{2})?\s*(\d{1,2}))?$/);
  if (!match) {
    throw new Error(`Unsupported date format: ${datePart}`);
  }

  const [, startMonth, startDay, endMonthMaybe, endDayMaybe] = match;
  const endMonth = endMonthMaybe || startMonth;
  const endDay = endDayMaybe || startDay;
  const startDate = `${year}-${monthNumbers[startMonth]}-${String(startDay).padStart(2, "0")}`;

  let endYear = year;
  if (monthIndex(endMonth) < monthIndex(startMonth)) {
    endYear += 1;
  }

  const endDate = `${endYear}-${monthNumbers[endMonth]}-${String(endDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function splitPlaceAndNotes(rawPlacePart) {
  let notes = "";
  let location = rawPlacePart.trim();
  const parenthetical = location.match(/\(([^)]+)\)\s*$/);

  if (parenthetical) {
    notes = parenthetical[1].trim();
    location = location.slice(0, parenthetical.index).trim();
  }

  const withSplit = location.match(/^(.+?)\s+with\s+(.+)$/i);
  if (withSplit) {
    location = withSplit[1].trim();
    notes = [withSplit[2].trim(), notes].filter(Boolean).join("; ");
  }

  return { location, notes };
}

function inferPlace(location) {
  if (location.includes(",")) {
    const [first, second] = location.split(",").map((part) => part.trim());
    if (second.length === 2) {
      return { city: first, region: second, country: "USA", lat: "", lng: "" };
    }
    return { city: "", region: first, country: second, lat: "", lng: "" };
  }

  return { city: "", region: "", country: "", lat: "", lng: "" };
}

function compactLocationLabel(location) {
  if (location === "Sicily, Italy") {
    return "Sicily";
  }
  return location;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function monthIndex(monthName) {
  return Number(monthNumbers[monthName]);
}
