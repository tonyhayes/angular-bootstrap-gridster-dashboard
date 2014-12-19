
'use strict';

angular.module('dm.widgets.task', ['dashboard.provider','ngGrid'])
    .config(function(flipConfigProvider){
        flipConfigProvider.setClassName("flipperCosmic");
        flipConfigProvider.setTempo("0.5s");
        flipConfigProvider.setDim({width:"300px", height:"300px"});
        flipConfigProvider.flipsOnClick(false);
    })

.config(function (dashboardProvider) {
        dashboardProvider
            .widget('task', {
                title: 'l48fieldManager Tasks',
                description: 'Task Manager',
                templateUrl: 'dashboard/app/widgets/task/grid/flip.html',
                controller: 'taskController',
                edit: {
                    templateUrl: 'dashboard/app/widgets/task/grid/edit.html',
                    controller: 'taskEditController',
                    reload: true

                }
            });
    })
    .service('filterTaskService', function ($q, $http) {
        return {
            getBU: function () {
                var deferred = $q.defer();
                $http.get( dmApplicationEntryPoint + '/listBizUnits')
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
            getAreas: function (bu) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listAreas', {
                    params: {bizUnits:  bu}})
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
            getSupervisors: function (bu, area) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listSupervisors', {
                    params: {bizUnits:  bu, areas:  area}})
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
            getForemen: function (bu, area, supervisor) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listForemen', {
                    params: {bizUnits:  bu, areas:  area, supervisors:  supervisor }})
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
            getMSOs: function (bu, area, supervisor, foremen) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listMSOs', {
                    params: {bizUnits:  bu, areas:  area, supervisors:  supervisor, foremen:  foremen}})
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
            getTaskTypes: function () {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listTaskTypes')
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
            getSites: function (filter) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/listSites', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor,
                        foremen:  filter.foremen, msos: filter.mso}})
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
            postTask: function (name, type, level, site, mso, due, description) {
                var deferred = $q.defer();
                var data = {name:name, type:type, level:level, site:site, mso:mso, due:due, description:description  };
                $http.post(dmApplicationEntryPoint + '/createTask',
                    data)
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
    .service('taskService', function ($q, $http) {
        return {
            getTasks: function (filter, type) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/tasks', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor, foremen:  filter.foremen, msos:  filter.mso, type:  type, siteIDNums: filter.site,
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
    .controller('taskController', function ($scope, $timeout, $filter,
                                            config, taskService, filterTaskService, msgBus, ModalService) {

    /*


    l48fieldManager tasks
    1. load tasks to grid based on filter
        1.1 different filter level = different grid columns
        1.2 mso level view = 2 grids - 1 resolved; 1 open
    2. button to add new task
        2.1 modal
        2.2 on submit, send to host
    3. subscribe to filter changes, breadcrumb changes
    4. double click on mso row sends event to widgets with row payload
    5. click on row will open ticket for display - msp level only

     */
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


        $scope.type = config.type;
        if(!$scope.type){
            $scope.type = 'open';
        }
        $scope.tasklevels =[{value: 'L', text: 'Low'},{ value: 'M', text: 'Medium' },{ value: 'H', text: 'High' }];
        $scope.taskTypes =[];
        $scope.sites =[];
        $scope.msos =[];

        $scope.flip = "front";

        function toggle(value){
            if(value === "front"){
                return "back";
            }
            else {
                return "front";
            }
        }

        $scope.toggleFlip = function(){
            $scope.flip = toggle($scope.flip);
        };

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

                if($scope.filter.bu != data.filter.bu &&
                    $scope.filter.area != data.filter.area &&
                    $scope.filter.supervisor != data.filter.supervisor &&
                    $scope.filter.foremen != data.filter.foremen &&
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
            taskService.getTasks(filter, $scope.type).then(function (result) {
                // populate grid
                $scope.tasks = result;

            });
            // in case of task creation
            filterTaskService.getSites(filter).then(function (result) {
                $scope.sites = result;
            });
            filterTaskService.getTaskTypes().then(function (result) {
                $scope.taskTypes = result;
            });
            filterTaskService.getMSOs(filter.bu,filter.area, filter.supervisor, filter.foremen).then(function (result) {
                $scope.msos = result;
            });

        }

            switch($scope.type) {
                case 'open':
                    colDef =  [
                        {
                            field: 'name',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '**',
                            cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()">' +
                                '<span class="ngCellText" tooltip="{{row.entity.name}}" tooltip-placement="top" tooltip-append-to-body="true">{{row.entity.name}}</span></div>',
                            displayName: 'Name'
                        },
                        {
                            field: 'priorityLevel',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            displayName: 'Priority'
                        },
                        {
                            field: 'site',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '**',
                            cellTemplate : '<div ng-click="getSite(row.entity.site)" class="ngCellText"  ng-class="col.colIndex()">' +
                                '<span class="ngCellText" tooltip="{{row.entity.site}}" tooltip-placement="top" tooltip-append-to-body="true">{{row.entity.site}}</span></div>',
                            displayName: 'Site'
                        },
                        {
                            field: 'mso',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            displayName: 'MSO'
                        },
                        {
                            field: 'due',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            cellFilter: 'date',
                            displayName: 'due'
                        },
                        {
                            field: 'description',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '****',
                            cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()">' +
                                '<span class="ngCellText" tooltip="{{row.entity.description}}" tooltip-placement="left" tooltip-append-to-body="true">{{row.entity.description}}</span></div>',
                            displayName: 'Description'
                        }
                    ];
                    break;
                case 'resolved':
                    colDef =  [
                        {
                            field: 'name',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()"><span class="ngCellText" tooltip="{{row.entity.name}}" tooltip-placement="top" tooltip-append-to-body="true">{{row.entity.name}}</span></div>',
                            width: '**',
                            displayName: 'Name'
                        },
                        {
                            field: 'priorityLevel',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            displayName: 'Priority'
                        },
                        {
                            field: 'site',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '**',
                            displayName: 'Site'
                        },
                        {
                            field: 'mso',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            displayName: 'MSO'
                        },
                        {
                            field: 'resolvedDate',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            cellFilter: 'date',
                            displayName: 'Resolved'
                        },
                        {
                            field: 'description',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            cellTemplate : '<div class="ngCellText" ng-class="col.colIndex()"><span class="ngCellText" tooltip="{{row.entity.description}}" tooltip-placement="left" tooltip-append-to-body="true">{{row.entity.description}}</span></div>',
                            width: '****',
                            displayName: 'Description'
                        }
                    ];
                    break;
                case 'totals':
                    colDef =  [
                        {
                            field: 'name',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '***',
                            displayName: 'Name'
                        },
                        {
                            field: 'high',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            displayName: 'High'
                        },
                        {
                            field: 'med',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            displayName: 'Medium'
                        },
                        {
                            field: 'low',
                            headerCellTemplate: 'dashboard/app/widgets/task/grid/filterHeaderTemplate.html',
                            width: '*',
                            displayName: 'Low'
                        }
                    ];
                    break;
            }

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
        $scope.myTasks = {
            data: 'tasks',
            showGroupPanel: true,
            groups: [],
            showColumnMenu: true,
            plugins: [filterBarPlugin],
            headerRowHeight: 60, // give room for filter bar
            rowTemplate: 'dashboard/app/widgets/task/grid/rowTemplate.html',
            filterOptions: $scope.filterOptions,
            columnDefs: colDef
        };


        $scope.createTask = function () {
            console.log('createTask');
            $scope.master = {};
            $scope.master.taskName = '';
            $scope.master.taskType = '';
            $scope.master.value = 'L';
            $scope.master.site = '';
            $scope.master.mso = '';
            $scope.master.dueDate = new Date();
            $scope.master.description = '';
            if($scope.msos.length == 1){
                $scope.master.mso = $scope.msos[0]
            }


            $scope.flip = toggle($scope.flip);
            if($scope.taskForm){
                $scope.taskForm.$setPristine();
            }
        };

        $scope.submitForm = function () {

            if (!$scope.master.dueDate){
                $scope.master.dueDate = new Date();
            }
            //name, type, level, site, mso, due, description
            filterTaskService.postTask($scope.master.taskName,
                $scope.master.taskType,
                $scope.master.value,
                $scope.master.site,
                $scope.master.mso,
                $filter('date')($scope.master.dueDate,'yyyy-MM-dd'),
                $scope.master.description

            ).then(function (result) {

                    msgBus.emitMsg(config.publish, {type: 'taskCreation', 'task':  angular.copy($scope.master)}, ',task', 'l48fieldmanagerTaskCreator' );

                });

            $scope.flip = toggle($scope.flip);
        };

    })

    .controller('taskEditController', function ($scope, $timeout, config, filterTaskService ) {


        $scope.config = config;
        $scope.typeData = ['open', 'resolved', 'totals'];

        filterTaskService.getBU().then(function (result) {
            $scope.businessUnitData = result;
        });

        $scope.$watch("config.bu", function (bu) {
            // get areas
            if(bu){
                filterTaskService.getAreas(bu).then(function (result) {
                    $scope.areaData = result;
                    $scope.supervisorData = [];
                    $scope.foremenData = [];
                    $scope.msoData = [];

                });
            }
        });
        $scope.$watch("config.area", function (area) {
            // get supervisor
            if(area){
                filterTaskService.getSupervisors($scope.config.bu, area).then(function (result) {
                    $scope.supervisorData = result;
                    $scope.foremenData = [];
                    $scope.msoData = [];
                });
            }
        });
        $scope.$watch("config.supervisor", function (supervisor) {
            // get foreman
            if(supervisor){
                filterTaskService.getForemen($scope.config.bu, $scope.config.area, supervisor).then(function (result) {
                    $scope.foremenData = result;
                    $scope.msoData = [];
                });
            }
        });
        $scope.$watch("config.foremen", function (foremen) {
            // get mso
            if(foremen){
                filterTaskService.getMSOs($scope.config.bu, $scope.config.area, $scope.config.supervisor, foremen).then(function (result) {
                    $scope.msoData = result;
                });
            }
        });

    });



