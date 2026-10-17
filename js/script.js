const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 1200 - margin.left - margin.right;
const height = 480 - margin.top - margin.bottom;

let allData = [];
const colorScale = d3.scaleOrdinal(d3.schemeSet3);
const projection = d3.geoMercator()
    .center([-96, 38])
    .scale(510)
    .translate([width / 2 - 220, height / 2]);

const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr("style", "background-image:url('./assets/us_mercator_map.png');background-repeat: no-repeat;background-size:100%") 
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

function init(){
    d3.csv("./data/weather.csv", d => ({
        station: d.station,
        state: d.state,
        latitude: +d.latitude,
        longitude: +d.longitude,
        elevation: +d.elevation,
        date: d.date,
        TMAX: +d.TMAX,
        TMIN: +d.TMIN,
        TAVG: +d.TAVG,
        AWND: +d.AWND,
        WDF5: +d.WDF5,
        WSF5: +d.WSF5,
        SNOW: +d.SNOW,
        SNWD: +d.SNWD,
        PRCP: +d.PRCP
    }))
    .then(data => {
            console.log(data)
            allData = data
            setUpPlot()
        })
    .catch(error => console.error('Error loading data:', error));
}

function setUpPlot() {
    const mainlandData = allData.filter(d => d.state !== 'AK' && d.state !== 'HI');

    const stations = Array.from(
        d3.group(mainlandData, d => d.station),
        ([key, values]) => values[0]
    );

    svg.selectAll('circle')
        .data(stations)
        .join('circle')
        .attr("cx", d => projection([d.longitude, d.latitude])[0])
        .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr("r", 3)
        .attr("fill", d => colorScale(d.state))
        .attr("opacity", .7);
}

// when brushing is done
svg.call(d3.brush().on("start end", function (event){

    // ensure that selection and even exist
    if ((event) && (event.selection)) {
        
        // return all circles to normal
        svg.selectAll('circle').attr("r", 3).attr("opacity",0.7)

        selection = event.selection
        x0 = selection[0][0]
        y0 = selection[0][1]
        x1 = selection[1][0]
        y1 = selection[1][1]

        // now check to see which circles lie in selection
        svg.selectAll('circle')
            .filter(d => x0 <= projection([d.longitude, d.latitude])[0] && projection([d.longitude, d.latitude])[0] <= x1 && y0 <= projection([d.longitude, d.latitude])[1] && projection([d.longitude, d.latitude])[1] <= y1)
            .attr("r", 4)
            .attr("opacity", 1)
    }
}));

window.addEventListener('load', init);