# Lookout OS Architectural Rules & Guidelines

## 1. Core Principles
- **Zero Frameworks / Zero Build Step**: Lookout OS is built strictly with vanilla HTML5, CSS3, and JavaScript (ES modules / vanilla script). Do not introduce frameworks (React, Vue, etc.) or bundlers (Vite, Webpack) unless explicitly instructed.
- **Self-Contained & Offline-First**: All assets, icons, fonts, and media must resolve locally. Avoid external CDNs or network fetches at runtime.
- **Liquid Glass Aesthetic**: The OS implements an optical lensing "Liquid Glass" design system using CSS backdrop filters, specular inner-rim highlights, realistic drop-shadows, and smooth spring-interpolated transitions.

## 2. Window Management Conventions
Every window in Lookout OS follows an exact element ID naming contract managed by `initializeWindow(id)` in `script.js`:

| Element | ID Pattern | Description |
| :--- | :--- | :--- |
| Window Container | `#${id}` | The `.window` container element |
| Drag Header | `#${id}header` | The drag handle triggering position moves |
| Close Button | `#${id}close` | Button hiding the window |
| Desktop / Dock Icon | `#${id}Icon` | Icon toggling window open/focus state |

### Rules for Adding New Apps
1. Declare the window markup in `index.html` with class `window` and ID `#<appName>`.
2. Ensure it includes `#<appName>header` and `#<appName>close`.
3. Add the corresponding icon in the dock / launcher `#<appName>Icon`.
4. Register the window in `script.js` with `initializeWindow("<appName>")`.
5. Implement state isolation: each app's logic must avoid polluting global namespace or conflicting with other apps.

## 3. Liquid Glass CSS Variable System
Always reuse the standardized CSS custom properties defined in `style.css`:
- `--os-glass-blur`: 16px
- `--os-glass-saturate`: 140% (160% in Night Mode)
- `--os-glass-brightness`: 1.1 (1.25 in Night Mode)
- `--os-glass-bg`: Transparent tint backdrop
- `--os-glass-border`: Outer specular border
- `--os-glass-inner-rim`: Dual-layer inset highlight
- `--os-glass-shadow-sm`, `--os-glass-shadow-md`, `--os-glass-shadow-lg`: Depth shadows
- `--os-glass-spring`: `300ms cubic-bezier(0.16, 1, 0.3, 1)`

## 4. Control Center & System Settings
- Control Center settings are stored in `localStorage` under keys `lookout_theme`, `lookout_night`, and `lookout_brightness`.
- Night mode is toggled via `body.night`.
- Brightness uses a viewport overlay element `#brightnessOverlay`.
- System Bar / Pill Dock updates live time, status indicators, and app launcher.

## 5. Testing & Verification
- Use `.verify/cc-checks.mjs` for Control Center validation.
- Use `.verify/terminal-edges.mjs` for Terminal edge cases.
- Use `.verify/check.mjs 5` for Parts 1-5 verification.
