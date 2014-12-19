
'use strict';

angular.module('dm.widgets.productionDaily', ['dashboard.provider', 'nvd3'])
    .config(function (dashboardProvider) {
        dashboardProvider
            .widget('productionDaily', {
                title: 'Production - Daily',
                description: 'Daily Production vs Loss',
                templateUrl: 'dashboard/app/widgets/production/dailyChart/productionDaily.html',
                controller: 'productionDailyController',
                edit: {
                    templateUrl: 'dashboard/app/widgets/filter/edit.html',
                    controller: 'filterEditController',
                    reload: true

                }
            });
    })
    .service('productionDailyService', function ($q, $http) {
        return {
            getProduction: function (filter,qdate) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/dailyProduction', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor, foremen:  filter.foremen, msos:  filter.mso,
                        siteIDNums: filter.site,
                        date:qdate,
                        page:1,
                        start:0,
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
    .controller('productionDailyController', function ($scope, $timeout, config, productionDailyService, msgBus) {
        $scope.data = [];
        var chartData = [];
        var dailyProductionDate = new Date();


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

                    filterChanged($scope.filter,dailyProductionDate);
                }else if(data.filter.site){
                    // site is added to the filter from the map
                    if ($scope.filter.site && ($scope.filter.site != data.filter.site)){
                        $scope.filter = data.filter;
                        filterChanged($scope.filter,dailyProductionDate);
                    }else{
                        $scope.filter = data.filter;
                        filterChanged($scope.filter,dailyProductionDate);
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
                filterChanged(newFilter, dailyProductionDate);

            }
            if(data.productionDateYMD){
                dailyProductionDate = data.productionDateYMD;
                filterChanged($scope.filter, dailyProductionDate);

            }


        }, $scope);
        /*
         {"name":"Roger Clayton",
         "actual":7860.39,
         "target":8814.29,
         "gas":7764.150000,
         "oil":96.24,
         "loss":null,
         "controllable":0.000000,
         "noncontrollable":0.000000,
         "date":"2014-04-23"}]}
         */

        function filterChanged(filter,date) {
            productionDailyService.getProduction(filter, date).then(function (result) {
                // populate grid
                var valuesProduction = [];
                var valuesLoss = [];
                angular.forEach(result, function (chartData) {
                    valuesProduction.push({"label": chartData.name, "value": chartData.actual, record:chartData });
                    valuesLoss.push({"label": chartData.name, "value": chartData.loss, record:chartData});
                });
                $scope.data = [
                    {
                        key: 'Production',
                        color: 'green',
                        values: valuesProduction
                    },
                    {
                        key: 'Loss',
                        color: 'red',
                        values: valuesLoss
                    }
                ];
                $scope.options.chart.height = 200;
                if((valuesProduction.length * 40) > 200){
                    $scope.options.chart.height = valuesProduction.length * 40;
                }
                $scope.options.chart.yAxis.axisLabel = 'Daily Production for '+ date;

            });

        }
        $scope.options =  {
            chart: {
                type: 'multiBarHorizontalChart',
                height: 200,
                margin: {
                    top: 20,
                    right: 50,
                    bottom: 60,
                    left: 175
                },
                x: function (d) {
                    return d.label;
                },
                y: function (d) {
                    return d.value;
                },
                showControls: true,
                stacked: true,
                tooltip:function(key, x, y, e, graph) {
                    /*
                     actual: 4681.67
                     controllable: 0
                     date: "2014-04-28"
                     gas: 4681.666666
                     loss: null
                     name: "BIG HORN 5-6"
                     noncontrollable: 0
                     oil: 0
                     target: 4820.56
                     */
                    var d = e.series.values[e.pointIndex].record;
                    var out = '<h3>' + e.series.key +' - '+x+ '</h3>';
                    out += '<dl >';
                    out += '<dt> &nbsp;&nbsp;Total:</dt>';
                    out += '<dd>' + '&nbsp;&nbsp;&nbsp;Actual : '+ d.actual+ '</dd>';
                    out += '<dd>' + '&nbsp;&nbsp;&nbsp;Target : '+ d.target+ '</dd>';
                    out += '<dt>&nbsp;&nbsp;BOE:</dt>';
                    out += '<dd>' + '&nbsp;&nbsp;&nbsp;Oil : '+ d.oil+ '</dd>';
                    out += '<dd>' + '&nbsp;&nbsp;&nbsp;Gas : '+ d.gas+ '</dd>';
                    out += '<dt>&nbsp;&nbsp;Loss:</dt>';
                    out += '<dd>' + '&nbsp;&nbsp;&nbsp;Loss : '+ d.loss+ '</dd>';
                    out += '<dd>' + '&nbsp;&nbsp;&nbsp;Controllable : '+ d.controllable+ '%</dd>';
                    out += '<dd>' + '&nbsp;&nbsp;&nbsp;Non-Controllable : '+ d.controllable+ '%</dd>';
                    out += '</dl>';


                    return out;
                },
                showValues: true,
                valueFormat: function (d) {
                    return d3.format('s,.4f')(d);
                },
                transitionDuration: 500,
                noData: 'No Daily Data Found',
                xAxis: {
                    showMaxMin: false
                },
                yAxis: {
                    axisLabel: 'Daily Production for '+dailyProductionDate ,
                    tickFormat: function (d) {
                        return d3.format('s,.2f')(d);
                    }
                }
            }

        }
        ;

    })


;