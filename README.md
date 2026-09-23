# Specter Development

A simple, single-page tracker for developing Car No. 1 and Specter's supporting
tooling, processes, and tasks. No build step, no backend — just HTML, CSS, and
vanilla JS.

## Viewing it

Open `index.html` directly in a browser, or serve the folder locally:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Updating content

All content lives in **`data.js`**. Edit the arrays there and refresh the
page — no other file needs to change for day-to-day updates:

- `systems` — Car No. 1's major vehicle systems (chassis, powertrain, etc.)
  and their build progress.
- `tooling` — machinery/fixtures needed to build the car.
- `processes` — SOPs and workflows being developed for the company.
- `tasks` — actionable to-dos, each with an area, priority, and status.
- `log` — a dated build log / journal, newest entry first.

Status values: `not-started`, `in-progress`, `blocked`, `complete` (tasks use
`todo`, `in-progress`, `done` instead). Priority values: `low`, `medium`,
`high`.

Commit and push changes to keep a history of the project's progress over
time.

## Deploying

This is a static site, so it can be hosted for free on GitHub Pages: in the
repo settings, enable Pages for this branch/root, and the site will be
published automatically.
