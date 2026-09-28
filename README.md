# WebOs

A browser desktop OS I built with plain HTML, CSS and JavaScript. No frameworks or npm packages, just vanilla web files.

Started this from the Hack Club webOS jam and then kept expanding it with my own stuff (window manager, dock, terminal, and some mini apps).

## How to run it

Just open `index.html` in your browser.

Or run a local server:
```
python -m http.server 8000
```
and go to `http://localhost:8000`.

## What's included

- Draggable windows that you can move around and close
- Top bar with a live clock and a control center (light/night mode, accent colors)
- Dock at the bottom to open apps
- Lock screen on start (press space or click unlock)
- Terminal with simple commands (`help`, `ls`, `cat`, `whoami`, `open <app>`, `theme`, `clear`)
- Mini apps:
  - Calculator
  - 2048 game
  - Notes (saves in localStorage)
  - Crate (vinyl record player)
  - Weather
  - Music player
  - Projects (links to my real GitHub repos)

Built with vanilla HTML, CSS, and JS.
