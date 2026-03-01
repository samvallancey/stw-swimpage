const state = {
  selectedBeach: null,
  closestTideStation: null,
  selectedDate: new Date().toISOString().split('T')[0],
  currentWindSpeed: 0,
  currentWindDirectionDeg: null,
  currentWaveHeight: 0,
  currentSeaTemperature: 0,
  currentWavePeriod: 0,
  currentWavePower: null,
  tideData: {},
  sunriseTime: null,
  sunsetTime: null,
};

export default state;
