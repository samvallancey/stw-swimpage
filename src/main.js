import 'leaflet/dist/leaflet.css';
import './styles/main.css';

import state from './state.js';
import { findClosestTideStation, debounce } from './utils.js';
import { initMap, createMarkers, showTideStationMarker, setMapTheme } from './map.js';
import {
  fetchTideData,
  generateDateButtons,
  updateTideDataForDate,
  drawTideChart,
} from './tide.js';
import { updateWeatherForBeach } from './weather.js';
import { updateWaveHeightForBeach } from './waves.js';
import {
  initCollapsibleTiles,
  initFavourites,
  initThemeToggle,
  updateFavouriteButton,
  updateBeachDescriptionBox,
  initFavouritesBar,
  initBeachDetailsToggle,
} from './ui.js';
import beachConfig from './data/beaches.json';

const { beaches, tideStations, descriptions } = beachConfig;

function handleBeachSelected(beach) {
  state.selectedBeach = beach;
  state.closestTideStation = findClosestTideStation(beach.coords, tideStations);

  document.getElementById('selected-beach-name').textContent = beach.name;

  const stationCoords = tideStations[state.closestTideStation];
  if (stationCoords) {
    showTideStationMarker(stationCoords);
  }

  updateFavouriteButton(beach.name);
  updateTideDataForDate();
  drawTideChart();
  updateBeachDescriptionBox(descriptions);

  updateWeatherForBeach(beach).then(() => updateBeachDescriptionBox(descriptions));
  updateWaveHeightForBeach(beach).then(() => updateBeachDescriptionBox(descriptions));
}

const debouncedHandleBeachSelected = debounce(handleBeachSelected, 150);

function handleDateSelected() {
  updateTideDataForDate();
  drawTideChart();
}

async function init() {
  initMap();
  initThemeToggle(setMapTheme);
  initCollapsibleTiles();
  initFavourites();
  initBeachDetailsToggle();

  try {
    await fetchTideData();
  } catch (_err) {
    document.getElementById('tide-box').innerHTML =
      '<div class="loading-skeleton">Failed to load tide data. Please refresh the page.</div>';
  }

  generateDateButtons(handleDateSelected);
  createMarkers(beaches, debouncedHandleBeachSelected);
  initFavouritesBar(beaches, debouncedHandleBeachSelected);

  window.addEventListener('resize', debounce(drawTideChart, 250));
}

document.addEventListener('DOMContentLoaded', init);
