
'use strict';

angular.module('dm.widgets.taskType', ['dashboard.provider', 'nvd3'])
    .config(function (dashboardProvider) {
        dashboardProvider
            .widget('taskType', {
                title: 'Tasks Chart',
                description: 'Display tasks by type',
                templateUrl: 'dashboard/app/widgets/task/chart/taskTypeChart.html',
                controller: 'taskTypeController',
                edit: {
                    templateUrl: 'dashboard/app/widgets/task/grid/edit.html',
                    controller: 'taskEditController',
                    reload: true

                }
            });
    })
    .service('taskTypeService', function ($q, $http) {
        return {
            getTasks: function (filter) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/unresolvedTasksByType', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor, foremen:  filter.foremen, msos:  filter.mso,
                        site:filter.siteName, siteIDNums:filter.site,
                        limit:25, sort:[{"property":"total","direction":"ASC"}]}})
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
    .controller('taskTypeController', function ($scope, $timeout, config, taskTypeService, msgBus) {
        $scope.data = [];
        var chartData = [];
        /*
        need to change the api to allow a status to be part of the request
         */
//        $scope.type = config.type;
        if(!$scope.type){
            $scope.type = 'open';
        }


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
            taskTypeService.getTasks(filter).then(function (result) {
                // populate grid
                /*
                 {"name":"Autotick Mismatch","high":3,"med":0,"low":2}
                 */
                var valuesHigh = [];
                var valuesMed = [];
                var valuesLow = [];
                angular.forEach(result, function (chartData) {
                    valuesHigh.push({"label": chartData.name, "value": chartData.high});
                    valuesMed.push({"label": chartData.name, "value": chartData.med});
                    valuesLow.push({"label": chartData.name, "value": chartData.low});
                });
                $scope.data = [
                    {
                        key: 'High',
                        color: 'red',
                        values: valuesHigh
                    },
                    {
                        key: 'Medium',
                        color: 'orange',
                        values: valuesMed
                    },
                    {
                        key: 'Low',
                        color: 'green',
                        values: valuesLow
                    }
                ];

            });

        }
        $scope.options =  {
            chart: {
                type: 'multiBarHorizontalChart',
                height: 400,
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