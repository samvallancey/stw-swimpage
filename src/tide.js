import * as d3 from 'd3';
import state from './state.js';
import { fetchWithRetry } from './utils.js';

const TIDE_API_URL =
  'https://gemcxasoc2.execute-api.eu-north-1.amazonaws.com/dev/getTideData';

function readThemeColor(tokenName, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
  return value || fallback;
}

export async function fetchTideData() {
  const response = await fetchWithRetry(TIDE_API_URL);
  state.tideData = await response.json();
  return state.tideData;
}

export function generateDateButtons(onDateSelect) {
  const today = new Date();
  const dateSelector = document.getElementById('date-selector');
  dateSelector.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dateStr = futureDate.toISOString().split('T')[0];

    const button = document.createElement('button');
    const dayOfWeek = futureDate.toLocaleString('en-US', { weekday: 'short' });
    button.textContent = `${dayOfWeek} ${futureDate.getDate()}`;
    button.dataset.date = dateStr;
    button.setAttribute(
      'aria-label',
      futureDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    );

    button.addEventListener('click', () => {
      state.selectedDate = dateStr;
      document
        .querySelectorAll('#date-selector button')
        .forEach((btn) => btn.classList.remove('selected'));
      button.classList.add('selected');
      onDateSelect();
    });

    dateSelector.appendChild(button);
  }

  const firstButton = dateSelector.querySelector('button');
  if (firstButton) {
    firstButton.classList.add('selected');
    state.selectedDate = firstButton.dataset.date;
  }
}

export function updateTideDataForDate() {
  const container = document.getElementById('tide-front-inner') || document.getElementById('tide-box');
  if (!container) return;
  container.innerHTML = '';

  if (
    !state.selectedBeach ||
    !state.closestTideStation ||
    !state.tideData[state.closestTideStation]
  ) {
    container.innerHTML = '<div class="loading-skeleton">Unable to load tide data.</div>';
    return;
  }

  const stationData = state.tideData[state.closestTideStation];
  const now = new Date();

  const upcomingEvents = stationData
    .map((event) => ({ ...event, DateTime: new Date(event.DateTime) }))
    .filter((event) => event.DateTime > now)
    .sort((a, b) => a.DateTime - b.DateTime);

  const previousEvents = stationData
    .map((event) => ({ ...event, DateTime: new Date(event.DateTime) }))
    .filter((event) => event.DateTime <= now)
    .sort((a, b) => b.DateTime - a.DateTime);

  const nextLow = upcomingEvents.find((e) => e.EventType === 'LowWater');
  const nextHigh = upcomingEvents.find((e) => e.EventType === 'HighWater');

  const lastTide = previousEvents[0];
  const tideIsRising = lastTide?.EventType === 'LowWater';

  const statusEl = document.createElement('div');
  statusEl.className = `tide-status ${tideIsRising ? 'is-rising' : 'is-falling'}`;
  statusEl.innerHTML = `
    ${tideIsRising ? getRisingArrowSVG() : getFallingArrowSVG()}
    <span>${tideIsRising ? 'Tide is rising' : 'Tide is falling'}</span>
  `;
  container.appendChild(statusEl);

  const tideBox = document.querySelector('.info-item.tide');
  tideBox.classList.remove('rising', 'falling', 'filled');
  void tideBox.offsetWidth;
  tideBox.classList.add(tideIsRising ? 'rising' : 'falling', 'filled');

  const tidesToShow = [nextLow, nextHigh]
    .filter(Boolean)
    .sort((a, b) => a.DateTime - b.DateTime)
    .slice(0, 2);

  tidesToShow.forEach((event, index) => {
    const label = event.EventType === 'LowWater' ? 'Low tide' : 'High tide';
    const diffMs = event.DateTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const countdown = `${diffHours}h ${diffMinutes}m`;
    const timeStr = event.DateTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const block = document.createElement('div');
    block.classList.add('tide-block');
    if (index === 0) block.classList.add('highlight');

    block.innerHTML = `
      <div class="tide-row">
        <span class="tide-kind">${label}</span>
        <span class="tide-countdown">in ${countdown}</span>
      </div>
      <time class="tide-time">at ${timeStr}</time>
    `;
    container.appendChild(block);
  });

  // Update flip clock on back face
  const tideCard = document.querySelector('.info-item.tide');
  const clockHand = document.querySelector('.tide-clock-hand');
  const caption = document.getElementById('tide-clock-caption');

  if (tideCard && clockHand && caption && lastTide && (nextLow || nextHigh)) {
    const nextEvent = tideIsRising ? nextHigh : nextLow;
    if (nextEvent) {
      const totalMs = nextEvent.DateTime - lastTide.DateTime;
      const elapsedMs = now - lastTide.DateTime;
      const ratio = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

      // 0 = Low at bottom (180deg), 1 = High at top (0/360deg).
      // Rising: move clockwise from 6 o'clock (180deg) through 7–11 to 12 (360deg).
      // Falling: move clockwise from 12 (0deg) through 1–5 to 6 (180deg).
      let angle;
      if (tideIsRising) {
        angle = 180 + 180 * ratio; // 180 -> 360
      } else {
        angle = 0 + 180 * ratio; // 0 -> 180
      }
      clockHand.style.transform = `translate(-50%, -100%) rotate(${angle % 360}deg)`;

      const diffMs = nextEvent.DateTime - now;
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      const diffMinutes = Math.max(0, Math.floor((diffMs / (1000 * 60)) % 60));
      const countdown = `${diffHours}h ${diffMinutes}m`;
      const isNextLow = nextEvent.EventType === 'LowWater';
      const nextLabel = isNextLow ? 'low tide' : 'high tide';
      caption.textContent = `${countdown} to ${nextLabel}`;

      const highTimeEl = document.getElementById('tide-clock-high-time');
      const lowTimeEl = document.getElementById('tide-clock-low-time');
      if (highTimeEl && lowTimeEl) {
        const formatTime = (event) =>
          event
            ? event.DateTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
            : '--:--';

        // Prefer upcoming events; fall back to last events of each type if needed
        const nextHighEvent = nextHigh || previousEvents.find((e) => e.EventType === 'HighWater');
        const nextLowEvent = nextLow || previousEvents.find((e) => e.EventType === 'LowWater');

        const hideLowTime = tideIsRising;
        const hideHighTime = !tideIsRising;

        highTimeEl.textContent = hideHighTime ? '' : formatTime(nextHighEvent);
        lowTimeEl.textContent = hideLowTime ? '' : formatTime(nextLowEvent);

        highTimeEl.classList.toggle('tide-clock-time--hidden', hideHighTime);
        lowTimeEl.classList.toggle('tide-clock-time--hidden', hideLowTime);
      }
    }
  }

  // One-time setup for flip interaction
  if (tideCard && !tideCard.dataset.tideDetailsInit) {
    const detailsButton = document.getElementById('tide-details-button');
    const backButton = document.getElementById('tide-back-button');
    if (detailsButton && backButton) {
      tideCard.dataset.tideDetailsInit = 'true';
      tideCard.classList.add('tide-details-enabled');

      const toggleFlip = (evt) => {
        const header = tideCard.querySelector('.card-header');
        if (header && header.contains(evt.target)) return;

        const flipped = tideCard.classList.toggle('is-flipped');
        detailsButton.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      };

      tideCard.addEventListener('click', toggleFlip);
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
}

function getRisingArrowSVG(className = '') {
  return `
    <svg viewBox="0 0 24 24" class="tide-arrow ${className}">
      <path d="M12 20V4M12 4L6 10M12 4l6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function getFallingArrowSVG(className = '') {
  return `
    <svg viewBox="0 0 24 24" class="tide-arrow ${className}">
      <path d="M12 4v16M12 20l-6-6M12 20l6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

export function generatePredictions(data, selectedDate) {
  const predictions = [];
  const twelfths = [1, 2, 3, 3, 2, 1];

  const allData = [...data];

  const prevDate = new Date(selectedDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);

  if (state.tideData[state.closestTideStation]) {
    allData.push(
      ...state.tideData[state.closestTideStation]
        .map((event) => ({
          ...event,
          DateTime: new Date(event.DateTime),
        }))
        .filter(
          (event) =>
            event.DateTime.toISOString().startsWith(prevDate.toISOString().split('T')[0]) ||
            event.DateTime.toISOString().startsWith(nextDate.toISOString().split('T')[0])
        )
    );
  }

  allData.sort((a, b) => a.DateTime - b.DateTime);

  if (allData.length === 0) return predictions;

  const startOfDay = new Date(`${selectedDate}T00:00:00`);
  if (allData[0].DateTime > startOfDay && allData.length >= 2) {
    const next = allData[0];
    const prev = allData.find((event) => event.DateTime < next.DateTime);

    if (prev) {
      const timeDiff = next.DateTime - prev.DateTime;
      const heightDiff = next.Height - prev.Height;
      const ratio = (startOfDay - prev.DateTime) / timeDiff;
      predictions.push({
        DateTime: startOfDay,
        Height: prev.Height + ratio * heightDiff,
      });
    }
  }

  for (let i = 0; i < allData.length - 1; i++) {
    const start = allData[i];
    const end = allData[i + 1];

    if (!(start.DateTime instanceof Date)) start.DateTime = new Date(start.DateTime);
    if (!(end.DateTime instanceof Date)) end.DateTime = new Date(end.DateTime);

    const interval = (end.DateTime - start.DateTime) / 6;
    const totalChange = end.Height - start.Height;

    predictions.push(start);

    let currentTime = new Date(start.DateTime);
    twelfths.forEach((twelfth) => {
      const increment = (twelfth / 12) * totalChange;
      currentTime = new Date(currentTime.getTime() + interval);
      predictions.push({
        DateTime: currentTime,
        Height: predictions[predictions.length - 1].Height + increment,
      });
    });
  }

  predictions.push(allData[allData.length - 1]);

  const endOfDay = new Date(`${selectedDate}T23:59:59`);
  if (allData[allData.length - 1].DateTime < endOfDay) {
    const lastTide = allData[allData.length - 1];
    predictions.push({ DateTime: endOfDay, Height: lastTide.Height + 0.5 });
  }

  return predictions.filter((d) => d.DateTime >= startOfDay && d.DateTime <= endOfDay);
}

export function drawTideChart() {
  if (!state.selectedDate || !state.closestTideStation) return;

  const stationData = state.tideData[state.closestTideStation] || [];
  const filteredData = stationData
    .map((event) => ({ ...event, DateTime: new Date(event.DateTime) }))
    .filter((event) => event.DateTime.toISOString().startsWith(state.selectedDate));

  if (filteredData.length === 0) return;

  const predictions = generatePredictions(filteredData, state.selectedDate);

  const startTime = new Date(`${state.selectedDate}T03:00:00`);
  const endTime = new Date(`${state.selectedDate}T21:00:00`);

  const visiblePredictions = predictions.filter(
    (d) => d.DateTime >= startTime && d.DateTime <= endTime
  );

  if (visiblePredictions.length < 2) return;

  const container = document.getElementById('tide-chart-container');
  const margin = { top: 10, right: 14, bottom: 34, left: 34 };
  const width = container.offsetWidth - margin.left - margin.right;
  const height = 210;
  const chartLineColor = readThemeColor('--color-chart-line', '#90caf9');
  const chartAreaColor = readThemeColor('--color-chart-line', '#90caf9');
  const axisColor = readThemeColor('--color-chart-axis', '#c6d5ea');
  const gridColor = readThemeColor('--color-chart-grid', 'rgba(198, 213, 234, 0.22)');
  const markerColor = readThemeColor('--color-text', '#ffffff');

  const x = d3.scaleTime().domain([startTime, endTime]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 4.5]).range([height, 0]);

  d3.select('#tide-chart-container').html('');

  const svg = d3
    .select('#tide-chart-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('role', 'img')
    .attr('aria-label', 'Tide height chart for the selected day')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const defs = svg.append('defs');
  const areaGradient = defs
    .append('linearGradient')
    .attr('id', 'tide-area-gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');
  areaGradient.append('stop').attr('offset', '0%').attr('stop-color', chartAreaColor).attr('stop-opacity', 0.2);
  areaGradient.append('stop').attr('offset', '100%').attr('stop-color', chartAreaColor).attr('stop-opacity', 0);

  const line = d3
    .line()
    .x((d) => x(d.DateTime))
    .y((d) => y(d.Height))
    .curve(d3.curveMonotoneX);

  const area = d3
    .area()
    .x((d) => x(d.DateTime))
    .y0(y(0))
    .y1((d) => y(d.Height))
    .curve(d3.curveMonotoneX);

  svg
    .append('path')
    .datum(visiblePredictions)
    .attr('fill', 'url(#tide-area-gradient)')
    .attr('d', area);

  svg
    .append('path')
    .datum(visiblePredictions)
    .attr('fill', 'none')
    .attr('stroke', chartLineColor)
    .attr('stroke-width', 3)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('d', line);

  const xAxis = svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(d3.timeHour.every(6))
        .tickFormat((d) => `${String(d.getHours()).padStart(2, '0')}:00`)
    );

  const yAxis = svg.append('g').call(d3.axisLeft(y).ticks(3).tickFormat((d) => `${d.toFixed(1)}m`));

  xAxis.selectAll('path, line').attr('stroke', axisColor);
  xAxis.selectAll('text').attr('fill', axisColor);
  yAxis.selectAll('path, line').attr('stroke', axisColor);
  yAxis.selectAll('text').attr('fill', axisColor);
  xAxis.selectAll('text').attr('font-size', '11px').attr('font-weight', '500');
  yAxis.selectAll('text').attr('font-size', '11px').attr('font-weight', '500');
  xAxis.select('.domain').attr('stroke-opacity', 0.35);
  yAxis.select('.domain').attr('stroke-opacity', 0);
  yAxis.selectAll('.tick line').attr('stroke-opacity', 0);

  svg
    .append('g')
    .attr('class', 'tide-grid')
    .call(d3.axisLeft(y).ticks(3).tickSize(-width).tickFormat(''))
    .selectAll('line')
    .attr('stroke', gridColor)
    .attr('stroke-dasharray', '1,7')
    .attr('stroke-opacity', 0.5);
  svg.select('.tide-grid path').attr('stroke', 'none');

  if (state.sunriseTime && state.sunsetTime) {
    const sunrise = new Date(state.sunriseTime);
    const sunset = new Date(state.sunsetTime);
    const sunriseX = x(sunrise);
    const sunsetX = x(sunset);

    if (sunriseX > 0) {
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', Math.max(0, sunriseX))
        .attr('height', height)
        .attr('fill', 'rgba(20, 30, 60, 0.15)');
    }

    if (sunsetX < width) {
      svg
        .append('rect')
        .attr('x', sunsetX)
        .attr('y', 0)
        .attr('width', Math.max(0, width - sunsetX))
        .attr('height', height)
        .attr('fill', 'rgba(20, 30, 60, 0.15)');
    }

    svg
      .append('text')
      .attr('x', sunriseX)
      .attr('y', -5)
      .attr('fill', '#facc15')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('☀️');

    svg
      .append('text')
      .attr('x', sunsetX)
      .attr('y', -5)
      .attr('fill', '#f97316')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('🌇');
  }

  const tooltip = d3
    .select('#tide-chart-container')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('display', 'none')
    .style('pointer-events', 'none');

  const hoverCircle = svg
    .append('circle')
    .attr('r', 4)
    .attr('fill', markerColor)
    .style('filter', `drop-shadow(0px 0px 6px ${markerColor})`)
    .style('display', 'none');

  const containerWidth = container.offsetWidth;
  const tooltipGap = 10;

  svg
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent')
    .on('mousemove', function (event) {
      const [mouseX] = d3.pointer(event);
      const hoverTime = x.invert(mouseX);

      const closestPoint = visiblePredictions.reduce((prev, curr) =>
        Math.abs(curr.DateTime - hoverTime) < Math.abs(prev.DateTime - hoverTime) ? curr : prev
      );

      const pointX = margin.left + x(closestPoint.DateTime);
      const pointY = margin.top + y(closestPoint.Height);

      hoverCircle
        .attr('cx', x(closestPoint.DateTime))
        .attr('cy', y(closestPoint.Height))
        .style('display', 'block');

      tooltip
        .html(
          `<strong>${d3.timeFormat('%H:%M')(closestPoint.DateTime)}</strong><br>Height: ${closestPoint.Height.toFixed(2)}m`
        )
        .style('display', 'block')
        .style('left', Math.max(50, Math.min(containerWidth - 50, pointX)) + 'px')
        .style('top', pointY - tooltipGap + 'px')
        .style('transform', 'translate(-50%, -100%)');
    })
    .on('mouseout', function () {
      hoverCircle.style('display', 'none');
      tooltip.style('display', 'none');
    });
}
