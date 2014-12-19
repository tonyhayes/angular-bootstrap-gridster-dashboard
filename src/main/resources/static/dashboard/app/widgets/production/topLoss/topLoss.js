
'use strict';

angular.module('dm.widgets.topLoss', ['dashboard.provider', 'nvd3'])
    .config(function (dashboardProvider) {
        dashboardProvider
            .widget('topLoss', {
                title: 'Top Loss Chart',
                description: 'Display Top Loss Production Chart',
                templateUrl: 'dashboard/app/widgets/production/topLoss/topLossChart.html',
                controller: 'topLossController',
                edit: {
                    templateUrl: 'dashboard/app/widgets/task/grid/edit.html',
                    controller: 'taskEditController',
                    reload: true

                }
            });
    })
    .service('topLossService', function ($q, $http) {
        return {
            getProduction: function (filter, qdate) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/topLosses', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor, foremen:  filter.foremen, msos:  filter.mso,
                        queryType:'code',
                        date:qdate /*2014-05-01*/,

                        limit:25, pageSize:10, page:1,
                        start:0,
                        sort:[{"property":"loss","direction":"ASC"}]}})
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
    .controller('topLossController', function ($scope, $timeout, config, topLossService, msgBus) {
        $scope.data = [];
        var chartData = [];
        if(!$scope.type){
            $scope.type = 'open';
        }
        var topLossDate = new Date();


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

                    filterChanged($scope.filter,topLossDate);
                }else if(data.filter.site){
                    // site is added to the filter from the map
                    if ($scope.filter.site && ($scope.filter.site != data.filter.site)){
                        $scope.filter = data.filter;
                        filterChanged($scope.filter,topLossDate);
                    }else{
                        $scope.filter = data.filter;
                        filterChanged($scope.filter,topLossDate);
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
                filterChanged(newFilter, topLossDate);

            }
            if(data.productionDateYMD){
                topLossDate = data.productionDateYMD;
                filterChanged($scope.filter, topLossDate);

            }


        }, $scope);

        function filterChanged(filter,topLossDate) {
            topLossService.getProduction(filter, topLossDate).then(function (result) {
                // populate grid
                var valuesGas = [];
                var valuesOil = [];
                angular.forEach(result, function (chartData) {
                    valuesGas.push({"label": chartData.name, "value": chartData.high});
                    valuesOil.push({"label": chartData.name, "value": chartData.med});
                });
                $scope.data = [
                    {
                        key: 'Gas',
                        color: 'red',
                        values: valuesGas
                    },
                    {
                        key: 'Oil',
                        color: 'green',
                        values: valuesOil
                    }
                ];

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
                    left: 150
                },
                x: function (d) {
                    return d.label;
                },
                y: function (d) {
                    return d.value;
                },
                showControls: true,
                stacked: true,
                showValues: true,
                valueFormat: function (d) {
                    return d3.format('s,.4f')(d);
                },
                transitionDuration: 500,
                noData: 'No Loss Data Found',
                xAxis: {
                    showMaxMin: false
                },
                yAxis: {
                    axisLabel: $scope.type + ' tasks' ,
                    tickFormat: function (d) {
                        return d3.format('s,.2f')(d);
                    }
                }
            }

        }
        ;




    })


;