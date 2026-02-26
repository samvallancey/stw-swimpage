import * as d3 from 'd3';
import state from './state.js';
import { fetchWithRetry } from './utils.js';

const TIDE_API_URL =
  'https://gemcxasoc2.execute-api.eu-north-1.amazonaws.com/dev/getTideData';

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
    const dayOfWeek = futureDate.toLocaleString('en-US', { weekday: 'short' })[0];
    button.innerHTML = `<span>${dayOfWeek}</span>${futureDate.getDate()}`;
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
  const container = document.getElementById('tide-box');
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
  statusEl.className = 'tide-status';
  statusEl.innerHTML = `
    ${tideIsRising ? getRisingArrowSVG('pulse') : getFallingArrowSVG('pulse')}
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
    const label = event.EventType === 'LowWater' ? 'Low Water in' : 'High Water in';
    const diffMs = event.DateTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const timeStr = event.DateTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const block = document.createElement('div');
    block.classList.add('tide-block');
    if (index === 0) block.classList.add('highlight');

    block.innerHTML = `
      <div class="tide-label">
        ${label}: <span class="bold">${diffHours}h ${diffMinutes}m</span>
        <time>(${timeStr})</time>
      </div>
    `;
    container.appendChild(block);
  });
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
  const endTime = new Date(`${state.selectedDate}T23:59:59`);

  const visiblePredictions = predictions.filter(
    (d) => d.DateTime >= startTime && d.DateTime <= endTime
  );

  const beforeStart = [...predictions].reverse().find((p) => p.DateTime < startTime);
  const afterStart = predictions.find((p) => p.DateTime > startTime);

  if (beforeStart && afterStart) {
    const totalTime = afterStart.DateTime - beforeStart.DateTime;
    const ratio = (startTime - beforeStart.DateTime) / totalTime;
    const interpolatedHeight =
      beforeStart.Height + ratio * (afterStart.Height - beforeStart.Height);
    visiblePredictions.unshift({ DateTime: startTime, Height: interpolatedHeight });
  }

  const container = document.getElementById('tide-chart-container');
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const width = container.offsetWidth - margin.left - margin.right;
  const height = 250;

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

  const line = d3
    .line()
    .x((d) => x(d.DateTime))
    .y((d) => y(d.Height))
    .curve(d3.curveCatmullRom.alpha(0.1));

  svg
    .append('path')
    .datum(visiblePredictions)
    .attr('fill', 'none')
    .attr('stroke', 'lightblue')
    .attr('stroke-width', 2)
    .attr('d', line);

  svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(12).tickFormat(d3.timeFormat('%H:%M')));

  svg.append('g').call(d3.axisLeft(y));

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
    .attr('fill', 'white')
    .style('filter', 'drop-shadow(0px 0px 6px white)')
    .style('display', 'none');

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

      hoverCircle
        .attr('cx', x(closestPoint.DateTime))
        .attr('cy', y(closestPoint.Height))
        .style('display', 'block');

      tooltip
        .html(
          `<strong>${d3.timeFormat('%H:%M')(closestPoint.DateTime)}</strong><br>Height: ${closestPoint.Height.toFixed(2)}m`
        )
        .style('left', event.pageX + 10 + 'px')
        .style('top', event.pageY - 30 + 'px')
        .style('display', 'block');
    })
    .on('mouseout', function () {
      hoverCircle.style('display', 'none');
      tooltip.style('display', 'none');
    });
}
