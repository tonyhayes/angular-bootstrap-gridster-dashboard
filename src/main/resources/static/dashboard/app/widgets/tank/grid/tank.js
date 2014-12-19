
'use strict';

angular.module('dm.widgets.tank', ['dashboard.provider','ngGrid'])
    .config(function (dashboardProvider) {
        dashboardProvider
            .widget('tank', {
                title: 'Tank Levels',
                description: 'Tank Levels',
                templateUrl: 'dashboard/app/widgets/tank/grid/tank.html',
                controller: 'tankController',
                edit: {
                    templateUrl: 'dashboard/app/widgets/filter/edit.html',
                    controller: 'filterEditController',
                    reload: true

                }
            });
    })

    .service('tankService', function ($q, $http) {
        return {
            getTanks: function (filter) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listTanks', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor, foremen:  filter.foremen, msos:  filter.mso, siteIDNums: filter.site,
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
            }
        };
    })
    .controller('tankController', function ($scope, $timeout, config, tankService, msgBus) {


        var removeIcon = "'glyphicon-remove" + "'";
        var okIcon = "'glyphicon-ok" + "'";
        var upIcon = "'glyphicon-arrow-up" + "'";
        var downIcon = "'glyphicon-arrow-down" + "'";

        var colDef = [];
        $scope.tasks = {};
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
            tankService.getTanks(filter).then(function (result) {
                angular.forEach(result, function (row) {

                    var totalCapacity = row['tankTotalOilCapacity'] + row['tankTotalWaterCapacity'];
                    var totalRemaining = row['tankTotalOilRemaining'] * row['tankTotalWaterRemaining'];

                    if (totalCapacity > 0) {
                        var percent = parseInt(((totalCapacity - totalRemaining) / totalCapacity) * 100, '0');
                        row.tankStatus = percent > row['tankAvgHighLevelPct'] ? false : true;
                    } else {
                        row.tankStatus = true;
                    }
                });
                // populate grid
                $scope.tanks = result;

            });

        }

       colDef =  [
           {
               field: 'siteId',
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/filterHeaderTemplate.html',
               width: '*',
               cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()">' +
                   '<span class="ngCellText" tooltip="{{row.entity.name}}" tooltip-placement="top" tooltip-append-to-body="true">{{row.entity.name}}</span></div>',
               displayName: 'Site Id',
               visible: false
           },
           {
               field: 'siteIdNum',
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/filterHeaderTemplate.html',
               width: '*',
               cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()">' +
                   '<span class="ngCellText" tooltip="{{row.entity.name}}" tooltip-placement="top" tooltip-append-to-body="true">{{row.entity.name}}</span></div>',
               displayName: 'Site Number',
               visible: false
           },
           {
                field: 'name',
                headerCellTemplate: 'dashboard/app/widgets/tank/grid/filterHeaderTemplate.html',
                width: '**',
                cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()">' +
                    '<span class="ngCellText" tooltip="{{row.entity.name}}" tooltip-placement="top" tooltip-append-to-body="true">{{row.entity.name}}</span></div>',
                displayName: 'Site'
            },
           {
               field: 'tankTotalWithScada',
               width: '*',
               cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()">' +
                   '<span class="ngCellText"  >' +
                   '<i class="glyphicon" ng-class="{'+removeIcon+' : row.entity.tankTotalWithScada,'+ okIcon+' : !row.entity.tankTotalWithScada}"></i>' +
               '</span></div>',
               displayName: 'SCADA'
           },
           {
               field: 'tankStatus',
               width: '*',
               cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()">' +
                   '<span class="ngCellText" ><i class="glyphicon" ng-class="{'+upIcon+' : row.entity.tankStatus,'+ downIcon+' : !row.entity.tankStatus}"></i></span></div>',
               displayName: 'Sts'
           },
            {
                headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
                field: 'tankTotalOilCapacity',
                width: '*',
                displayName: 'Oil Cap'
            },
            {
                headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
                field: 'tankTotalOilInventory',
                width: '*',
                displayName: 'Oil Inv'
            },
            {
                headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
                field: 'tankTotalOilRemaining',
                width: '*',
                displayName: 'Rem Oil Cap'
            },
           {
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
               field: 'tankOilFillRate',
               width: '*',
               displayName: 'Oil Rate'
           },
           {
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
               field: 'tankOilFillDate',
               width: '*',
               displayName: 'Oil Fill'
           },
           {
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
               field: 'tankTotalWaterCapacity',
               width: '*',
               displayName: 'Wtr Cap'
           },
           {
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
               field: 'tankTotalWaterInventory',
               width: '*',
               displayName: 'Wtr Inv'
           },
           {
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
               field: 'tankTotalWaterRemaining',
               width: '*',
               displayName: 'Rem Wtr Cap'
           },
           {
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
               field: 'tankWaterFillRate',
               width: '*',
               displayName: 'Wtr Rate'
           },
           {
               headerCellTemplate: 'dashboard/app/widgets/tank/grid/htmlHeaderTemplate.html',
               field: 'tankWaterFillDate',
               width: '*',
               displayName: 'Wtr Fill'
           }
        ];


        var filterBarPlugin = {
            init: function (scope, grid) {
                filterBarPlugin.scope = scope;
                filterBarPlugin.grid = grid;
                $scope.$watch(function () {
                    var searchQuery = "";
                    angular.forEach(filterBarPlugin.scope.columns, function (col) {
                        if (col.visible && col.filterText) {
                            var filterText = (col.filterText.indexOf('*') === 0 ? col.filterText.replace('*', '') : col.filterText) + ";";
                            searchQuery += col.displayName + ": " + filterText;
                        }
                    });
                    return searchQuery;
                }, function (searchQuery) {
                    filterBarPlugin.scope.$parent.filterText = searchQuery;
                    filterBarPlugin.grid.searchProvider.evalFilter();
                });
            },
            scope: undefined,
            grid: undefined
        };
        $scope.myTanks = {
            data: 'tanks',
//            showGroupPanel: true,
            groups: [],
            showColumnMenu: true,
            plugins: [filterBarPlugin],
            headerRowHeight: 60, // give room for filter bar
            rowTemplate: 'dashboard/app/widgets/tank/grid/rowTemplate.html',
            filterOptions: $scope.filterOptions,
            columnDefs: colDef
        };





     });



