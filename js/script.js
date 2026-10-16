const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 1200 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

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
        AWIND: +d.AWIND,
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
    
}

window.addEventListener('load', init);