import state from './state.js';
import { fetchWithRetry } from './utils.js';

export async function updateWaveHeightForBeach(beach) {
  if (!beach?.coords) return;

  const lat = beach.coords[0];
  const lon = beach.coords[1];

  try {
    const response = await fetchWithRetry(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height&timezone=auto`
    );
    const data = await response.json();

    const now = new Date();
    let closestIndex = 0;
    let minDiff = Infinity;

    data.hourly.time.forEach((t, i) => {
      const diff = Math.abs(new Date(t) - now);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });

    const waveHeight = data.hourly.wave_height?.[closestIndex] ?? 0;
    state.currentWaveHeight = parseFloat(waveHeight) || 0;

    updateWaveSVG(waveHeight);

    document.getElementById('wave-height').textContent =
      `${parseFloat(waveHeight).toFixed(1)} m`;

    const fillPercent = Math.min(waveHeight / 2.5, 1) * 100;
    document.getElementById('wave-fill').style.height = `${fillPercent}%`;

    let desc = 'Calm';
    if (waveHeight > 1.2) desc = 'Rough waves 🌊';
    else if (waveHeight > 0.6) desc = 'Moderate surf';
    else if (waveHeight > 0.3) desc = 'Gentle waves';

    document.getElementById('wave-description').textContent = desc;
  } catch (_err) {
    document.getElementById('wave-description').textContent = 'Unavailable';
  }
}

function updateWaveSVG(waveHeight) {
  const peak = Math.min(waveHeight * 20, 20);
  const midY = 10;
  const viewBoxHeight = 40;
  const fillColor = '#1e3a8a';

  const svg = `
    <svg viewBox="0 0 120 ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 ${midY} Q 30 ${midY - peak}, 60 ${midY} T 120 ${midY} V${viewBoxHeight} H0 Z"
        fill="${fillColor}" fill-opacity="1"/>
    </svg>`;

  const encodedSVG = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const waveFill = document.getElementById('wave-fill');
  if (waveFill) {
    waveFill.style.setProperty('--wave-svg', `url("${encodedSVG}")`);
  }
}
