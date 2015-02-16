/**
 * Created by anthonyhayes on 4/16/14.
 */
angular.module('dashboardControllers', [])

    .controller("ApplicationController", [
        "$scope", "$timeout", "$q", '$location', '$ocLazyLoad', 'dashboardService',

        function ($scope, $timeout, $q, $location, $ocLazyLoad, dashboardService) {

            $scope.isCurrentPath = function (path) {
                return $location.path() == path;
            };


            $scope.loadingDone = false;
 //           socketService.getSocket();

            loadTable();

            function loadTable() {
                $scope.dbs = [];

                //load dashboards
                var boards = dashboardService.getDashboards();
                angular.forEach(boards, function (dash) {
                    if (dash){
                        var d = dashboardService.getDashboard(dash);
                        if(d.type != 'popup'){
                            $scope.dbs.push(d);
                        }
                    }
                });
            }
            $scope.$on('adfDashboardSaveComplete', function (event, name, model) {
                loadTable();
            });

            $q.all([


                $ocLazyLoad.load({
                    name: 'dm.widgets.productionTarget',
                    reconfig: true,
                    files: ['dashboard/app/widgets/production/targetChart/productionTarget.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.taskType',
                    reconfig: true,
                    files: ['dashboard/app/widgets/task/chart/taskType.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.topLoss',
                    reconfig: true,
                    files: ['dashboard/app/widgets/production/topLoss/topLoss.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.productionDaily',
                    reconfig: true,
                    files: ['dashboard/app/widgets/production/dailyChart/productionDaily.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.filter',
                    reconfig: true,
                    files: ['dashboard/app/widgets/filter/filter.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.task',
                    reconfig: true,
                    files: ['dashboard/app/widgets/task/grid/task.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.tank',
                    reconfig: true,
                    files: ['dashboard/app/widgets/tank/grid/tank.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.tankChart',
                    reconfig: true,
                    files: ['dashboard/app/widgets/tank/chart/tankChart.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.map',
                    reconfig: true,
                    files: ['dashboard/app/widgets/map/map.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.randommsg',
                    reconfig: true,
                    files: ['dashboard/app/widgets/randommsg/randommsg.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.iframe',
                    reconfig: true,
                    files: ['dashboard/app/widgets/iframe/iframe.js']
                }),
                $ocLazyLoad.load({
                    name: 'dm.widgets.weather',
                    reconfig: true,
                    files: ['dashboard/app/widgets/weather/weather.js']

                })
            ]).then(
                function (data) {

                    console.log('All modules are resolved!');
                    // when evdrything has loaded, flip the switch, and let the
                    // routes do their work
                    $scope.loadingDone = true;



                },
                function (reason) {
                    // if any of the promises fails, handle it
                    // here, I'm just throwing an error message to
                    // the user.
                    console.log(reason);
                    $scope.failure = reason;
                });
        }
    ]);
