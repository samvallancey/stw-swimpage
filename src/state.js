const state = {
  selectedBeach: null,
  closestTideStation: null,
  selectedDate: new Date().toISOString().split('T')[0],
  currentWindSpeed: 0,
  currentWaveHeight: 0,
  tideData: {},
  sunriseTime: null,
  sunsetTime: null,
};

export default state;
