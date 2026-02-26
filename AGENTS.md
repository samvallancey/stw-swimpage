# AGENTS.md

## Cursor Cloud specific instructions

This is a static web application ("Swim The Wight") — a single `index.html` file with inline CSS/JS. No build system, no package manager, no backend.

### Running the dev server

```bash
cd /workspace && python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html` in a browser.

### Key details

- All JS libraries (Leaflet, D3.js) are loaded from CDNs at runtime — no local install needed.
- All data (tides, weather, waves) comes from external APIs (AWS API Gateway, Open-Meteo). Internet connectivity is required.
- `index.html` is the main application (~1900 lines, all inline).
- `script.js` is an older/simpler version of the map script (not used by `index.html`).
- `tidestationcodes.txt` is a reference file mapping tide station names to codes.
- There are no automated tests, no linter config, and no build step.
