import fs from "node:fs/promises";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node scripts/doc-to-sheet.mjs input.txt");
  process.exit(1);
}

const input = await fs.readFile(inputPath, "utf8");
const lines = input
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const header = [
  "id",
  "start_date",
  "end_date",
  "location",
  "city",
  "region",
  "country",
  "notes",
  "lat",
  "lng",
  "status"
];

const rows = lines.map(parseLine);
process.stdout.write(`${toCsvRow(header)}\n${rows.map(toCsvRow).join("\n")}\n`);

function parseLine(line) {
  const parts = line.split("|").map((part) => part.trim());

  if (parts.length < 6) {
    throw new Error(`Could not parse line: ${line}`);
  }

  const [dateRange, location, city, region, country, notes, lat = "", lng = "", status = "planned"] = parts;
  const [start_date, end_date] = dateRange.split(/\s+to\s+/i).map((value) => value.trim());
  const slugSource = [start_date, location, region || country].filter(Boolean).join("-");
  const id = slugify(slugSource);

  return [id, start_date, end_date, location, city, region, country, notes, lat, lng, status];
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCsvRow(values) {
  return values
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join(",");
}
