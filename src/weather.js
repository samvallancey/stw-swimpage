import state from './state.js';
import { fetchWithRetry } from './utils.js';

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
    state.currentWindSpeed = parseFloat(wind) || 0;
    const rain = hourly.precipitation_probability?.[closestIndex] ?? '--';
    const humidity = hourly.relative_humidity_2m?.[closestIndex] ?? '--';
    const uvIndex = hourly.uv_index?.[closestIndex] ?? '--';
    const code = current.weathercode;
    const [conditionText, icon] = WEATHER_CODES[code] || ['Unknown', '❓'];

    document.getElementById('weather-icon').textContent = icon;
    document.getElementById('weather-temp-big').textContent = temp;
    document.getElementById('weather-condition-text').textContent = conditionText;
    document.getElementById('weather-rain').textContent = `Precipitation: ${rain}%`;
    document.getElementById('weather-humidity').textContent = `Humidity: ${humidity}%`;
    document.getElementById('weather-wind').textContent = `Wind: ${wind} km/h`;

    const uv = parseFloat(uvIndex);
    const uvValueEl = document.getElementById('uv-index-value');
    const uvLevelEl = document.getElementById('uv-level');

    if (uvValueEl && uvLevelEl) {
      uvValueEl.textContent = uv.toFixed(1);

      let level = 'Low';
      if (uv >= 8) level = 'Very High';
      else if (uv >= 6) level = 'High';
      else if (uv >= 3) level = 'Moderate';

      uvLevelEl.textContent = level;

      const uvPercent = Math.min(uv / 11, 1) * 100;
      document.getElementById('uv-indicator-wrapper').style.left = `${uvPercent}%`;
    }
  } catch (_err) {
    document.getElementById('weather-condition-text').textContent = 'Weather unavailable';
  }
}
