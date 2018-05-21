
LineChart = function(_parentElement, _lineData, _pointData, _fullHeight, _authorsToDisplay) {
    this.parentElement = _parentElement;
    this.lineData = _lineData;
    this.pointData = _pointData;
    this.fullHeight = _fullHeight;
    this.authorsToDisplay = _authorsToDisplay;

    this.initVis();
};

LineChart.prototype.initVis = function() {
    var vis = this;

    vis.margin = { top: 150, right: 20, bottom: 50, left: 70 };

    vis.width = $('#' + vis.parentElement).width() - vis.margin.left - vis.margin.right,
        vis.height = vis.fullHeight - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select('#' + vis.parentElement)
        .append('svg')
        .attr('width', vis.width + vis.margin.left + vis.margin.right)
        .attr('height', vis.height + vis.margin.top + vis.margin.bottom)
        .append('g')
        .attr('transform', "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.xScale = d3.scaleLinear()
        .rangeRound([0, vis.width]);

    vis.yScale = d3.scaleLinear()
        .range([vis.height, 0]);

    vis.xAxis = d3.axisBottom()
        .scale(vis.xScale)
        .tickFormat(d3.format(".0f"));

    vis.yAxis = d3.axisLeft()
        .scale(vis.yScale)
        .tickFormat(d3.format(".1%"));

    vis.svg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(0," + vis.height + ")")
        .append('text')
        .attr('transform', "translate(" + (vis.width - 10) + ",-5)")
        .attr('class', 'axis-label')
        .text('Year');

    vis.svg.append("g")
        .attr("class", "y-axis axis")
        .append('text')
        .attr('class', 'axis-label')
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(10,"+(75)+")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
        .text("% of Exclamation Points Per Book");

    if (vis.authorsToDisplay.length > 0) {

        var colorDomain = ["Melville", "Hemingway", "Fitzgerald", "Southworth"];
        var colorMap = {"Melville":"#0099CB", "Hemingway":"#f0b342", "Fitzgerald":"black", "Southworth":"red"};

        vis.colorScale = d3.scaleOrdinal()
            .domain(colorDomain.filter(function(d) {
                return vis.authorsToDisplay.includes(d);
            }))
            .range(colorDomain.map(function(d) {
                return colorMap[d];
            }));

        vis.legend = d3.legendColor()
            .shape('circle')
            .shapePadding(50)
            .orient('horizontal')
            .scale(vis.colorScale);

        d3.select('#' + vis.parentElement).select('svg').append("g")
            .attr("class", "legendOrdinal")
            .attr("transform", "translate(" + (vis.margin.left) + ", " + (90) + ")")
            .call(vis.legend);

    }

    vis.line = d3.line()
        .x(function(d) { return vis.xScale(d.year);})
        .y(function(d) { return vis.yScale(d[lineParam]); })
        .curve(d3.curveCardinal);

    d3.select('#' + vis.parentElement).select('svg')
        .append('text')
        .attr('class', 'title')
        .attr("transform", "translate(" + (vis.margin.left) + ", " + (30) + ")")
        .text('Exclamation Point Usage in American Literature 1840 - 2009');

    d3.select('#' + vis.parentElement).select('svg')
        .append('text')
        .attr('class', 'sources')
        .attr("transform", "translate(" + (vis.margin.left) + ", " + (60) + ")")
        .text('Sources: COHA, Project Gutenberg, Internet Archive');

    vis.wrangleData();
};

LineChart.prototype.wrangleData = function() {
    var vis = this;

    vis.displayLineData = vis.lineData.filter(function(d) {
        return d.year >= 1840;
    });

    vis.displayPointData = vis.pointData.filter(function(d) {
        return vis.authorsToDisplay.includes(d.author) && d.title !== "Pierre or, The Ambiguities" && d.title !== "Islands in the Stream";
    });

    vis.xScale.domain(d3.extent(vis.displayLineData, function(d) {
            return d.year;
        }));

    vis.yScale.domain([0, Math.max(
            d3.max(vis.displayLineData, function(d) { return d[lineParam]; }),
            d3.max(vis.pointData, function(d) { return d[pointParam]; })
            )
        ]);

    vis.updateChart();
};

LineChart.prototype.updateChart = function() {
    var vis = this;

    var line = vis.svg.selectAll('.line')
        .data([vis.displayLineData]);

    line.enter()
        .append('path')
        .attr('class', 'line')
        .merge(line)
        .transition()
        .duration(1000)
        .attr("d", vis.line);

    line.exit().remove();

    var point = vis.svg.selectAll('.point')
        .data(vis.displayPointData);

    point.enter()
        .append('circle')
        .attr('class', 'point')
        .merge(point)
        .transition()
        .duration(1000)
        .attr("cx", function(d) {
            return vis.xScale(d.year);
        })
        .attr("cy", function(d) {
            return vis.yScale(d[pointParam]);
        })
        .attr("r", "5px")
        .attr("fill", function(d) {
            return vis.colorScale(d.author);
        });

    point.exit().remove();

    var pointLabel = vis.svg.selectAll('.point-label')
        .data(vis.displayPointData);

    pointLabel.enter()
        .append('text')
        .attr('class', 'point-label')
        .merge(pointLabel)
        .transition()
        .duration(1000)
        .attr("x", function(d) {
            return vis.xScale(d.year) + 5;
        })
        .attr("y", function(d) {
            switch (d.title) {
                case "Men Without Women":
                    return vis.yScale(d[pointParam]) + 10;
                    break;
                case "Across the River and Into the Trees":
                    return vis.yScale(d[pointParam]) - 10;
                    break;
                case "Victor's Triumph Sequel to A Beautiful Fiend":
                    return vis.yScale(d[pointParam]) - 5;
                    break;
                case "Clarel":
                    return vis.yScale(d[pointParam]) + 5;
                    break;
                default:
                    return vis.yScale(d[pointParam]);
            }
        })
        .text(function(d) {
            return d.title + ' | ' + d3.format(",")(d.em_count);
        })
        .attr("fill", function(d) {
            return vis.colorScale(d.author);
        });

    pointLabel.exit().remove();

    vis.svg.select(".x-axis").call(vis.xAxis);
    vis.svg.select(".y-axis").call(vis.yAxis);

    vis.svg.append("text")
        .attr("x", vis.width - 40)
        .attr("y", vis.height - 85)
        .attr("class", "avg-label")
        .text("Average");
};