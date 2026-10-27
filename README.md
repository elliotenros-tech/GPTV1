# Parkdale Athletics

A responsive athletics hub for Parkdale Collegiate Institute, with intramural schedules, tryouts, and recent scores. Includes a collapsible sidebar and sport filters.

## Run

Requires Node.js 22 or later (Node.js LTS recommended).

```sh
npm ci
npm run dev
```

The server listens on port 3000, or the `PORT` environment variable. Run `npm test` for parser, date-window and refresh/fallback tests, plus JavaScript syntax checks.

## Content

Intramural schedules, tryouts, and teacher names remain illustrative sample data, clearly labeled in the app. Update the arrays in `public/app.js` with verified school information before public use.

## TDSB scores and upcoming games

The third tab requests `/api/games`. The server reads the Parkdale-filtered [TDSB schedule](https://www.tdsb.on.ca/sports/sportsresults/Mode/Schedule/ShowAll/1/EducationUnitId/5550), parses its HTML and caches successful reads for 15 minutes. Failed reads are retried after 5 minutes; simultaneous requests share a refresh. The page checks every 15 minutes while the games tab is open, or when you click Refresh games. Refresh respects the server cache.

Only Parkdale (school ID 5550) games are included. Reported scores cover today back through 14 calendar days ago, newest first. Upcoming games without scores cover the remainder of today through 14 days ahead, soonest first. All date windows and same-day times use America/Toronto, including daylight saving changes. A past game without a score is counted as unreported, never invented as a zero or shown as upcoming. Both teams must have numeric scores for a result to be displayed.

If live access fails, the app uses the parsed user-provided TDSB snapshot in `data/tdsb-snapshot.json`, or the last successful live response in memory. The interface identifies its source, import/retrieval time and refresh failures. Snapshot import time is not the original page retrieval time, which is unknown. Date filtering still advances with the actual date, so an old snapshot eventually shows no current games. The app never substitutes demonstration scores.

For reproducible offline checks, run `TDSB_MODE=snapshot npm run dev` (macOS/Linux). No network request is made in that mode. The fixture in `test/fixtures` contains only the scoreboard fragment, not hidden form state or scripts from the uploaded page.

Live retrieval still needs verification on a machine that can reach TDSB. The cloud workspace denied access during development. Changing source markup causes a refresh error and fallback, rather than silently showing an empty live schedule. Before deploying a public scraper, verify the source's current automated-access rules. The server respects inherited HTTP proxy settings and certificate trust.

The orange and charcoal visual identity uses a custom typographic P mark. The supplied panther logo has not been embedded as an image asset. DM Sans loads from Google Fonts, with Arial as an offline fallback.
