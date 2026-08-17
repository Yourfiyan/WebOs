# Lookout OS

A personal operating system that runs in a browser tab. Hand-written HTML, CSS
and JavaScript — no frameworks, no build step, no dependencies. Open
`index.html` and it runs.

Built by following the [Hack Club webOS Jam](https://jams.hackclub.com/batch/webOS)
(Parts 1–5) as a method, with its own design, apps and content.

```
index.html    structure and content
style.css     every reusable visual rule
script.js     the window manager and the apps
lookout.png   wallpaper
crate.svg     Crate app icon
terminal.svg  Terminal app icon
covers/       album art for the Crate app
```

Cover art in `covers/` was fetched once from the [iTunes Search
API](https://performance-partners.apple.com/search-api) — free, no key, no auth —
and saved locally, so the OS needs no network at runtime.

## Running it

Either open `index.html` directly, or serve the folder so the assets resolve
cleanly:

```sh
python -m http.server 8000
# then visit http://127.0.0.1:8000
```

## What's in it

**The desktop** — a wallpaper, a translucent top bar with a live clock, and app
icons down the left. One click selects an icon, a second click (or a
double-click) opens it.

**Windows** — draggable by their header only, closable by the dot, and they rise
to the front when clicked. Every window is created the same way:

```js
initializeWindow("crate");   // wires drag, close, focus, and its desktop icon
```

That relies on an id convention, so a new app needs no new wiring code:

| Element      | id                |
| ------------ | ----------------- |
| window       | `#crate`          |
| drag handle  | `#crateheader`    |
| close button | `#crateclose`     |
| desktop icon | `#crateIcon`      |

**Crate** — records worth returning to. The shelf and the detail panel are both
rendered from the `crateRecords` array in `script.js`; adding a record means
adding an object, nothing else.

**Terminal** — a working shell. `help`, `whoami`, `ls`, `cat <file>`, `apps`,
`open <app>`, `date`, `echo`, `clear`. Arrow keys walk the command history, and
`open` can launch the other apps, so the Terminal drives the OS rather than
sitting beside it.

## Making it yours

The content is deliberately easy to find and replace:

- `crateRecords` in `script.js` — the records, their notes and cover colours
- `terminalFiles` in `script.js` — what `ls` and `cat` print
- the `#welcome` window in `index.html` — the intro text
- the palette lives at the top of `style.css`

## Verification

The checks are local-only and ignored by git. They boot the real page in jsdom
and drive it in a real browser, asserting the behaviour each tutorial part asks
for — drags move windows, close/open toggles them, clicking a sleeve swaps the
panel, the Terminal's commands do what they claim.

```sh
cd .verify && npm install          # jsdom + playwright-core
node .verify/check.mjs 5           # behaviour, parts 1..5
node .verify/terminal-edges.mjs    # Terminal edge cases
node .verify/render.mjs            # real-browser render + screenshots
```
