
'use strict';

angular.module('dm.widgets.tankChart', ['dashboard.provider', 'nvd3'])
    .config(function (dashboardProvider) {
        dashboardProvider
            .widget('tankChart', {
                title: 'Tanks Chart',
                description: 'Display Tanks',
                templateUrl: 'dashboard/app/widgets/tank/chart/tankChart.html',
                controller: 'tankChartController',
                edit: {
                    templateUrl: 'dashboard/app/widgets/filter/edit.html',
                    controller: 'filterEditController',
                    reload: true

                }
            });
    })
    .service('tankChartService', function ($q, $http) {
        return {
            getTanks: function (filter) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listTanks', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor, foremen:  filter.foremen, msos:  filter.mso,
                        site:filter.siteName, siteIDNums: filter.site,
                        rollups:'tanks',
                        individualSites:true,
                        filterFields:'',
                        filterTypes:'',
                        filterValues:'',
                        filterComps:'',

                        offset: 0, limit:1000}})
                    .success(function (data) {
                        if (data && data.status === 'ok') {
                            deferred.resolve(data.data);
                        } else {
                            deferred.reject();
                        }
                    })
                    .error(function () {
                        deferred.reject();
                    });
                return deferred.promise;
            },
            getSiteTanks: function (site) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listTanksForSite', {
                    params: {site:  site,
                        page:1,
                        start:0,
                        limit:25,
                        sort:[{"property":"type","direction":"ASC"},{"property":"percent","direction":"DESC"}]}})
                    .success(function (data) {
                        if (data && data.status === 'ok') {
                            deferred.resolve(data.data);
                        } else {
                            deferred.reject();
                        }
                    })
                    .error(function () {
                        deferred.reject();
                    });
                return deferred.promise;
            }
        };
    })

    .controller('tankChartController', function ($scope, $timeout, config, tankChartService, msgBus) {
        $scope.tanksForSite = {};


        $scope.filter = angular.copy(config);
        if (!$scope.filter.bu){
            $scope.filter.bu = null
        }
        if (!$scope.filter.area){
            $scope.filter.area = null
        }
        if (!$scope.filter.supervisor){
            $scope.filter.supervisor = null
        }
        if (!$scope.filter.foremen){
            $scope.filter.foremen = null
        }
        if (!$scope.filter.mso){
            $scope.filter.mso = null
        }



        msgBus.onMsg(config.subscribe, function (event, data) {

            // assume noise in channel
            if(data.filter){
                if (!data.filter.bu){
                    data.filter.bu = null
                }
                if (!data.filter.area){
                    data.filter.area = null
                }
                if (!data.filter.supervisor){
                    data.filter.supervisor = null
                }
                if (!data.filter.foremen){
                    data.filter.foremen = null
                }
                if (!data.filter.mso){
                    data.filter.mso = null
                }

                if($scope.filter.bu != data.filter.bu ||
                    $scope.filter.area != data.filter.area ||
                    $scope.filter.supervisor != data.filter.supervisor ||
                    $scope.filter.foremen != data.filter.foremen ||
                    $scope.filter.mso != data.filter.mso) {
                    $scope.filter = data.filter;

                    filterChanged($scope.filter);
                }else if(data.filter.site){
                    // site is added to the filter from the map
                    if ($scope.filter.site && ($scope.filter.site != data.filter.site)){
                        $scope.filter = data.filter;
                        filterChanged($scope.filter);
                    }else{
                        $scope.filter = data.filter;
                        filterChanged($scope.filter);
                    }
                }

            }
            if(data.type == 'changeBreadcrumb'){

                var newFilter = angular.copy($scope.filter);
                switch(data.filterCrumb) {
                    case 'mso':
                        break;
                    case 'foremen':
                        newFilter.mso = null;
                        break;
                    case 'supervisor':
                        newFilter.mso = null;
                        newFilter.foremen = null;
                        break;
                    case 'area':
                        newFilter.mso = null;
                        newFilter.foremen = null;
                        newFilter.supervisor = null;
                        break;
                    case 'bu':
                        newFilter.mso = null;
                        newFilter.foremen = null;
                        newFilter.supervisor = null;
                        newFilter.area = null;
                        break;
                }
                filterChanged(newFilter);

            }


        }, $scope);

        function filterChanged(filter) {
            tankChartService.getTanks(filter).then(function (result) {
                // populate grid
                $scope.tanksForSite = [];
                var siteArray = [];

                angular.forEach(result, function (site) {
                    //only read a site once
                    var idx = siteArray.indexOf(site.siteIdNum);
                    if(idx == -1){
                        siteArray.push(site.siteIdNum);

                        tankChartService.getSiteTanks(site.siteIdNum).then(function (data) {
                            angular.forEach(data, function (tank){

                                var low = parseInt((tank.tankLowPercent/100)*tank.height);
                                var med = parseInt((tank.tankMedPercent/100)*tank.height);
                                var high= parseInt((tank.tankHighPercent/100)*tank.height);

                                if(isNaN(low)){
                                    low = 0;
                                }
                                if(isNaN(med)){
                                    med = 0;
                                }
                                if(isNaN(high)){
                                    high = 0;
                                }
                                if(isNaN(tank.height)){
                                    tank.height = 0;
                                }
                                if(isNaN(tank.level)){
                                    tank.level = 0;
                                }

                                tank.siteName =  site.name;
                                tank.value = parseInt(tank.level);
                                tank.upperLimit = parseInt(tank.height);
                                tank.lowerLimit = 0;
                                tank.unit = "ft";
                                tank.precision = 2;
                                tank.ranges = [
                                    {
                                        min: 0,
                                        max: low,
                                        color: '#8DCA2F'
                                    },
                                    {
                                        min: low,
                                        max: high,
                                        color: '#FF7700'
                                    },
                                    {
                                        min: high,
                                        max: parseInt(tank.height),
                                        color: '#C50200'
                                    }
                                ];
                                $scope.tanksForSite.push(tank);

                            });
                        });

                    }

                });
            });

        }

        /*
         listTanksForSite

         site:6230062301425 -- siteIdNum
         page:1
         start:0
         limit:25
         sort:[{"property":"type","direction":"ASC"},{"property":"percent","direction":"DESC"}]
         Response Headersview source

         {"tankNum":8592,
         "type":"OIL",
         "scada":"false",
         "capacity":400.3064,
         "remaining":340.26000,
         "inventory":60.04640,
         "rate":0.00000,
         "fillDate":null,
         "percent":15.000000000000000,
         "level":3.000000,  -- this is the level in the tanks
         "height":20.000,
         "tankHighPercent":75.00,
         "tankMedPercent":60.00,
         "tankLowPercent":40.00}

         */



    })

    .directive('tanker', function () {
        return {
            restrict: 'E',
            template:
//                '<div ng-class="level {{color}}" style="height:{{percent}}%">' +
                '<div class="level red" style="height:100%">' +
        '<div class="l1">{{level}} ft</div>' +
        '<div class="l2"></div>' +
        '<div class="l3"></div>' +
        '</div>' +
        '</div>' +
        '<div class="container-shell">' +
        '<div class="level shell">' +
        '<div class="l1"></div>' +
        '<div class="l2"></div>' +
        '<div class="l3"></div>' +
        '</div>' +
        '</div>' +
 //           '<div ng-class="base {{type|lowercase}}"><div></div>' +
            '<div class="base oil"><div></div>' +
        '<div class="name">{{tank}} - {{type}}</div>',
            scope: {
                percent: '@percent',
                color: '@color',
                level: '@level',
                type: '@type',
                tank: '@tank'
            },

        link: function(scope, element, attrs) {
                $(element[0]).on('click', function() {


                });
            }
        };
    })
    .directive('ngRadialGauge', ['$window', '$timeout',
    function ($window, $timeout) {
        return {
            restrict: 'A',
            scope: {
                lowerLimit: '=',
                upperLimit: '=',
                ranges: '=',
                value: '=',
                valueUnit: '=',
                precision: '=',
                label: '@',
                onClick: '&'
            },
            link: function (scope, ele, attrs) {
                "use strict";
                    var renderTimeout;
                    var width = parseInt(attrs.width) || 300;
                    var innerRadius = Math.round((width * 130) / 300);
                    var outterRadius = Math.round((width * 145) / 300);
                    var majorGraduations = parseInt(attrs.majorGraduations - 1) || 5;
                    var minorGraduations = parseInt(attrs.minorGraduations) || 10;
                    var majorGraduationLenght = Math.round((width * 16) / 300);
                    var minorGraduationLenght = Math.round((width * 10) / 300);
                    var majorGraduationMarginTop = Math.round((width * 7) / 300);
                    var majorGraduationColor = attrs.majorGraduationColor || "#B0B0B0";
                    var minorGraduationColor = attrs.minorGraduationColor || "#D0D0D0";
                    var majorGraduationTextColor = attrs.majorGraduationTextColor || "#6C6C6C";
                    var needleColor = attrs.needleColor || "#416094";
                    var valueVerticalOffset = Math.round((width * 30) / 300);
                    var unactiveColor = "#D7D7D7";
                    var majorGraduationTextSize = parseInt(attrs.majorGraduationTextSize);
                    var needleValueTextSize = parseInt(attrs.needleValueTextSize);

                    var svg = d3.select(ele[0])
                        .append('svg')
                        .attr('width', width)
                        .attr('height', width * 0.75);
                    var renderMajorGraduations = function (majorGraduationsAngles) {
                        var centerX = width / 2;
                        var centerY = width / 2;
                        //Render Major Graduations
                        $.each(majorGraduationsAngles, function (index, value) {
                            var cos1Adj = Math.round(Math.cos((90 - value) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - majorGraduationLenght));
                            var sin1Adj = Math.round(Math.sin((90 - value) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - majorGraduationLenght));
                            var cos2Adj = Math.round(Math.cos((90 - value) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop));
                            var sin2Adj = Math.round(Math.sin((90 - value) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop));
                            var x1 = centerX + cos1Adj;
                            var y1 = centerY + sin1Adj * -1;
                            var x2 = centerX + cos2Adj;
                            var y2 = centerY + sin2Adj * -1;
                            svg.append("svg:line")
                                .attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                                .style("stroke", majorGraduationColor);

                            renderMinorGraduations(majorGraduationsAngles, index);
                        });
                    };
                    var renderMinorGraduations = function (majorGraduationsAngles, indexMajor) {
                        var minorGraduationsAngles = [];

                        if (indexMajor > 0) {
                            var minScale = majorGraduationsAngles[indexMajor - 1];
                            var maxScale = majorGraduationsAngles[indexMajor];
                            var scaleRange = maxScale - minScale;

                            for (var i = 1; i < minorGraduations; i++) {
                                var scaleValue = minScale + i * scaleRange / minorGraduations;
                                minorGraduationsAngles.push(scaleValue);
                            }

                            var centerX = width / 2;
                            var centerY = width / 2;
                            //Render Minor Graduations
                            $.each(minorGraduationsAngles, function (indexMinor, value) {
                                var cos1Adj = Math.round(Math.cos((90 - value) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - minorGraduationLenght));
                                var sin1Adj = Math.round(Math.sin((90 - value) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - minorGraduationLenght));
                                var cos2Adj = Math.round(Math.cos((90 - value) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop));
                                var sin2Adj = Math.round(Math.sin((90 - value) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop));
                                var x1 = centerX + cos1Adj;
                                var y1 = centerY + sin1Adj * -1;
                                var x2 = centerX + cos2Adj;
                                var y2 = centerY + sin2Adj * -1;
                                svg.append("svg:line")
                                    .attr("x1", x1)
                                    .attr("y1", y1)
                                    .attr("x2", x2)
                                    .attr("y2", y2)
                                    .style("stroke", minorGraduationColor);
                            });
                        }
                    };
                    var getMajorGraduationValues = function (minLimit, maxLimit) {
                        var scaleRange = maxLimit - minLimit;
                        var majorGraduationValues = [];
                        for (var i = 0; i <= majorGraduations; i++) {
                            var scaleValue = minLimit + i * scaleRange / (majorGraduations);
                            majorGraduationValues.push(scaleValue.toFixed(scope.precision));
                        }

                        return majorGraduationValues;
                    };
                    var getMajorGraduationAngles = function () {
                        var scaleRange = 240;
                        var minScale = -120;
                        var graduationsAngles = [];
                        for (var i = 0; i <= majorGraduations; i++) {
                            var scaleValue = minScale + i * scaleRange / (majorGraduations);
                            graduationsAngles.push(scaleValue);
                        }

                        return graduationsAngles;
                    };
                    var renderMajorGraduationTexts = function (majorGraduationsAngles, majorGraduationValues) {
                        if (!scope.ranges) return;

                        var centerX = width / 2;
                        var centerY = width / 2;
                        var textVerticalPadding = 5;
                        var textHorizontalPadding = 5;

                        var lastGraduationValue = majorGraduationValues[majorGraduationValues.length - 1];
                        var textSize = isNaN(majorGraduationTextSize) ? (width * 12) / 300 : majorGraduationTextSize;
                        var fontStyle = textSize + "px Courier";

                        var dummyText = svg.append("text")
                            .attr("x", centerX)
                            .attr("y", centerY)
                            .attr("fill", "transparent")
                            .attr("text-anchor", "middle")
                            .style("font", fontStyle)
                            .text(lastGraduationValue + scope.valueUnit);

                        var textWidth = dummyText.node().getBBox().width;

                        for (var i = 0; i < majorGraduationsAngles.length; i++) {
                            var angle = majorGraduationsAngles[i];
                            var cos1Adj = Math.round(Math.cos((90 - angle) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - majorGraduationLenght - textHorizontalPadding));
                            var sin1Adj = Math.round(Math.sin((90 - angle) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - majorGraduationLenght - textVerticalPadding));

                            var sin1Factor = 1;
                            if (sin1Adj < 0) sin1Factor = 1.1;
                            if (sin1Adj > 0) sin1Factor = 0.9;
                            if (cos1Adj > 0) {
                                if (angle > 0 && angle < 45) {
                                    cos1Adj -= textWidth / 2;
                                } else {
                                    cos1Adj -= textWidth;
                                }
                            }
                            if (cos1Adj < 0) {
                                if (angle < 0 && angle > -45) {
                                    cos1Adj -= textWidth / 2;
                                }
                            }
                            if (cos1Adj == 0) {
                                cos1Adj -= angle == 0 ? textWidth / 4 : textWidth / 2;
                            }

                            var x1 = centerX + cos1Adj;
                            var y1 = centerY + sin1Adj * sin1Factor * -1;

                            svg.append("text")
                                .attr("class", "mtt-majorGraduationText")
                                .style("font", fontStyle)
                                .attr("text-align", "center")
                                .attr("x", x1)
                                .attr("dy", y1)
                                .attr("fill", majorGraduationTextColor)
                                .text(majorGraduationValues[i] + scope.valueUnit);
                        }
                    };
                    var renderGraduationNeedle = function (minLimit, maxLimit) {
                        var centerX = width / 2;
                        var centerY = width / 2;
                        var centerColor;

                        if (typeof scope.value === 'undefined') {
                            centerColor = unactiveColor;
                        } else {
                            centerColor = needleColor;
                            var needleValue = ((scope.value - minLimit) * 240 / (maxLimit - minLimit)) - 30;
                            var thetaRad = needleValue * Math.PI / 180;

                            var needleLen = innerRadius - majorGraduationLenght - majorGraduationMarginTop;
                            var needleRadius = (width * 2.5) / 300;
                            var topX = centerX - needleLen * Math.cos(thetaRad);
                            var topY = centerY - needleLen * Math.sin(thetaRad);
                            var leftX = centerX - needleRadius * Math.cos(thetaRad - Math.PI / 2);
                            var leftY = centerY - needleRadius * Math.sin(thetaRad - Math.PI / 2);
                            var rightX = centerX - needleRadius * Math.cos(thetaRad + Math.PI / 2);
                            var rightY = centerY - needleRadius * Math.sin(thetaRad + Math.PI / 2);
                            var triangle = "M " + leftX + " " + leftY + " L " + topX + " " + topY + " L " + rightX + " " + rightY;
                            var textSize = isNaN(needleValueTextSize) ? (width * 12) / 300 : needleValueTextSize;
                            var fontStyle = textSize + "px Courier";

                            if (scope.value >= minLimit && scope.value <= maxLimit) {
                                svg.append("svg:path")
                                    .attr("d", triangle)
                                    .style("stroke-width", 1)
                                    .style("stroke", needleColor)
                                    .style("fill", needleColor);
                            }

                            svg.append("text")
                                .attr("x", centerX)
                                .attr("y", centerY + valueVerticalOffset)
                                .attr("class", "mtt-graduationValueText")
                                .attr("fill", needleColor)
                                .attr("text-anchor", "middle")
                                .attr("font-weight", "bold")
                                .style("font", fontStyle)
                                .text('[ ' + scope.value.toFixed(scope.precision) + scope.valueUnit + ' ]');
                        }

                        var circleRadius = (width * 6) / 300;

                        svg.append("circle")
                            .attr("r", circleRadius)
                            .attr("cy", centerX)
                            .attr("cx", centerY)
                            .attr("fill", centerColor);
                    };
                    $window.onresize = function () {
                        scope.$apply();
                    };
                    scope.$watch(function () {
                        return angular.element($window)[0].innerWidth;
                    }, function () {
                        scope.render();
                    });
                    scope.$watch('ranges', function () {
                        scope.render();
                    }, true);
                    scope.$watch('value', function () {
                        scope.render();
                    }, true);
                    scope.render = function () {
                        svg.selectAll('*').remove();

                        if (renderTimeout) clearTimeout(renderTimeout);

                        renderTimeout = $timeout(function () {

                            var maxLimit = scope.upperLimit ? scope.upperLimit : 100;
                            var minLimit = scope.lowerLimit ? scope.lowerLimit : 0;
                            var d3DataSource = [];

                            if (typeof scope.ranges === 'undefined') {
                                d3DataSource.push([minLimit, maxLimit, unactiveColor]);
                            } else {
                                //Data Generation
                                $.each(scope.ranges, function (index, value) {
                                    d3DataSource.push([value.min, value.max, value.color]);
                                });
                            }

                            //Render Gauge Color Area
                            var translate = "translate(" + width / 2 + "," + width / 2 + ")";
                            var cScale = d3.scale.linear().domain([minLimit, maxLimit]).range([-120 * (Math.PI / 180), 120 * (Math.PI / 180)]);
                            var arc = d3.svg.arc()
                                .innerRadius(innerRadius)
                                .outerRadius(outterRadius)
                                .startAngle(function (d) { return cScale(d[0]); })
                                .endAngle(function (d) { return cScale(d[1]); });
                            svg.selectAll("path")
                                .data(d3DataSource)
                                .enter()
                                .append("path")
                                .attr("d", arc)
                                .style("fill", function (d) { return d[2]; })
                                .attr("transform", translate);

                            var majorGraduationsAngles = getMajorGraduationAngles();
                            var majorGraduationValues = getMajorGraduationValues(minLimit, maxLimit);
                            renderMajorGraduations(majorGraduationsAngles);
                            renderMajorGraduationTexts(majorGraduationsAngles, majorGraduationValues);
                            renderGraduationNeedle(minLimit, maxLimit);
                        }, 200);
                    };
            }
        };
    }]);
