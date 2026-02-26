import L from 'leaflet';

let map;
let selectedMarkerElement = null;
let closestTideMarker = null;

export function initMap() {
  map = L.map('map', {
    attributionControl: false,
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    dragging: false,
    center: [50.68847, -1.3034],
    zoom: 10,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    detectRetina: true,
  }).addTo(map);

  return map;
}

export function createMarkers(beaches, onBeachSelected) {
  beaches.forEach((beach) => {
    const icon = L.divIcon({ className: 'custom-marker', iconSize: [12, 12] });
    const marker = L.marker(beach.coords, { icon }).addTo(map);

    const handleSelect = () => {
      const el = marker._icon;
      if (!el) return;

      if (selectedMarkerElement) {
        selectedMarkerElement.classList.remove('selected-marker');
      }
      el.classList.add('selected-marker');
      selectedMarkerElement = el;
      onBeachSelected(beach);
    };

    marker.on('click', handleSelect);

    marker.on('add', () => {
      const el = marker._icon;
      if (el) {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `Select ${beach.name} beach`);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect();
          }
        });
      }
    });

    if (beach.name === 'Sandown') {
      setTimeout(handleSelect, 0);
    }
  });
}

export function showTideStationMarker(coords) {
  if (closestTideMarker) map.removeLayer(closestTideMarker);

  closestTideMarker = L.marker(coords, {
    icon: L.divIcon({
      className: 'tide-station-marker',
      html: '<div class="diamond-marker"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    }),
  }).addTo(map);

  closestTideMarker.setZIndexOffset(-1000);
}
