# AGENTS.md

## Cursor Cloud specific instructions

This is "Swim The Wight" — an interactive beach conditions dashboard for the Isle of Wight, built with vanilla JS + Vite.

### Running the dev server

```bash
npm run dev
```

Serves at `http://localhost:8080`. Vite handles hot module reload.

### Available commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint on `src/` |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run Playwright smoke tests (requires `npx playwright install chromium` first) |

### Project structure

- `src/main.js` — Entry point, orchestrates all modules
- `src/map.js` — Leaflet map initialization and marker management
- `src/tide.js` — Tide data fetching, predictions (Rule of Twelfths), D3 chart
- `src/weather.js` — Open-Meteo weather + UV API
- `src/waves.js` — Open-Meteo marine wave height API
- `src/ui.js` — Beach description panel, favourites (localStorage), toggle
- `src/state.js` — Shared application state
- `src/utils.js` — Helpers (haversine, debounce, fetchWithRetry)
- `src/data/beaches.json` — Beach coordinates, tide stations, descriptions
- `src/styles/main.css` — All styles

### Key details

- All data (tides, weather, waves) comes from external APIs. Internet connectivity is required.
- The tide API (`gemcxasoc2.execute-api.eu-north-1.amazonaws.com`) is the only API that might require special access; weather and marine APIs are public.
- Leaflet and D3 are installed via npm (not CDN). Map tiles still load from CartoDB CDN.
- There are no backend services to run — this is a purely client-side application.
