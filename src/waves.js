import state from './state.js';
import { fetchWithRetry } from './utils.js';

const CCO_API_KEY = '8f563c2a34086b0f41340a3b1526ea4f';

// Map beaches to CCO wave sensors. Most south / east facing beaches use
// Sandown Bay (80); Colwell, Totland and Gurnard stay on Lymington (87).
const BEACH_SENSOR_MAP = {
  Sandown: 80,
  Shanklin: 80,
  Ventnor: 80,
  'Compton Bay': 80,
  'East Cowes': 80,
  'Osborne Bay': 80,
  'Ryde Beach': 80,
  'Appley Beach': 80,
  'Seagrove Bay': 80,
  'Sandown Bay': 80,
};

const DEFAULT_SENSOR_ID = 87; // Lymington

export async function updateWaveHeightForBeach(beach) {
  if (!beach) return;

  const sensorId = BEACH_SENSOR_MAP[beach.name] ?? DEFAULT_SENSOR_ID;

  try {
    const url = `https://coastalmonitoring.org/observations/waves/latest?key=${CCO_API_KEY}&sensor=${sensorId}`;
    const response = await fetchWithRetry(url);
    const xmlText = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const hsNode = xmlDoc.querySelector('ms\\:hs, hs');
    const hmaxNode = xmlDoc.querySelector('ms\\:hmax, hmax');
    const tpNode = xmlDoc.querySelector('ms\\:tp, tp');
    const tzNode = xmlDoc.querySelector('ms\\:tz, tz');
    const pdirNode = xmlDoc.querySelector('ms\\:pdir, pdir');
    const spreadNode = xmlDoc.querySelector('ms\\:spread, spread');
    const teNode = xmlDoc.querySelector('ms\\:te, te');
    const sstNode = xmlDoc.querySelector('ms\\:sst, sst');
    const powerNode = xmlDoc.querySelector('ms\\:power, power');

    const hs = parseFloat(hsNode?.textContent ?? '0') || 0;
    const hmax = parseFloat(hmaxNode?.textContent ?? '0') || 0;
    const tp = parseFloat(tpNode?.textContent ?? '0') || 0;
    const tz = parseFloat(tzNode?.textContent ?? '0') || 0;
    const pdir = parseFloat(pdirNode?.textContent ?? '0') || 0;
    const spread = parseFloat(spreadNode?.textContent ?? '0') || 0;
    const te = parseFloat(teNode?.textContent ?? '0') || 0;
    const sst = parseFloat(sstNode?.textContent ?? '0') || 0;
    const power = parseFloat(powerNode?.textContent ?? '') || null; // Wave power kW/m (CCO-calculated)

    state.currentWaveHeight = hs;
    state.currentSeaTemperature = sst;
    state.currentWavePeriod = tp || tz || 0;
    state.currentWavePower = power;

    updateWaveSVG(hs, tp);

    const waveHeightEl = document.getElementById('wave-height');
    const waveTpEl = document.getElementById('wave-tp');

    if (waveHeightEl) waveHeightEl.textContent = `${hs.toFixed(2)} m`;
    if (waveTpEl) waveTpEl.textContent = tp ? `${tp.toFixed(1)} s` : '--';

    const fillPercent = Math.min(hs / 2.5, 1) * 100;
    const fillEl = document.getElementById('wave-fill');
    if (fillEl) fillEl.style.height = `${fillPercent}%`;

    let desc = 'Calm';
    if (hs > 1.2) desc = 'Rough waves 🌊';
    else if (hs > 0.6) desc = 'Moderate surf';
    else if (hs > 0.3) desc = 'Gentle waves';

    const descEl = document.getElementById('wave-description');
    if (descEl) descEl.textContent = desc;

    // Update sea temperature card
    const seaTempEl = document.getElementById('sea-temp-value');
    if (seaTempEl && sst) {
      seaTempEl.textContent = `${sst.toFixed(1)} °C`;
    }

    // Populate details panel
    const detailsEl = document.getElementById('wave-details');
    const detailsButton = document.getElementById('wave-details-button');
    const backButton = document.getElementById('wave-back-button');
    const waveBox = document.getElementById('wave-box');

    if (detailsEl && detailsButton && backButton && waveBox) {
      detailsEl.innerHTML = `
        <div class="wave-details-grid">
          <div class="wave-detail">
            <span class="wave-detail-label">Hmax</span>
            <span class="wave-detail-value">${hmax ? hmax.toFixed(2) + ' m' : '--'}</span>
          </div>
          <div class="wave-detail">
            <span class="wave-detail-label">Tz</span>
            <span class="wave-detail-value">${tz ? tz.toFixed(1) + ' s' : '--'}</span>
          </div>
          <div class="wave-detail">
            <span class="wave-detail-label">Dir</span>
            <span class="wave-detail-value">${pdir ? Math.round(pdir) + '°' : '--'}</span>
          </div>
          <div class="wave-detail">
            <span class="wave-detail-label">Spread</span>
            <span class="wave-detail-value">${spread ? Math.round(spread) + '°' : '--'}</span>
          </div>
          <div class="wave-detail">
            <span class="wave-detail-label">Te</span>
            <span class="wave-detail-value">${te ? te.toFixed(1) + ' s' : '--'}</span>
          </div>
          <div class="wave-detail">
            <span class="wave-detail-label">SST</span>
            <span class="wave-detail-value">${sst ? sst.toFixed(1) + ' °C' : '--'}</span>
          </div>
          <div class="wave-detail">
            <span class="wave-detail-label">Power</span>
            <span class="wave-detail-value">${power != null ? power.toFixed(1) + ' kW/m' : '--'}</span>
          </div>
        </div>
      `;

      if (!waveBox.dataset.waveDetailsInit) {
        waveBox.dataset.waveDetailsInit = 'true';
        waveBox.classList.add('wave-details-enabled');

        const toggleFlip = (evt) => {
          const header = waveBox.querySelector('.card-header');
          if (header && header.contains(evt.target)) {
            return;
          }

          const flipped = waveBox.classList.toggle('is-flipped');
          detailsButton.setAttribute('aria-pressed', flipped ? 'true' : 'false');
        };

        waveBox.addEventListener('click', toggleFlip);
        detailsButton.addEventListener('click', (evt) => {
          evt.stopPropagation();
          toggleFlip(evt);
        });
        backButton.addEventListener('click', (evt) => {
          evt.stopPropagation();
          toggleFlip(evt);
        });
      }
    }
  } catch (_err) {
    state.currentWavePower = null;
    const descEl = document.getElementById('wave-description');
    const waveTpEl = document.getElementById('wave-tp');

    if (descEl) descEl.textContent = 'Unavailable';
    if (waveTpEl) waveTpEl.textContent = '--';
  }
}

function updateWaveSVG(waveHeight, wavePeriod) {
  const amplitude = Math.max(2.2, Math.min(waveHeight * 6, 8));
  const baseY = 3.5;
  const viewBoxHeight = 28;
  const fillColor = '#778ba5';

  const svg = `
    <svg viewBox="0 0 120 ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 ${baseY}
        C 16 ${Math.max(0.2, baseY - amplitude)}, 44 ${baseY + amplitude * 0.45}, 60 ${baseY}
        C 76 ${Math.max(0.2, baseY - amplitude)}, 104 ${baseY + amplitude * 0.45}, 120 ${baseY}
        V${viewBoxHeight} H0 Z"
        fill="${fillColor}" fill-opacity="1"/>
    </svg>`;

  const encodedSVG = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const waveFill = document.getElementById('wave-fill');
  if (waveFill) {
    waveFill.style.setProperty('--wave-svg', `url("${encodedSVG}")`);

    const effectivePeriod = wavePeriod && isFinite(wavePeriod) ? wavePeriod : 6;
    const baseDuration = Math.max(3, Math.min(effectivePeriod * 1.1, 14));

    waveFill.style.setProperty('--wave-speed-1', `${baseDuration}s`);
    waveFill.style.setProperty('--wave-speed-2', `${(baseDuration * 1.6).toFixed(1)}s`);
  }
}
