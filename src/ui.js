import state from './state.js';
import { generatePredictions } from './tide.js';

const FAVOURITES_KEY = 'stw-favourites';
const THEME_KEY = 'stw-theme';
const COLLAPSIBLES_KEY = 'stw-collapsibles';

function getStoredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

function setThemeButtonState(theme) {
  const button = document.getElementById('theme-toggle');
  if (!button) return;

  const isLight = theme === 'light';
  button.setAttribute('aria-pressed', String(isLight));
  const actionLabel = isLight ? 'Enable dark mode' : 'Enable light mode';
  button.setAttribute('aria-label', actionLabel);
  button.setAttribute('title', actionLabel);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setThemeButtonState(theme);
}

export function initThemeToggle(onThemeChange) {
  const button = document.getElementById('theme-toggle');
  if (!button) return 'dark';

  const initialTheme = getStoredTheme();
  applyTheme(initialTheme);
  if (onThemeChange) onThemeChange(initialTheme);

  button.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
    if (onThemeChange) onThemeChange(nextTheme);
  });

  return initialTheme;
}

function getStoredCollapsibles() {
  try {
    const raw = localStorage.getItem(COLLAPSIBLES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredCollapsible(contentId, expanded) {
  const stored = getStoredCollapsibles();
  stored[contentId] = expanded;
  localStorage.setItem(COLLAPSIBLES_KEY, JSON.stringify(stored));
}

export function initCollapsibleTiles() {
  const stored = getStoredCollapsibles();
  const toggles = document.querySelectorAll('[data-collapsible-toggle]');
  toggles.forEach((toggle) => {
    const contentId = toggle.getAttribute('aria-controls');
    const content = contentId ? document.getElementById(contentId) : null;
    const card = toggle.closest('.collapsible-card');
    if (!content || !card) return;

    const setExpanded = (expanded) => {
      toggle.setAttribute('aria-expanded', String(expanded));
      content.classList.toggle('collapsed', !expanded);
      card.classList.toggle('is-collapsed', !expanded);
      if (contentId) setStoredCollapsible(contentId, expanded);
    };

    const storedExpanded = stored[contentId];
    const initialExpanded =
      storedExpanded !== undefined ? storedExpanded : toggle.getAttribute('aria-expanded') !== 'false';
    setExpanded(initialExpanded);
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      setExpanded(!expanded);
    });
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

    renderFavouritesBar();
  });
}

let favouritesConfig = null;

export function initFavouritesBar(beaches, onSelectBeach) {
  favouritesConfig = { beaches, onSelectBeach };
  renderFavouritesBar();
}

export function initBeachDetailsToggle() {
  const toggle = document.getElementById('beach-tags-toggle');
  const card = document.querySelector('.beach-description-card');
  const content = document.getElementById('beach-description');
  if (!toggle || !card || !content) return;

  const contentId = 'beach-description';
  const stored = getStoredCollapsibles();

  const setExpanded = (expanded) => {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Hide beach details' : 'Show beach details');
    content.classList.toggle('collapsed', !expanded);
    card.classList.toggle('is-collapsed', !expanded);
    setStoredCollapsible(contentId, expanded);
  };

  const storedExpanded = stored[contentId];
  const initialExpanded = storedExpanded !== undefined ? storedExpanded : false;
  setExpanded(initialExpanded);

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    setExpanded(!expanded);
  });
}

function getFavourites() {
  try {
    return JSON.parse(localStorage.getItem(FAVOURITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function renderFavouritesBar() {
  if (!favouritesConfig) return;

  const container = document.getElementById('favourites-bar');
  if (!container) return;

  const favourites = getFavourites();
  container.innerHTML = '';

  if (!favourites.length) {
    const empty = document.createElement('div');
    empty.className = 'favourites-empty';
    empty.textContent = 'Tap the heart to add favourites';
    container.appendChild(empty);
    return;
  }

  favourites.forEach((name) => {
    const beach = favouritesConfig.beaches.find((b) => b.name === name);
    if (!beach) return;

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'favourite-pill';
    pill.textContent = name;

    if (state.selectedBeach && state.selectedBeach.name === name) {
      pill.classList.add('is-active');
    }

    pill.addEventListener('click', () => {
      favouritesConfig.onSelectBeach(beach);

      const containerNow = document.getElementById('favourites-bar');
      if (!containerNow) return;
      containerNow
        .querySelectorAll('.favourite-pill')
        .forEach((el) => el.classList.toggle('is-active', el === pill));
    });

    container.appendChild(pill);
  });
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
  const conditionsRoot = document.getElementById('beach-conditions');
  if (!mediaSlot || !descText || !conditionsRoot || !beach) return;

  const beachData = descriptions[beach.name] || {};
  mediaSlot.innerHTML = '';

  if (beachData.video) {
    renderVideoMedia(mediaSlot, beachData, beach.name);
  } else if (beachData.image) {
    renderImageMedia(mediaSlot, beachData, beach.name);
  } else {
    renderEmptyMedia(mediaSlot);
  }

  renderSwimConditionText(descText, conditionsRoot, beachData, stationData);
  updateBeachTagsRow(beachData, beach.name);
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

function renderSwimConditionText(descText, conditionsText, beachData, stationData) {
  const now = new Date();

  const filteredData = stationData
    .map((event) => ({ ...event, DateTime: new Date(event.DateTime) }))
    .filter((event) => event.DateTime.toISOString().startsWith(state.selectedDate));

  let currentTideHeight = '--';
  let tideDirection = null;
  if (filteredData.length > 0) {
    const predictions = generatePredictions(filteredData, state.selectedDate);
    if (predictions.length > 0) {
      let closestIndex = 0;
      let minDiff = Infinity;
      predictions.forEach((p, i) => {
        const diff = Math.abs(p.DateTime - now);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      });

      const currentPred = predictions[closestIndex];
      currentTideHeight = currentPred?.Height?.toFixed(2) ?? '--';

      const next = predictions[Math.min(closestIndex + 1, predictions.length - 1)];
      const prev = predictions[Math.max(closestIndex - 1, 0)];
      const ref = next && next.DateTime > currentPred.DateTime ? next : prev;

      if (ref && typeof ref.Height === 'number' && typeof currentPred.Height === 'number') {
        if (ref.Height > currentPred.Height) tideDirection = 'rising';
        else if (ref.Height < currentPred.Height) tideDirection = 'falling';
      }
    }
  }

  const windSpeed = state.currentWindSpeed || 0;
  const waveHeight = state.currentWaveHeight || 0;
  const seaTemp = state.currentSeaTemperature || 0;
  const wavePeriod = state.currentWavePeriod || 0;

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

  // Static beach description goes in the Beach card
  descText.textContent = desc;

  // Live conditions summary goes in the separate Conditions card
  const tideEl = document.getElementById('cond-tide');
  const waveEl = document.getElementById('cond-waves');
  const wavePeriodEl = document.getElementById('cond-waves-period');
  const seaTempEl = document.getElementById('cond-sea-temp');
  const windEl = document.getElementById('cond-wind');
  const evalEl = document.getElementById('cond-eval');

  if (tideEl) tideEl.textContent = `${currentTideHeight} m`;

  const tideNextEl = document.getElementById('cond-tide-next');
  const tideArrowEl = document.getElementById('cond-tide-arrow');
  if (tideNextEl && filteredData.length > 0) {
    // Find upcoming high/low events for this date
    const today = state.selectedDate;
    const highs = stationData
      .map((event) => ({ ...event, DateTime: new Date(event.DateTime) }))
      .filter(
        (e) =>
          e.DateTime.toISOString().startsWith(today) &&
          e.DateTime > now &&
          (e.EventType === 'HighWater' || e.EventType === 'LowWater')
      )
      .sort((a, b) => a.DateTime - b.DateTime);

    const next = highs[0];
    if (next) {
      const diffMs = next.DateTime - now;
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      const diffMinutes = Math.max(0, Math.floor((diffMs / (1000 * 60)) % 60));
      const hh = diffHours.toString();
      const mm = diffMinutes.toString().padStart(2, '0');
      tideNextEl.textContent = `${hh}h ${mm}m`;
      if (tideArrowEl) {
        tideArrowEl.textContent = next.EventType === 'LowWater' ? '↓' : '↑';
      }
    } else {
      tideNextEl.textContent = '--';
      if (tideArrowEl) tideArrowEl.textContent = '↕';
    }
  }
  if (waveEl) waveEl.textContent = `${waveHeight.toFixed(1)} m`;
  if (wavePeriodEl) wavePeriodEl.textContent = wavePeriod ? `${wavePeriod.toFixed(1)} s` : '-- s';
  if (seaTempEl) seaTempEl.textContent = seaTemp ? `${seaTemp.toFixed(1)} °C` : '-- °C';
  if (windEl) windEl.textContent = `${windSpeed.toFixed(0)} km/h`;

  if (evalEl) {
    evalEl.textContent = swimCondition === 'ideal for a swim'
      ? 'Ideal for a swim'
      : swimCondition === 'probably rough for swimming'
      ? 'Rough for swimming'
      : 'Decent for swimming';

    evalEl.classList.remove('condition-eval--ok', 'condition-eval--caution', 'condition-eval--rough');
    if (swimCondition === 'ideal for a swim') {
      evalEl.classList.add('condition-eval--ok');
    } else if (swimCondition === 'probably rough for swimming') {
      evalEl.classList.add('condition-eval--rough');
    } else {
      evalEl.classList.add('condition-eval--caution');
    }
  }
}

function updateBeachTagsRow(beachData, beachName) {
  const el = document.getElementById('beach-tags');
  if (!el) return;

  const desc = beachData?.text ?? beachName ?? 'Beach details';
  const lower = desc.toLowerCase();

  const predefined = {
    Sandown: ['sandy', 'swimming', 'family'],
    Shanklin: ['golden', 'esplanade', 'cliffs'],
    Ventnor: ['sheltered', 'cliffs', 'warm'],
    'Compton Bay': ['wild', 'surf', 'fossils'],
    Totland: ['quiet', 'views', 'sunset'],
    'Colwell Bay': ['calm', 'family', 'sunset'],
    'Gurnard Bay': ['quiet', 'sailing', 'views'],
  }[beachName];

  let tags;
  if (predefined) {
    tags = predefined;
  } else {
    tags = lower
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3);
  }

  if (!tags.length) {
    el.textContent = 'Beach • details';
  } else {
    el.textContent = tags.join(' • ');
  }
}
