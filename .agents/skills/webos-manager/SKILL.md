---
name: webos-manager
description: Manage, test, run, and develop Lookout OS components, apps, windows, and verification suites.
---

# Lookout OS Management Skill

This skill guides the Antigravity agent when maintaining, enhancing, or debugging Lookout OS.

## 1. Development Server
To serve Lookout OS locally:
```powershell
python -m http.server 8000
```
Open `http://localhost:8000` to interact with the OS in a browser.

## 2. Test Verification Harness
The project includes verification scripts in the `.verify/` folder:
- **Control Center Tests**:
  ```powershell
  node .verify/cc-checks.mjs
  ```
- **Terminal Edge Cases**:
  ```powershell
  node .verify/terminal-edges.mjs
  ```
- **Tutorial Behavior Checks**:
  ```powershell
  node .verify/check.mjs 5
  ```

## 3. Window & App Conventions
When modifying or adding apps:
1. Ensure the markup structure in `index.html` adheres to the `#<id>`, `#<id>header`, `#<id>close` convention.
2. Initialize with `initializeWindow("<id>")` in `script.js`.
3. Adhere to the Liquid Glass material system tokens in `style.css`.
