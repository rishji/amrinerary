# Amrinerary

Static travel app for a Google Sheet powered itinerary. It renders three synchronized reader views from one sheet:

- Timeline cards
- Leaflet map with OpenStreetMap
- Calendar/list hybrid

Each stop can also open a dedicated CommentBox thread keyed by a stable sheet `id`.

## Local structure

- [index.html](/Users/rishi/Projects/amrinerary/index.html)
- [styles.css](/Users/rishi/Projects/amrinerary/styles.css)
- [src/app.js](/Users/rishi/Projects/amrinerary/src/app.js)
- [src/itinerary.js](/Users/rishi/Projects/amrinerary/src/itinerary.js)
- [tests/itinerary.test.js](/Users/rishi/Projects/amrinerary/tests/itinerary.test.js)
- [sample-data.json](/Users/rishi/Projects/amrinerary/sample-data.json)
- [scripts/doc-to-sheet.mjs](/Users/rishi/Projects/amrinerary/scripts/doc-to-sheet.mjs)

## Data model

Create a sheet with these columns:

`id`, `start_date`, `end_date`, `location`, `city`, `region`, `country`, `notes`, `lat`, `lng`, `status`

Example `id`: `2026-05-01-sf-ca`

Recommended `status` values:

- `planned`
- `tentative`
- `confirmed`
- `past`

## Google Sheet publishing

1. Move the itinerary into a Google Sheet with the columns above.
2. Use `File -> Share -> Publish to web`.
3. Publish the itinerary tab as CSV.
4. Copy the published CSV URL.
5. In [src/app.js](/Users/rishi/Projects/amrinerary/src/app.js), set `sheetCsvUrl` to that published URL.
6. Optionally set `commentBoxProjectId` to your CommentBox project ID.

If you prefer JSON, you can point `sheetJsonUrl` at a pre-converted JSON endpoint instead.

## CommentBox

CommentBox is loaded only when `commentBoxProjectId` is present. Each stop thread uses the stop `id` as its stable key.

## Cloudflare Pages

1. Push this directory to a git repo.
2. In Cloudflare Pages, create a new project from that repo.
3. Use the root directory as the project root.
4. Leave build command blank.
5. Leave output directory blank or set it to `/`.
6. Deploy and keep the resulting `*.pages.dev` URL behind the existing short link.

Reference docs:

- https://developers.cloudflare.com/pages/
- https://commentbox.io/docs/

## TDD workflow

The shared itinerary logic is covered with Node's built-in test runner.

```sh
npm test
```

Current tests verify:

- row normalization
- location search
- timeline month grouping
- calendar month/day shaping
- current/upcoming highlight derivation

## Import helper

If the current itinerary still lives in a doc-like plain text list, convert it into starter CSV:

```sh
node scripts/doc-to-sheet.mjs input.txt
```

The helper expects lines like:

```text
2026-05-01 to 2026-05-07 | SF | San Francisco | CA | USA | Friends and dinners | 37.7749 | -122.4194 | confirmed
```

It writes CSV to stdout, ready to paste into Google Sheets.
