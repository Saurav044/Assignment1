# Assignment1
Assignment 1 CMSC471

# Visualization Design:
Use Longitude and Latitude and Mercator function to project points (our marks) on to a map and align it with a empty United States map
Point color corresponds to State
Define bounds so only mainland United States shows up
https://d3js.org/d3-geo 

Category 1:
Brushing and linking

Then you can brush over points and get average temperature, precipitaiton, etc of the points selected 
When brush is applied, all other points get set to a lower opacity for visualization
https://d3js.org/d3-brush

Category 2: Exploration

store the station with the highest precipitation, temperature etc, when you
Add button so when you hit next highest precipitation, it will zoom in on the point that has the highest precipitation, 
Lists the date and location 
repeated hits will take you further down the list
Add reset button so next click returns to the highest precipitation
https://d3js.org/d3-zoom 

References:
https://editablemaps.com/product/united-states-map/ 
https://observablehq.com/@d3/brushable-scatterplot
https://d3-graph-gallery.com/graph/interactivity_brush.html