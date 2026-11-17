# make.fun frontend

[![make.fun bounty](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/calebakinjomo/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/calebakinjomo/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A fast, fully working frontend for [make.fun](https://make.fun), built for the
"Build the best make.fun frontend" bounty. It reads make.fun's public API
alone — no sign-in, no writes — and shows all four surfaces, each by link and
by its own URL:

- `#/` — the bounty board: every live bounty with its live pot, entry fee,
  time left and entries, plus a client-side filter.
- `#/bounty/<slug>` — a bounty's page: summary, description and rules, the
  rewards table with the live pot, dates, status and latest entries.
- `#/bounty/<slug>/leaderboard` — that bounty's leaderboard, with the rank
  key and tiebreak shown and 50 rows a page.
- `#/u/<handle>` — an account's public profile: avatar, bio, record stats
  and entries table. Reachable from the header handle lookup too.

Performance: API answers are cached in memory and revalidated with ETags
(the API's ETags are bound to the minute), long lists are paginated, views
update without rebuilding the page, and time-left labels refresh in place.
The first load is three small files (index.html, one stylesheet, one tiny
boot module); the views load later through `import()`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## Screenshots

`screenshots/` holds three JPEGs of the running app on live make.fun data,
taken in desktop Chrome at 1280×800 (see `shots.json` for which route each
one shows): the bounty board, a bounty page, and a leaderboard. The first by
name is the cover.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.
