import state from './state.js';
import { fetchWithRetry } from './utils.js';

function getUvLevel(uv) {
  if (!Number.isFinite(uv)) return '—';
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

const WEATHER_CODES = {
  0: ['Clear', '☀️'],
  1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '🌥️'],
  3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  61: ['Rain', '🌧️'],
  71: ['Snow', '🌨️'],
  80: ['Showers', '🌦️'],
  95: ['Thunderstorm', '⛈️'],
};

export async function updateWeatherForBeach(beach) {
  if (!beach?.coords) return;

  const lat = beach.coords[0];
  const lon = beach.coords[1];

  try {
    const response = await fetchWithRetry(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode,wind_speed_10m,precipitation_probability,relative_humidity_2m,uv_index&current_weather=true`
    );
    const data = await response.json();
    const current = data.current_weather;
    const hourly = data.hourly;

    const now = new Date(current.time);
    let closestIndex = 0;
    let minDiff = Infinity;

    hourly.time.forEach((t, i) => {
      const diff = Math.abs(new Date(t) - now);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });

    const temp = current.temperature ?? '--';
    const wind = current.windspeed ?? '--';
    const windValue = parseFloat(wind) || 0;
    state.currentWindSpeed = windValue;
    const rain = hourly.precipitation_probability?.[closestIndex] ?? '--';
    const humidity = hourly.relative_humidity_2m?.[closestIndex] ?? '--';
    const uvIndex = hourly.uv_index?.[closestIndex] ?? '--';
    const code = current.weathercode;
    const [conditionText, icon] = WEATHER_CODES[code] || ['Unknown', '❓'];

    document.getElementById('weather-icon').textContent = icon;
    document.getElementById('weather-temp-big').textContent = temp;
    document.getElementById('weather-condition-text').textContent = conditionText;
    document.getElementById('weather-rain').textContent = `${rain}%`;
    document.getElementById('weather-humidity').textContent = `${humidity}%`;
    document.getElementById('weather-wind').textContent = `${wind} km/h`;

    // Set weather mood class on main weather card
    const weatherBox = document.getElementById('weather-box');
    let mood = 'cloudy';
    if (code === 0 || code === 1) {
      mood = 'sunny';
    } else if (code === 2) {
      mood = 'cloudy';
    } else if (code === 3 || code === 45 || code === 48) {
      mood = 'overcast';
    } else if (code === 51 || code === 53 || code === 55) {
      mood = 'drizzle';
    } else {
      // rain / showers / snow / storms
      mood = 'rainy';
    }

    if (weatherBox) {
      weatherBox.classList.remove(
        'weather-sunny',
        'weather-cloudy',
        'weather-overcast',
        'weather-rainy',
        'weather-drizzle'
      );
      weatherBox.classList.add(`weather-${mood}`);
    }

    updateWeatherRainOverlay(mood);
    const windLevelEl = document.getElementById('wind-level');
    const windGustEl = document.querySelector('.wind-gust');
    if (windLevelEl) {
      let windLabel = 'Calm breeze';
      if (windValue >= 35) windLabel = 'Very windy';
      else if (windValue >= 20) windLabel = 'Breezy';
      else if (windValue >= 10) windLabel = 'Light breeze';
      windLevelEl.textContent = windLabel;
    }

    const windArrowEl = document.querySelector('.wind-arrow-icon');
    if (windArrowEl) {
      if (windValue >= 20) {
        windArrowEl.textContent = '↑';
      } else if (windValue <= 5) {
        windArrowEl.textContent = '↕';
      } else {
        windArrowEl.textContent = '↗';
      }
    }

    if (windGustEl) {
      const gustDuration = Math.max(1.4, 3.2 - Math.min(windValue, 40) / 18);
      windGustEl.style.setProperty('--wind-gust-duration', `${gustDuration}s`);
      windGustEl.style.opacity = windValue < 3 ? '0.45' : '1';
    }

    const uv = parseFloat(uvIndex);
    const uvValueEl = document.getElementById('uv-index-value');
    const uvLevelEl = document.getElementById('uv-level');
    const uvBarFill = document.getElementById('uv-bar-fill');

    if (uvValueEl && uvLevelEl) {
      uvValueEl.textContent = Number.isFinite(uv) ? uv.toFixed(1) : '--';
      const level = getUvLevel(uv);
      uvLevelEl.textContent = level;
    }
    if (uvBarFill) {
      const pct = Number.isFinite(uv) ? Math.min(100, (uv / 11) * 100) : 0;
      uvBarFill.style.width = `${100 - pct}%`;
    }
  } catch (_err) {
    document.getElementById('weather-condition-text').textContent = 'Weather unavailable';
    document.getElementById('weather-rain').textContent = '--%';
    document.getElementById('weather-humidity').textContent = '--%';
    document.getElementById('weather-wind').textContent = '-- km/h';
    const windLevelEl = document.getElementById('wind-level');
    const windGustEl = document.querySelector('.wind-gust');
    const uvValueEl = document.getElementById('uv-index-value');
    const uvLevelEl = document.getElementById('uv-level');
    if (windLevelEl) windLevelEl.textContent = 'Wind data unavailable';
    if (windGustEl) {
      windGustEl.style.setProperty('--wind-gust-duration', '3.2s');
      windGustEl.style.opacity = '0.45';
    }
    if (uvValueEl) uvValueEl.textContent = '--';
    if (uvLevelEl) uvLevelEl.textContent = '—';
    const uvBarFill = document.getElementById('uv-bar-fill');
    if (uvBarFill) uvBarFill.style.width = '100%';

    updateWeatherRainOverlay(null);
  }
}

function updateWeatherRainOverlay(mood) {
  const weatherBox = document.getElementById('weather-box');
  if (!weatherBox) return;

  const front = weatherBox.querySelector('.weather-rain.front-row');
  const back = weatherBox.querySelector('.weather-rain.back-row');
  if (!front || !back) return;

  // Clear any existing drops
  front.innerHTML = '';
  back.innerHTML = '';

  if (mood !== 'rainy' && mood !== 'drizzle') {
    return;
  }

  let increment = 0;
  const max = 55;
  const densityScale = mood === 'drizzle' ? 1.8 : 1;

  while (increment < max) {
    const randoHundo = Math.floor(Math.random() * 98) + 1; // 1–98
    const randoFiver = Math.floor(Math.random() * 3) + 3; // 3–5
    increment += randoFiver * densityScale;
    if (increment > max) break;

    const delay = `0.${randoHundo}s`;
    const duration = `0.5${randoHundo}s`;

    const makeDrop = () => {
      const drop = document.createElement('div');
      drop.className = 'weather-drop';
      drop.style.animationDelay = delay;
      drop.style.animationDuration = duration;

      const stem = document.createElement('div');
      stem.className = 'weather-stem';
      stem.style.animationDelay = delay;
      stem.style.animationDuration = duration;

      const splat = document.createElement('div');
      splat.className = 'weather-splat';
      splat.style.animationDelay = delay;
      splat.style.animationDuration = duration;

      drop.appendChild(stem);
      drop.appendChild(splat);
      return drop;
    };

    const frontDrop = makeDrop();
    frontDrop.style.left = `${increment}%`;
    frontDrop.style.bottom = `${100 + (randoFiver * 2)}%`;
    front.appendChild(frontDrop);

    const backDrop = makeDrop();
    backDrop.style.right = `${increment}%`;
    backDrop.style.bottom = `${100 + (randoFiver * 2)}%`;
    back.appendChild(backDrop);
  }
}
