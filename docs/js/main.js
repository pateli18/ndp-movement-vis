var routeData, geoData, map, svg, timer, clock, day_night;
var timeMultiplier = 1;
var hourMultiplier = 250;
var timeCounter = 0;
var startTime = "12:00 am"

queue()
    .defer(d3.json, "data/weekday_od.geojson")
    .defer(d3.csv, "data/weekday_od_data.csv")
    .await(function(error, geoDataRaw, routeDataRaw){

        routeDataRaw.forEach(function(d) {
            d.route_id = +d.route_id;
            var time = d.timestamp.split(":");
            d.timestamp = +time[0]*hourMultiplier + +time[1]/60*hourMultiplier;
        });

        routeData = routeDataRaw;
        geoData = geoDataRaw;

        runAnimation();

    });


var transform = d3.geoTransform({point:projectPoint});
var path = d3.geoPath().projection(transform);

//Project any point to map's current state
function projectPoint(lon, lat) {
    var point = map.project(new mapboxgl.LngLat(lon, lat));
    this.stream.point(point.x, point.y);
}

function transition(point, route) {
    route = route._groups[0][0];
    var l = route.getTotalLength();
    point.transition()
        .duration(l * timeMultiplier)
        .attr('style', 'display:block')
        .attrTween('transform', delta(route))
        .on('end', function(d) {
            route.remove()
        })
        .remove();
}

function delta (path) {
    var l = path.getTotalLength();
    return function (i) {
        return function (t) {
            var p = path.getPointAtLength(t * l);
            return 'translate(' + p.x + ',' + p.y + ')';
        }
    }
}

function runAnimation() {

    mapboxgl.accessToken = 'pk.eyJ1IjoicGF0ZWxpMTgiLCJhIjoiY2o5cnNsc2dxMzFwNTJ3bGdrZzdnM3YzcSJ9.aC2VGgP88galycKJ--ApbA';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v9',
        center: [-70.099027,41.316193],
        zoom: 11.5
    });

    var canvas = map.getCanvasContainer();


    //Overlay D3 on the map
    svg = d3.select(canvas).append("svg");
    clock = svg.append("text")
        .attr("class", "clock")
        .attr("fill", "black")
        .attr("transform", "translate("  + ($("svg").width() - 20) + ", " + 50 + ")")
        .text(startTime);
    map.on('load', function() {
        timer = setInterval(runTravel, 1);
    });
}

function runTravel() {

    while (routeData.length > 0 && routeData[0].timestamp <= timeCounter) {

        var point = svg.append("circle")
            .attr("class", "driver");

        var route = svg.append("path")
            .datum(geoData[routeData[0].route_id])
            .attr("class", "polyline")
            .attr("d", path);

        routeData.shift();
        transition(point, route);

    }

    if (timeCounter % hourMultiplier % 60 === 0) {
        setClock();
    }


    timeCounter += 1;
    if (timeCounter >= (24 * hourMultiplier)) {
        clearInterval(timer);
        clock.text(startTime);
    }
}

function setClock() {
    var hourRaw = timeCounter / hourMultiplier;
    var hour = Math.floor(hourRaw);
    var am_pm = "am";

    if (hour >= 12) {
        hour -= 12;
        am_pm = "pm";
    }

    hour = hour === 0 ? 12 : hour;

    var minute = Math.round(timeCounter % hourMultiplier / hourMultiplier * 60);
    minute = minute < 10 ? "0" + minute : minute;

    clock.text(hour + ":" + minute + " " + am_pm);
}