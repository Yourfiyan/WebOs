# Lookout OS — Antigravity Agent Guidelines

Welcome to **Lookout OS**, an in-browser operating system built with vanilla HTML, CSS, and JavaScript.

## Workspace Overview
- **Core Technology**: Pure Vanilla HTML5, CSS3, ES6+ JavaScript. No build tools, no frameworks, no runtime npm dependencies.
- **Entry Points**:
  - `index.html`: Desktop structure, dock, system menus, lock screen, windows, and apps.
  - `style.css`: Liquid Glass design system, theme definitions, window styles, desktop and dock animations.
  - `script.js`: Window manager, event dispatch, system state, dock interactions, and app implementations.
- **Launch Configurations**: Available in `.vscode/launch.json` and `.vscode/tasks.json` (Python HTTP server on port 8000).

## Design System: Liquid Glass Material
The visual language is optical Liquid Glass:
- Multi-layered translucency with backdrop blur (`--os-glass-blur: 16px`).
- Specular inner rims (`--os-glass-inner-rim`) and subtle borders (`--os-glass-border`).
- Spring physics curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
- Two visual modes: Day/Dusk and Night (`body.night`).
- Dynamic theme swatches (accent colors) stored in `localStorage`.

## Window Manager System Contract
All windows must satisfy the ID naming convention wired by `initializeWindow(id)` in `script.js`:
- Container: `#<id>` (class `.window`)
- Header/Drag surface: `#<id>header` (class `.windowheader`)
- Close button: `#<id>close` (class `.closebutton`)
- Launcher / Dock Icon: `#<id>Icon` (class `.dock-icon` or desktop equivalent)

## App Suite & Repository State
1. **Active Core Apps**:
   - `welcome`: Introduction and getting started.
   - `crate`: Interactive vinyl shelf with spinning record animation and cover inspector.
   - `terminal`: Full interactive CLI shell supporting commands (`help`, `whoami`, `ls`, `cat`, `apps`, `open`, `theme`, `night`, `brightness`, `clear`, `date`, `echo`).
2. **Extended Apps**:
   - Worktree `worktrees/functional-apps` contains fully functional implementations for:
     - Calculator
     - Projects (GitHub repo integration)
     - Weather
     - 2048 Game
     - Music Player
     - Notes (with localStorage persistence)
   - Branch `main` currently has UI shells with dock and lockscreen widgets.

## Verification Suite
- Control Center checks: `node .verify/cc-checks.mjs`
- Terminal edge cases: `node .verify/terminal-edges.mjs`
- Full Part 1-5 suite: `node .verify/check.mjs 5`

## Development Commands
```powershell
# Start local web server
python -m http.server 8000

# Run Control Center test suite
node .verify/cc-checks.mjs
```
