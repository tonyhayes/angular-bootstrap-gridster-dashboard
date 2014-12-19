
'use strict';

angular.module('dm.widgets.productionTarget', ['dashboard.provider', 'nvd3'])
    .config(function (dashboardProvider) {
        dashboardProvider
            .widget('productionTarget', {
                title: 'Production - Monthly',
                description: 'Target vs. Actual Production',
                templateUrl: 'dashboard/app/widgets/production/targetChart/productionTarget.html',
                controller: 'productionTargetController',
                edit: {
                    templateUrl: 'dashboard/app/widgets/filter/edit.html',
                    controller: 'filterEditController',
                    reload: true

                }
            });
    })
    .service('productionTargetService', function ($q, $http) {
        return {
            getProduction: function (filter) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/aggregateProduction', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor, foremen:  filter.foremen, msos:  filter.mso, siteIDNums:filter.site,
                        limit:25}})
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
    .controller('productionTargetController', function ($scope, $timeout, config, productionTargetService, msgBus) {
        $scope.data = [];
        var chartData = [];


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
            productionTargetService.getProduction(filter).then(function (result) {
                // populate grid
                var targetValues = [];
                var actualValues = [];
                angular.forEach(result, function (chartData) {
                    var d = new Date(chartData.date).getTime();
                    targetValues.push([ d,  chartData.target]);
                    actualValues.push([ d, chartData.actual]);
                });
                $scope.data = [{"key" : "Actual" ,"values" :actualValues, "bar": true
                    /*,area: true,color: 'blue'*/},
                    {"key" : "Target" ,"values" :targetValues/*, area: true, color: '#7777ff'*/}];

            });

        }
        $scope.options = {
            chart: {
                type: 'lineChart',
                height: 300,
                margin : {
                    top: 130,
                    right: 75,
                    bottom: 50,
                    left: 75
                },
                x: function(d, i){return i;},
                y: function(d){return d[1];},
                color: d3.scale.category10().range(),
                transitionDuration: 250,
                xAxis: {
                    axisLabel: 'Production - Target vs. Actual',
                    showMaxMin: false,
                    tickFormat: function(d) {
                        var dx = $scope.data[0].values[d] && $scope.data[0].values[d][0] || 0;
                        return dx ? d3.time.format('%x')(new Date(dx)) : '';
                    }
                },
                yAxis: {
                    axisLabel: 'Gross BOE',
                    tickFormat: function(d){
                        return d3.format('f')(d);
                    }
                },
                dispatch: {
                    tooltipShow: function(e){
                        console.log("tooltipShow");
                        var date = new Date(e.point[0]);
                        var ymd = d3.time.format('%Y-%m-%d')(new Date(e.point[0]));
                        if(ymd){
                            msgBus.emitMsg(config.publish, {'productionDateYMD': ymd, 'productionDateObj': date}, 'l48', 'productionChartDate');
                        }

                    }
                }
            }
        };




    })


;