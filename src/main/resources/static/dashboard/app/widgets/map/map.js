angular.module('dm.widgets.map', ['dashboard.provider', 'leaflet-directive'])
    .config(function (dashboardProvider) {
        // template object for widgets
        var widget = {
            templateUrl: 'dashboard/app/widgets/map/map.html',
            edit: {
                templateUrl: 'dashboard/app/widgets/filter/edit.html',
                controller: 'filterEditController',
                reload: true

            }
        };

        // register chart template by extending the template object
        dashboardProvider
            .widget('map', angular.extend({
                title: 'Map',
                description: 'Site Map',
                controller: 'mapController',
                popout: 'popout-1'
            }, widget))
    })
    .service('mapService', function ($q, $http) {
        return {
            getSiteList: function (filter) {
                var deferred = $q.defer();
                $http.get(dmApplicationEntryPoint + '/list', {
                    params: {bizUnits:  filter.bu, areas:  filter.area,
                        supervisors:  filter.supervisor, foremen:  filter.foremen, msos:  filter.mso,
                        rollups:'centerCoords,taskCounts,production'
                        }})
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

    .controller('mapController', function ($scope, $timeout, $filter, $compile, mapService, leafletMarkersHelpers, config, mapService, msgBus, leafletData, leafletBoundsHelpers) {
        $scope.site = [];


        $scope.markers = [];


        $scope.$on('leafletDirectiveMarker.click', function(e, args) {
            // Args will contain the marker name and other relevant information
            console.log("Leaflet Click");
        });

        $scope.$on('leafletDirectiveMap.popupopen', function(event, data){
            $container = $(data.leafletEvent.popup._container).find('.leaflet-popup-content');
            $container.empty();
            var html = "<p>" + data.leafletEvent.popup._content + "</p>",
                linkFunction = $compile(angular.element(html)),
                linkedDOM = linkFunction($scope);
            $container.append(linkedDOM);
        });



        angular.extend($scope, {
            events: {
                map: {
                    enable: ['click', 'blur', 'dragend'],
                    logic: 'emit'
                }
            },
            center: {
                lat: 29.4167,
                lng: -98.5000,
                zoom: 5
            },

            defaults: {
                scrollWheelZoom: false
            },
            layers: {
                baselayers: {
//                    googleRoadmap: {
//                        name: 'Streets',
//                        layerType: 'ROADMAP',
//                        type: 'google'
//                    }
                    osm: {
                        name: 'StreetMap',
                        type: 'xyz',
                        url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        layerOptions: {
                            subdomains: ['a', 'b', 'c'],
                            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                            continuousWorld: true
                        }
                    }
                }
          },
            markers: {
            }
        });




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
                    $scope.filter.mso != data.filter.mso){
                    $scope.filter = data.filter;
                    filterChanged($scope.filter);
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

        /*
        {"bu":"WY        ",
        "area":"North Central",
        "supervisor":"Jonathon Boyd",
        "foreman":"Roger Clayton",
        "mso":"Roger Clayton",
        "siteId":"623-623-1945",
        "siteIdNum":6230062301945,
        "siteName":"FEDERAL 1-2",
        "completionName":"BR87004901",
        "plTrunk":null,
        "lat":43.28708,
        "lon":-107.61003,
        "name":"623-623-1945",
        "avgLat":43.287080,
        "avgLon":-107.610030,
        "high_tasks":0,
        "med_tasks":0,
        "low_tasks":0,
        "actualTotalProd":0.00,
        "oilProd":0.00,
        "gasProd":0.00,
        "waterProd":0.00,
        "targetOil":0.00,
        "targetGas":0.00,
        "targetTotalProd":0.00}

        */
        function filterChanged(filter) {
            mapService.getSiteList(filter).then(function (result) {
                // populate grid
                $scope.markers = [];

                angular.forEach(result, function (site) {

                    site.latitude = site.lat || site.avgLat;
                    site.longitude = site.lon || site.avgLon;
                    if(site.latitude && site.longitude){
                        /*
                         calculate production, up or down
                         http://stackoverflow.com/questions/5799055/calculate-percentage-saved-between-two-numbers
                         */
                        site.percentChg = (site.actualTotalProd - site.targetTotalProd) / site.targetTotalProd *100;
                        site.chgDir = site.actualTotalProd >= site.targetTotalProd ? 'up' : 'down';

                        if(!site.high_tasks){
                            site.high_tasks = 0;
                        }
                        if(!site.med_tasks){
                            site.med_tasks = 0;
                        }
                        if(!site.low_tasks){
                            site.low_tasks = 0;
                        }
                        if(!site.siteName){
                            site.siteName = 'unknown';
                        }
                        if(!site.siteIdNum){
                            site.siteName = 'multiple sites';
                            site.siteIdNum = 0;
                        }

                        var siteName = "'"+ site.siteName + "'";
                        var markerData = [ site.siteIdNum, siteName, site.latitude, site.longitude] ;

                        /*
                         create custom markers and info-boxes
                         */
                        var tplMarker =
                            '<div class="info-marker-overlay mini">' +
                            '<div class="task-counts" title="'+site.siteName+'">' +
                            '<div class="high-task-count">'+site.high_tasks+'</div>' +
                            '<div class="med-task-count">'+site.med_tasks+'</div>' +
                            '<div class="low-task-count">'+site.low_tasks+'</div>' +
                            '</div></div>';
                        var tplInfoData =
                            '<div class="info-marker-overlay">' +
                            '<div class="info">' +
                            '<a class="name ellipsis" data-ng-click="zoomMap('+markerData +')" title="'+site.siteName+'">'+site.siteName.substring(0,16)+'</a>' +
                            '<div class="production-change-text">Production Change</div>' +
                            '<div class="production-change '+site.chgDir+'"><i class="glyphicon glyphicon-arrow-'+site.chgDir+'"></i>'+site.percentChg.toFixed(0)+'%</div>' +
                            '</div>' +
                            '</div></div>';
                        var tplInfoNoData =
                            '<div class="info-marker-overlay">' +
                            '<div class="info">' +
                                '<a class="name ellipsis" data-ng-click="zoomMap('+markerData+')" title="'+site.siteName+'">'+site.siteName.substring(0,16)+'</a>' +
                            '<div class="production-change-text">Production Change</div>' +
                            '<div class="production-change"><i class="glyphicon glyphicon-minus"></i>No Data</div>' +
                            '</div>' +
                            '</div></div>';
                        var tplInfo = tplInfoData;

                        if(!site.percentChg){

                            tplInfo = tplInfoNoData;
                        }
                        var custom_icons = {
                            divIcon: {
                                type: 'div',
                                iconSize: [1, 0],
                                popupAnchor:  [-155, 12],
                                html: tplMarker
                            }
                        };

                        $scope.markers.push({
                            lat: site.lat || site.avgLat,
                            lng: site.lon || site.avgLon,
                            icon: custom_icons.divIcon,
                            message: tplInfo
                        });

                    }

                });
            });

        }


        $scope.zoomMap = function (site, name, lat, lon) {
            console.log('zoomMap');
            $scope.center = {
                lat: lat,
                lng: lon,
                zoom: 9
            };
            $scope.filter.site = site;
            $scope.filter.siteName = name;
            msgBus.emitMsg(config.publish, {type: 'filterConfig', 'filter':  angular.copy($scope.filter)}, ',mapClick', 'l48fieldmanagerFilter' );

        };

//        $scope.$on('leafletDirectiveMap.click', function (event, args) {
//            var latlng = args.leafletEvent.latlng;
//            msgBus.emitMsg(config.publish, {'latLng': latlng}, 'mapclick', 'map' );
//        });

        $scope.$on('leafletDirectiveMap.dragend', function (event, args) {

            leafletData.getMap().then(function (map) {
                msgBus.emitMsg(config.publish, {'mapBounds': map.getBounds()}, 'mapdrag', 'map' );

            });
        });

        msgBus.onMsg(config.subscribe, function (event, data) {

            // assume noise in channel
            if(data.latLng) {
                toastr.info('Lat: ' + data.latLng.lat + '<br>Lng: ' + data.latLng.lng);
            }
            if(data.mapBounds) {
                leafletData.getMap().then(function (map) {
                    var newScopeBounds = {
                        northEast: {
                            lat: data.mapBounds._northEast.lat,
                            lng: data.mapBounds._northEast.lng
                        },
                        southWest: {
                            lat: data.mapBounds._southWest.lat,
                            lng: data.mapBounds._southWest.lng
                        }
                    };
                    map.fitBounds(leafletBoundsHelpers.createLeafletBounds(newScopeBounds));

                });
            }
        }, $scope);


    })

;