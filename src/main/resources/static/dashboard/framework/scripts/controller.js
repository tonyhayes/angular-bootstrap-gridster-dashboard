angular.module('dashboard.controllers', [])

    //this controller is in charge of the loading bar,
    // it's quick and dirty, and does nothing fancy.
    .controller("LoadingController", [
        "$scope", "$timeout",
        function ($scope, $timeout) {
            $scope.percentDone = 0;

            function animateBar() {
                // very crude timeout based animator
                // just to illustrate the sample
                $scope.percentDone += 25;
                if ($scope.loadingDone) {
                    // this is thighly coupled to the appController
                    return;
                }
                $timeout(animateBar, 200);

            }

            animateBar();
        }
    ])
    .controller('DashboardController', function ($scope, $routeParams, $location,
                                                 dashboardService, localStorageService,
                                                 adfTemplatePath) {

        var db = $routeParams.dashboardId;
        //load dashboards
        var boards = dashboardService.getDashboards();

        if(!db){
             if (boards.length){
                var found = false;
                //find the first valid board
                angular.forEach(boards, function (dash) {
                    if (dash && !found){
                        db = dash;
                        $location.path('/dashboard/'+db);
                        found = true
                    }
                });

                if(!found){
                   createDash();
                }



            }else{
                createDash();
            }
        }

        function createDash() {
            var modalDefaults = {
                templateUrl: adfTemplatePath+'modal.html'
            };
            var modalOptions = {
                closeButtonText: 'OK',
                headerText: 'No Dashboard?',
                bodyText: 'Using the admin button, please create your first dashboard'
            };

            ModalService.showModal(modalDefaults, modalOptions).then(function (result) {
                if (result === 'ok') {
                    if(model.id){
                        $location.path('/admin');
                    }
                }
            });
        }


        var model = dashboardService.getDashboard(db);
        $scope.name = db;
        $scope.model = model;
        $scope.collapsible = false;



    })
    .controller('NavigationController', function ($scope, $location) {

        $scope.navCollapsed = true;


        $scope.toggleNav = function () {
            $scope.navCollapsed = !$scope.navCollapsed;
        };

        $scope.$on('$routeChangeStart', function () {
            $scope.navCollapsed = true;
        });


    })
    .controller('AdminController', ['$scope', '$rootScope','$routeParams', '$location', '$filter','$modal',
         'ModalService', 'adfTemplatePath','dashboardService','dashboard',

        function ($scope, $rootScope, $routeParams, $location, $filter, $modal,
                   ModalService, adfTemplatePath, dashboardService, dashboard) {

            //load dashboards
            loadTable();
            function loadTable() {
                $scope.master = [];

                //load dashboards
                var boards = dashboardService.getDashboards();
                angular.forEach(boards, function (dash) {
                    if (dash){
                        var d = dashboardService.getDashboard(dash);
                        $scope.master.push(d);
                    }
                });
            }



            $scope.filterOptions = {
                filterText: ''
            };

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

            $scope.myDashboards = {
                data: 'master',
                showGroupPanel: true,
                groups: [],
                showColumnMenu: true,
                plugins: [filterBarPlugin],
                headerRowHeight: 60, // give room for filter bar
                rowTemplate: adfTemplatePath+'rowTemplate.html',
                filterOptions: $scope.filterOptions,
                columnDefs: [

                    {
                        field: 'id',
                        headerCellTemplate: adfTemplatePath+'filterHeaderTemplate.html',
                        width: '*',
                        displayName: 'Id'
                    },
                    {
                        field: 'title',
                        headerCellTemplate: adfTemplatePath+'filterHeaderTemplate.html',
                        width: '***',
                        displayName: 'Title'

                    },
                    { field: '',
                        width: '40',
                        cellTemplate: adfTemplatePath+'cellTemplateButtonDelete.html'
                    }
                ]
            };

            $scope.delete = function (row) {

                var name = row.entity.name;

                var modalDefaults = {
                    templateUrl: adfTemplatePath+'modal.html'
                };
                var modalOptions = {
                    closeButtonText: 'Cancel',
                    actionButtonText: 'Delete Dashboard',
                    headerText: 'Delete ' + name + '?',
                    bodyText: 'Are you sure you want to delete this dashboard?'
                };

                ModalService.showModal(modalDefaults, modalOptions).then(function (result) {
                    if (result === 'ok') {
                        dashboardService.removeDashboard(row.entity.id);
                        remove($scope.master, 'id', row.entity.id);
                        loadTable();
                    }
                });

            };

            // parse the  array to find the object
            function remove(array, property, value) {
                $.each(array, function (index, result) {
                    if (result && result[property] == value) {
                        array.splice(index, 1);
                    }
                });
            }

            // add new dashboard
            $scope.onDblClickRow = function (row) {
                var editDashboardScope = $scope.$new();
                var master = angular.copy($scope.model);
                var dashboardId = dashboardService.getUniqueToken();
                editDashboardScope.adminMode = true;

                if(row){
                    dashboardId = row.entity.id;
                    $scope.model = dashboardService.getDashboard(row.entity.id);
                    $scope.name = row.entity.title;
                }else{
                    dashboardId = dashboardService.getUniqueToken();

                    $scope.model = {
                        title: "",
                        id: dashboardId,
                        widgets:[]
                    };
                }

                var instance = $modal.open({
                    scope: editDashboardScope,
                    templateUrl: adfTemplatePath+'dashboard-panel.html'
                });
                editDashboardScope.closeDialog = function(){
                    $scope.model = master;
                    instance.close();
                    editDashboardScope.$destroy();
                };
                $scope.$on('adfDashboardEditComplete', function () {
                    $scope.model = master;
                    instance.close();
                    editDashboardScope.$destroy();

                });

            };
            $scope.$on('adfDashboardChanged', function (event, name, model) {
                dashboardService.setDashboard(model.id, model);
                loadTable();
                $rootScope.$broadcast('adfDashboardSaveComplete');
            });


        }
    ]);

