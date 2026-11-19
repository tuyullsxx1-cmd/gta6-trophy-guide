# Leonida Trophy Guide — GTA VI (PS5)

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/tuyullsxx1-cmd/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/tuyullsxx1-cmd/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all **55 trophies** of Grand Theft Auto VI on PlayStation 5 (1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden; 0 online). Built for the [make.fun GTA 6 Trophy Guide bounty](https://make.fun/c/gta6-trophy-guide-01).

## What it is

- **Tracker** — a checklist of all 55 trophies with official name, description and grade, saved in the browser (localStorage), with export and import of progress as JSON.
- **Filters** — by kind (story, missable, collectibles, activities, side & crime, platinum & 100%) and by grade, plus earned/unearned and a text search. The online filter shows a note: the list has no online trophies.
- **Spoiler setting** — hides the names and descriptions of the 12 story trophies until you earn them.
- **Roadmap** — a 3-step road to the platinum (story, 100% checklist, cleanup), built from the official trophy descriptions.
- **Missables** — exactly one trophy is flagged potentially missable (Positive Mental Attitude, Chapter 1), with the rest confirmed not missable.
- **A guide to every trophy** — written in its own words for this entry, each citing its sources (PowerPyx, Exophase, PSNProfiles, Push Square, Planet GTA 6, Insider Gaming). Where no published guide confirms a method yet (4 trophies), the guide says so instead of inventing one.
- **Strategies & tips** — 12 essential strategies and 8 essential tips.
- **About & Sources** — release date (19 November 2026), how the guide was made, and the warning that no trophy information is verifiable yet because the game has only just released and Rockstar has published no official trophy list.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only — no build step, no network at runtime. Every file the app loads lives under `app/`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Layout

- `app/index.html` — the page shell
- `app/style.css` — the Vice sunset look (CSS only, no images or webfonts)
- `app/app.js` — boot and rendering
- `app/store.js` — localStorage progress, export / import
- `app/data/trophies.json` — the 55 trophies: name, description, grade, kind, missable flag, hidden flag, target count, guide, sources
- `app/data/guide.json` — roadmap, missables, strategies, tips, sources, about
- `screenshots/` — 4 screenshots of the guide running in Chrome
- `main.ts` — the hand-in program (Node 22, standard library only)
- `vendor/makefun-frontend.ts` — the kit's library, unchanged

## License

MIT — see `LICENSE`. Unofficial fan guide; not published by, endorsed by, or affiliated with Rockstar Games. No Rockstar logo or artwork is used.
