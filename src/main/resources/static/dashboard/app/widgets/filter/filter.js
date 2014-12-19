
'use strict';

angular.module('dm.widgets.filter', ['dashboard.provider'])
    .config(function (dashboardProvider) {
        dashboardProvider
            .widget('filter', {
                title: 'Business Filter',
                description: 'Select L48fieldManager Filter',
                templateUrl: 'dashboard/app/widgets/filter/filter.html',
                controller: 'filterController',
                edit: {
                    templateUrl: 'dashboard/app/widgets/filter/edit.html',
                    controller: 'filterEditController',
                    reload: true
                },
                resolve: {
                    businessUnitData: function (filterService) {
                        return filterService.getBU();
                    }
                }
            });
    })
    .service('filterService', function ($q, $http) {
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
            }
        };
    })
    .controller('filterController', function ($scope, $timeout, config, businessUnitData, filterService, msgBus) {

    /*
    l48fieldManager filter
    1. allow the user to build a filter
    2. when the filter is "enabled", broadcast new filter settings
    3. allow filter levels to be added and removed and broadcast those changes
    4. allow a filter configuration to be set in edit mode - read the configuration on startup
    5. when re-enter dashboard, load and broadcast the last settings ...
     */
        $scope.filter = angular.copy(config);

        if($scope.filter.bu){
            // send broadcast master config to any subscribers
            msgBus.emitMsg(config.publish, {type: 'filterConfig', 'filter':  angular.copy($scope.filter)}, 'initialize', 'l48fieldmanagerFilter' );
            filterService.getAreas($scope.filter.bu).then(function (result) {
                $scope.areaData = result;

                if($scope.filter.area){
                    filterService.getSupervisors($scope.filter.bu, $scope.filter.area).then(function (result) {
                        $scope.supervisorData = result;

                        if($scope.filter.supervisor) {
                            filterService.getForemen($scope.filter.bu, $scope.filter.area,  $scope.filter.supervisor).then(function (result) {
                                $scope.foremenData = result;

                                if($scope.filter.foremen){
                                    filterService.getMSOs($scope.filter.bu, $scope.filter.area, $scope.filter.supervisor,  $scope.filter.foremen).then(function (result) {
                                        $scope.msoData = result;
                                    });
                                }
                            });
                        }
                    });

                }
            });
        }
        msgBus.onMsg(config.subscribe, function (event, data) {

            // assume noise in channel
            if(data.filter && data.filter.site){
                if($scope.filter.site != data.filter.site ){
                    $scope.filter.site =  data.filter.site;
                    $scope.filter.siteName =  data.filter.siteName;
                }
            }
        }, $scope);


        $scope.businessUnitData = businessUnitData;

        if ($scope.businessUnitData.length == 1){
            $scope.filter.bu = $scope.businessUnitData[0];

            filterService.getAreas($scope.filter.bu).then(function (result) {
                $scope.areaData = result;
            });

        }


        $scope.$watch("filter.bu", function (bu) {
            // get areas
            if(bu){
                filterService.getAreas(bu).then(function (result) {
                    $scope.areaData = result;
                    $scope.supervisorData = [];
                    $scope.foremenData = [];
                    $scope.msoData = [];

                    msgBus.emitMsg(config.publish, {type: 'changeBUFilter', 'filter': angular.copy($scope.filter)}, 'changeBU', 'l48fieldmanagerFilter' );
                });
            }
        });
        $scope.$watch("filter.area", function (area) {
            // get supervisor
            if(area){
                filterService.getSupervisors($scope.filter.bu, area).then(function (result) {
                    $scope.supervisorData = result;
                    $scope.foremenData = [];
                    $scope.msoData = [];
                    msgBus.emitMsg(config.publish, {type: 'changeAreaFilter','filter': angular.copy($scope.filter)}, 'changeArea', 'l48fieldmanagerFilter' );
                });
            }
        });
        $scope.$watch("filter.supervisor", function (supervisor) {
            // get foreman
            if(supervisor){
                filterService.getForemen($scope.filter.bu, $scope.filter.area, supervisor).then(function (result) {
                    $scope.foremenData = result;
                    $scope.msoData = [];
                    msgBus.emitMsg(config.publish, {type: 'changeSupervisorFilter','filter': angular.copy($scope.filter)}, 'changeSupervisor', 'l48fieldmanagerFilter' );
                });
            }
        });
        $scope.$watch("filter.foremen", function (foremen) {
            // get mso
            if(foremen){
                filterService.getMSOs($scope.filter.bu, $scope.filter.area, $scope.filter.supervisor, foremen).then(function (result) {
                    $scope.msoData = result;
                    if ($scope.msoData.length == 1){
                        $scope.filter.mso = $scope.msoData[0];
                        msgBus.emitMsg(config.publish, {type: 'changeForemenFilter','filter': angular.copy($scope.filter)}, 'changeForemen', 'l48fieldmanagerFilter' );
                    }
                });
            }
        });
        $scope.$watch("filter.mso", function (mso) {
            // get ...
            if(mso){
                msgBus.emitMsg(config.publish, {type: 'changeMSOFilter','filter': angular.copy($scope.filter)}, 'changeMSO', 'l48fieldmanagerFilter' );
            }
        });


        $scope.traverseFilter = function (filter, value) {
            msgBus.emitMsg(config.publish, {type: 'changeBreadcrumb','filterCrumb': filter, 'filterValue':value}, 'changeBreadcrumb', 'l48fieldmanagerFilter' );
        };
        $scope.clearFilter = function () {
            $scope.filter.bu = null;
            $scope.filter.area = null;
            $scope.filter.supervisor = null;
            $scope.filter.foremen = null;
            $scope.filter.mso = null;
        };


    })


    .controller('filterEditController', function ($scope, $timeout, config, filterService ) {


        $scope.config = config;



        filterService.getBU().then(function (result) {
            $scope.businessUnitData = result;
        });

        $scope.$watch("config.bu", function (bu) {
            // get areas
            if(bu){
                filterService.getAreas(bu).then(function (result) {
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
                filterService.getSupervisors($scope.config.bu, area).then(function (result) {
                    $scope.supervisorData = result;
                    $scope.foremenData = [];
                    $scope.msoData = [];
                });
            }
        });
        $scope.$watch("config.supervisor", function (supervisor) {
            // get foreman
            if(supervisor){
                filterService.getForemen($scope.config.bu, $scope.config.area, supervisor).then(function (result) {
                    $scope.foremenData = result;
                    $scope.msoData = [];
                });
            }
        });
        $scope.$watch("config.foremen", function (foremen) {
            // get mso
            if(foremen){
                filterService.getMSOs($scope.config.bu, $scope.config.area, $scope.config.supervisor, foremen).then(function (result) {
                    $scope.msoData = result;
                 });
            }
        });
        $scope.clearFilter = function () {
            $scope.config.bu = null;
            $scope.config.area = null;
            $scope.config.supervisor = null;
            $scope.config.foremen = null;
            $scope.config.mso = null;
        };



    });