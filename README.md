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

Initial intramural schedules and tryouts are illustrative sample data. Each sample event is marked individually. Replace or delete these using the editor before public use. Editing an event marks that event as school-provided; untouched sample events keep their labels. Intramurals contain no teacher field; tryouts have a required level and optional teacher.

## Edit intramurals and tryouts

1. Start the app with `npm run dev`.
2. Open the app and click **Edit schedules** in the footer (or visit `/manage`).
3. Copy the **Editor access code** shown in Terminal into the unlock form. This code is generated at startup and changes when the app restarts. It is kept in memory in the editor page, not in browser storage. Reloading the page locks the editor.
4. Choose Intramurals or Tryouts. Fill out the sport, date, start and end times, and location. Intramurals have optional format/grades; tryouts have level and optional teacher. Click **Save event**. Use Edit or Delete beside an existing event to change it. Deletion asks for confirmation.

Changes are saved on the server and survive restarts. On macOS they live at `~/Library/Application Support/ParkdaleAthletics/schedules.json`, outside the downloaded project, so fresh downloads retain your edits. On other platforms the default is `data/schedules.local.json` (ignored by Git). Back up this file to preserve your schedules. The optional `SCHEDULES_FILE` variable overrides the storage location. Public schedule pages reload after returning to the browser tab and every minute while viewing schedules; a normal refresh also retrieves saved changes.

To reuse an editor code across restarts, configure `ATHLETICS_EDITOR_CODE` securely in your hosting environment (at least 12 characters). Do not commit codes. Codes authorize all schedule edits, so share them only with editors. For public hosting, use HTTPS and persistent disk storage for `SCHEDULES_FILE`; this local app does not deploy or sync edits to GitHub. A separate deployment has its own schedule file unless shared persistent storage is configured. Concurrent edits from stale windows are rejected; reload the list before saving again. An unreadable/corrupt save produces an error rather than silently resetting the schedule.

## TDSB scores and upcoming games

The third tab requests `/api/games`. The server reads the Parkdale-filtered [TDSB schedule](https://www.tdsb.on.ca/sports/sportsresults/Mode/Schedule/ShowAll/1/EducationUnitId/5550), parses its HTML and caches successful reads for 15 minutes. Failed reads are retried after 5 minutes; simultaneous requests share a refresh. The page checks every 15 minutes while the games tab is open, or when you click Refresh games. Refresh respects the server cache.

Only Parkdale (school ID 5550) games are included. Reported scores cover today back through 14 calendar days ago, newest first. Upcoming games without scores cover the remainder of today through 14 days ahead, soonest first. All date windows and same-day times use America/Toronto, including daylight saving changes. A past game without a score is counted as unreported, never invented as a zero or shown as upcoming. Both teams must have numeric scores for a result to be displayed.

If live access fails, the app uses the parsed user-provided TDSB snapshot in `data/tdsb-snapshot.json`, or the last successful live response in memory. The interface identifies its source, import/retrieval time and refresh failures. Snapshot import time is not the original page retrieval time, which is unknown. Date filtering still advances with the actual date, so an old snapshot eventually shows no current games. The app never substitutes demonstration scores.

For reproducible offline checks, run `TDSB_MODE=snapshot npm run dev` (macOS/Linux). No network request is made in that mode. The fixture in `test/fixtures` contains only the scoreboard fragment, not hidden form state or scripts from the uploaded page.

Live retrieval still needs verification on a machine that can reach TDSB. The cloud workspace denied access during development. Changing source markup causes a refresh error and fallback, rather than silently showing an empty live schedule. Before deploying a public scraper, verify the source's current automated-access rules. The server respects inherited HTTP proxy settings and certificate trust.

The red and black banner uses a panther background adapted from the supplied reference image, saved locally in `public/panther-background.png`. Barlow and Barlow Condensed load from Google Fonts, with Arial as an offline fallback. The intramurals navigation uses a person icon drawn with inline SVG. Navigation and content use concise labels; sample-data and saved-source notices remain visible.
