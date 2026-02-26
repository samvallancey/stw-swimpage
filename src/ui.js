import state from './state.js';
import { generatePredictions } from './tide.js';

const FAVOURITES_KEY = 'stw-favourites';

export function initToggleDescription() {
  document.getElementById('toggle-description').addEventListener('click', () => {
    const desc = document.getElementById('beach-description');
    const toggle = document.getElementById('toggle-description');
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

    desc.classList.toggle('collapsed', isExpanded);
    toggle.setAttribute('aria-expanded', String(!isExpanded));
  });
}

export function initFavourites() {
  const btn = document.getElementById('favourite-toggle');
  btn.addEventListener('click', () => {
    const beach = state.selectedBeach;
    if (!beach) return;

    const favourites = getFavourites();
    const idx = favourites.indexOf(beach.name);

    if (idx >= 0) {
      favourites.splice(idx, 1);
    } else {
      favourites.push(beach.name);
    }

    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
    updateFavouriteButton(beach.name);

    btn.classList.add('bounce');
    setTimeout(() => btn.classList.remove('bounce'), 400);
  });
}

function getFavourites() {
  try {
    return JSON.parse(localStorage.getItem(FAVOURITES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function updateFavouriteButton(beachName) {
  const btn = document.getElementById('favourite-toggle');
  const isFavourited = getFavourites().includes(beachName);

  btn.classList.toggle('favourited', isFavourited);
  btn.setAttribute('aria-pressed', String(isFavourited));
  btn.textContent = isFavourited ? '♥' : '♡';
}

export function updateBeachDescriptionBox(descriptions) {
  const beach = state.selectedBeach;
  const stationData = state.tideData[state.closestTideStation] || [];

  const mediaSlot = document.getElementById('beach-media');
  const descText = document.getElementById('beach-description-text');
  if (!mediaSlot || !descText || !beach) return;

  const beachData = descriptions[beach.name] || {};
  mediaSlot.innerHTML = '';

  if (beachData.video) {
    renderVideoMedia(mediaSlot, beachData, beach.name);
  } else if (beachData.image) {
    renderImageMedia(mediaSlot, beachData, beach.name);
  } else {
    renderEmptyMedia(mediaSlot);
  }

  renderSwimConditionText(descText, beachData, stationData);
}

function renderVideoMedia(mediaSlot, beachData, beachName) {
  if (mediaSlot._swapTimeout) {
    clearTimeout(mediaSlot._swapTimeout);
    mediaSlot._swapTimeout = null;
  }

  let imgEl = null;
  if (beachData.image) {
    imgEl = document.createElement('img');
    imgEl.src = beachData.image;
    imgEl.alt = beachName + ' photo';
    mediaSlot.appendChild(imgEl);
    requestAnimationFrame(() => imgEl.classList.add('show'));
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.background = '#0f0f0f';
    mediaSlot.appendChild(placeholder);
    requestAnimationFrame(() => placeholder.classList.add('show'));
  }

  const isEmbeddable = /youtube\.com|youtu\.be|vimeo\.com/i.test(beachData.video);
  let videoEl;

  if (isEmbeddable) {
    const url =
      beachData.video +
      (beachData.video.includes('?') ? '&' : '?') +
      'rel=0&modestbranding=1&controls=1&playsinline=1';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    iframe.title = `${beachName} beach video`;
    videoEl = iframe;
  } else {
    const vid = document.createElement('video');
    vid.src = beachData.video;
    vid.playsInline = true;
    vid.controls = true;
    videoEl = vid;
  }

  mediaSlot.appendChild(videoEl);

  const startSwap = () => {
    requestAnimationFrame(() => {
      videoEl.classList.add('show');
      if (imgEl) imgEl.classList.remove('show');
      else if (mediaSlot.firstChild && mediaSlot.firstChild !== videoEl) {
        mediaSlot.firstChild.classList.remove('show');
      }
      setTimeout(() => {
        [...mediaSlot.children].forEach((child) => {
          if (child !== videoEl && !child.classList.contains('show')) {
            child.remove();
          }
        });
      }, 600);
    });
  };

  mediaSlot._swapTimeout = setTimeout(() => {
    if (isEmbeddable) {
      startSwap();
    } else if (videoEl.tagName === 'VIDEO') {
      const fallback = setTimeout(startSwap, 800);
      videoEl.addEventListener(
        'canplay',
        () => {
          clearTimeout(fallback);
          startSwap();
        },
        { once: true }
      );
    } else {
      startSwap();
    }
  }, 3700);
}

function renderImageMedia(mediaSlot, beachData, beachName) {
  const img = document.createElement('img');
  img.src = beachData.image;
  img.alt = beachName + ' photo';
  mediaSlot.appendChild(img);
  requestAnimationFrame(() => img.classList.add('show'));
}

function renderEmptyMedia(mediaSlot) {
  const empty = document.createElement('div');
  empty.textContent = 'No media available';
  empty.style.color = '#666';
  empty.style.padding = '20px';
  mediaSlot.appendChild(empty);
  requestAnimationFrame(() => empty.classList.add('show'));
}

function renderSwimConditionText(descText, beachData, stationData) {
  const now = new Date();

  const filteredData = stationData
    .map((event) => ({ ...event, DateTime: new Date(event.DateTime) }))
    .filter((event) => event.DateTime.toISOString().startsWith(state.selectedDate));

  let currentTideHeight = '--';
  if (filteredData.length > 0) {
    const predictions = generatePredictions(filteredData, state.selectedDate);
    if (predictions.length > 0) {
      const closestPrediction = predictions.reduce((a, b) =>
        Math.abs(a.DateTime - now) < Math.abs(b.DateTime - now) ? a : b
      );
      currentTideHeight = closestPrediction?.Height?.toFixed(2) ?? '--';
    }
  }

  const windSpeed = state.currentWindSpeed || 0;
  const waveHeight = state.currentWaveHeight || 0;

  let windDescription = 'calm';
  if (windSpeed > 15) windDescription = 'very windy';
  else if (windSpeed > 8) windDescription = 'a bit windy';

  let waveDescription = 'calm';
  if (waveHeight > 1.2) waveDescription = 'rough';
  else if (waveHeight > 0.6) waveDescription = 'moderate surf';
  else if (waveHeight > 0.3) waveDescription = 'gentle waves';

  let swimCondition = 'decent for swimming';
  if (windSpeed > 15 || waveHeight > 1.2) {
    swimCondition = 'probably rough for swimming';
  } else if (windSpeed < 5 && parseFloat(currentTideHeight) > 1 && waveHeight < 0.3) {
    swimCondition = 'ideal for a swim';
  }

  const desc = beachData?.text ?? 'No description available for this beach.';

  descText.innerHTML = `
    ${desc}<br><br>
    The current tide height is <strong>${currentTideHeight}m</strong>, the waves are
    <strong>${waveDescription}</strong>, and it's <strong>${windDescription}</strong>,
    so conditions are <strong>${swimCondition}</strong>.
    <br><br><em>Note: Basic analysis! Real data but algorithm needs work</em>
  `;
}
