const width = 960;
const height = 540;

let allData = [];
const colorScale = d3.scaleOrdinal(d3.schemeSet3);

const mercator = d3.geoMercator().scale(1).translate([0, 0]);
const projection = coordinates => {
    const [x, y] = mercator(coordinates);
    return [678.078691 * x + 1597.576500, 674.799289 * y + 769.095105];
};

const readNumber = WeatherExtremes.numberOrNull;
const mainlandStates = new Set('AL AZ AR CA CO CT DE FL GA ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '));
let rowsByStation = new Map();
let selectedStationKeys = null;
let currentTransform = d3.zoomIdentity;
let precipitationExplorer = null;

const rootSvg = d3.select('#vis')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('aria-label', 'Weather station map. Drag across stations to select them.');

rootSvg.append('defs').append('clipPath').attr('id', 'weather-map-clip')
    .append('rect').attr('width', width).attr('height', height);

const mapLayer = rootSvg.append('g')
    .attr('clip-path', 'url(#weather-map-clip)')
    .append('g')
    .attr('class', 'map-content');

mapLayer.append('image')
    .attr('class', 'basemap')
    .attr('href', './assets/us_mercator_map.png')
    .attr('width', width)
    .attr('height', height);

const svg = mapLayer.append('g').attr('class', 'station-points');
const focusRing = mapLayer.append('circle')
    .attr('class', 'precipitation-focus-ring')
    .attr('display', 'none');
const brushLayer = rootSvg.append('g')
    .attr('class', 'brush')
    .attr('pointer-events', 'none');

function init(){
    d3.csv("./data/weather.csv", d => ({
        station: d.station,
        state: d.state,
        latitude: readNumber(d.latitude),
        longitude: readNumber(d.longitude),
        elevation: readNumber(d.elevation),
        date: d.date,
        TMAX: readNumber(d.TMAX),
        TMIN: readNumber(d.TMIN),
        TAVG: readNumber(d.TAVG),
        AWND: readNumber(d.AWND),
        WDF5: readNumber(d.WDF5),
        WSF5: readNumber(d.WSF5),
        SNOW: readNumber(d.SNOW),
        SNWD: readNumber(d.SNWD),
        PRCP: readNumber(d.PRCP)
    }))
    .then(data => {
        allData = data;
        setUpPlot();
        d3.select('#vis').attr('aria-busy', 'false');
    })
    .catch(error => {
        console.error('Error loading data:', error);
        d3.select('#precipitation-status').text('Could not load the weather data. Open index.html with Live Server and check that the data folder is present.');
        resetStatistics('Weather data could not be loaded.');
        d3.select('#vis').attr('aria-busy', 'false');
    });
}

function setUpPlot() {
    const mainlandData = allData.filter(d =>
        mainlandStates.has(d.state) && WeatherExtremes.hasCoordinates(d)
    );

    // Draw one dot per station, but keep every day for the selection averages.
    rowsByStation = d3.group(mainlandData, WeatherExtremes.stationKey);
    const stations = Array.from(
        rowsByStation,
        ([key, values]) => values[0]
    );

    svg.selectAll('circle.station-dot')
        .data(stations, WeatherExtremes.stationKey)
        .join('circle')
        .attr('class', 'station-dot')
        .attr("cx", d => projection([d.longitude, d.latitude])[0])
        .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr("fill", d => colorScale(d.state));

    refreshPointStyles();
    brushLayer.attr('pointer-events', null);

    // Connect the existing precipitation buttons to this map.
    precipitationExplorer = WeatherExtremes.createExplorer({
        rows: mainlandData,
        onSelect: focusStation,
        onReset: resetExploration
    });
}

const brush = d3.brush().extent([[0, 0], [width, height]]);
brushLayer.call(brush.on("start end", function (event){
    if (event.type === 'start' && event.sourceEvent) rootSvg.interrupt();

    if (event.selection) {
        const selection = event.selection;
        const x0 = selection[0][0];
        const y0 = selection[0][1];
        const x1 = selection[1][0];
        const y1 = selection[1][1];

        // Account for zoom so the rectangle matches the dots on screen.
        const all_points = svg.selectAll('circle.station-dot')
            .filter(d => {
                const [x, y] = currentTransform.apply(projection([d.longitude, d.latitude]));
                return x0 <= x && x <= x1 && y0 <= y && y <= y1;
            });

        selectedStationKeys = new Set(all_points.data().map(WeatherExtremes.stationKey));
        refreshPointStyles();

        if (all_points.empty()) {
            resetStatistics('No stations in this selection. Drag across one or more station dots.');
            return;
        }

        const selectedRows = all_points.data().flatMap(d =>
            rowsByStation.get(WeatherExtremes.stationKey(d)) ?? []
        );
        const avg_tmax = d3.mean(selectedRows, d => d.TMAX);
        const avg_tmin = d3.mean(selectedRows, d => d.TMIN);
        const avg_prcp = d3.mean(selectedRows, d => d.PRCP);
        const display = (value, digits) => value === undefined ? 'No valid readings' : value.toFixed(digits);

        // Display the selection averages.
        d3.select('#stats').html(`<p>Average daily high: ${display(avg_tmax, 1)} °F</p>
            <p>Average daily low: ${display(avg_tmin, 1)} °F</p>
            <p>Average daily precipitation: ${display(avg_prcp, 3)} in</p>`);
    } else {
        selectedStationKeys = null;
        refreshPointStyles();
        resetStatistics();
    }
}));

const zoom = d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 8])
    .filter(() => false)
    .on('zoom', event => {
        currentTransform = event.transform;
        mapLayer.attr('transform', event.transform);
        refreshPointStyles();
    });
rootSvg.call(zoom);

function refreshPointStyles() {
    svg.selectAll('circle.station-dot')
        .attr('r', function (d) {
            const focused = d3.select(this).classed('precipitation-active');
            const selected = selectedStationKeys !== null && selectedStationKeys.has(WeatherExtremes.stationKey(d));
            return (focused ? 6 : selected ? 4 : 3) / currentTransform.k;
        })
        .attr('opacity', d => selectedStationKeys === null || selectedStationKeys.has(WeatherExtremes.stationKey(d)) ? .8 : .18);
    focusRing.attr('r', 13 / currentTransform.k);
}

function resetStatistics(message = 'Select stations on the map to see their weather averages.') {
    d3.select('#stats').text(message);
}

function clearBrush() {
    brushLayer.call(brush.move, null);
}

function transitionTo(transform) {
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
    rootSvg.interrupt();
    if (duration === 0) rootSvg.call(zoom.transform, transform);
    else rootSvg.transition().duration(duration).call(zoom.transform, transform);
}

function focusStation(record) {
    clearBrush();
    svg.selectAll('circle.station-dot')
        .classed('precipitation-active', d => WeatherExtremes.stationKey(d) === record.key);
    const [x, y] = projection([record.longitude, record.latitude]);
    focusRing.attr('cx', x).attr('cy', y).attr('display', null);
    refreshPointStyles();
    transitionTo(d3.zoomIdentity.translate(width / 2, height / 2).scale(4).translate(-x, -y));
}

function resetExploration() {
    clearBrush();
    svg.selectAll('circle.station-dot').classed('precipitation-active', false);
    focusRing.attr('display', 'none');
    refreshPointStyles();
    transitionTo(d3.zoomIdentity);
}

window.addEventListener('load', init);
