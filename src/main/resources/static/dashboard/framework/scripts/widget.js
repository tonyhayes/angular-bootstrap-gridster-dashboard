/*
 * The MIT License
 * 
 * Copyright (c) 2013, Sebastian Sdorra
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

angular.module('dashboard')

    .directive('adfWidget', function ($log, $modal, $interval, dashboard, adfTemplatePath, dashboardService, ModalService ) {

        function stringToBoolean(string){
            switch(string != null ? string.toLowerCase() : null){
                case "true": case "yes": case "1": return true;
                case "false": case "no": case "0": case null: return false;
                default: return Boolean(string);
            }
        }

        function preLink($scope, $element, $attr){
            var definition = $scope.definition;
            if (definition) {
                var w = dashboard.widgets[definition.type];
                if (w) {
                    // pass title
                    if (!definition.title){
                        definition.title = w.title;
                    }

                    // pass edit mode
                    $attr.$observe('editMode', function(value){
                        $scope.editMode = stringToBoolean(value);
                    });
                    // pass dashboard mode
                    $attr.$observe('popMode', function(value){
                        $scope.popMode = stringToBoolean(value);
                    });

                    // pass copy of widget to scope
                    $scope.widget = angular.copy(w);

                    // create config object
                    var config = definition.config;
                    if (config) {
                        if (angular.isString(config)) {
                            config = angular.fromJson(config);
                        }
                    } else {
                        config = {};
                    }

                    // pass config to scope
                    $scope.config = config;


                    $scope.addNewItem = function() {
                        var id = dashboardService.getUniqueToken();
                        $scope.config.content.push({id:id});
                    };

                    // delete particular option
                    $scope.deleteOption = function (item) {
                        var modalDefaults = {
                            templateUrl: adfTemplatePath+'modal.html'
                        };
                        var modalOptions = {
                            closeButtonText: 'Cancel',
                            actionButtonText: 'Remove Dashboard',
                            headerText: 'Delete Dashboard from this widget?',
                            bodyText: 'Are you sure you want to delete this pop-up?'
                        };

                        ModalService.showModal(modalDefaults, modalOptions).then(function (result) {
                            if (result === 'ok') {
                                angular.forEach($scope.config.content, function (dash, i) {
                                    if (item.id == dash.id) {
                                        $scope.config.content.splice(i,1);
                                    }
                                });
                            }
                        });
                    };

                    // convert collapsible to string
                    $scope.collapsible = stringToBoolean($scope.collapsible);

                    // collapse
                    $scope.isCollapsed = false;
                } else {
                    $log.warn('could not find widget ' + definition.type);
                }
            } else {
                $log.debug('definition not specified, widget was probably removed');
            }
        }

        function postLink($scope, $element, $attr, $timeout) {
            $scope.hidden = true;
            $scope.collapsible = true;

            var definition = $scope.definition;
            if (definition) {
                // bind close function
                $scope.close = function () {
                    var column = $scope.col;
                    if (column) {
                        var index = column.widgets.indexOf(definition);
                        if (index >= 0) {
                            column.widgets.splice(index, 1);
                        }
                    }
                    $element.remove();
                };

                if($scope.widget.reload){
                    $interval(function(){
                        $scope.$broadcast('widgetReload');
                        console.info('reloading widget '+ $scope.widget.title );
                    }, 15*60*1000);
                }

                // bind reload function
                $scope.reload = function () {
                    $scope.$broadcast('widgetReload');
                };

                // bind edit function
                $scope.edit = function () {
                    $scope.hidden = false;
                    $scope.closeDialog = function () {

                        $scope.hidden = true;
                        var widget = $scope.widget;
                        if (widget.edit && widget.edit.reload) {
                            // reload content after edit dialog is closed
                            $scope.$broadcast('widgetConfigChanged');
                        }
                    };
                };

                // bind maximize function
                $scope.maximize = function() {
                    var maxScope = $scope.$new();
                    var opts = {
                        scope: maxScope,
                        templateUrl: adfTemplatePath + 'widget-maximize.html'
                    };

                    var instance = $modal.open(opts);
                    maxScope.closeDialog = function() {
                        instance.close();
                        maxScope.$destroy();
                    };
                };

                // bind popout function
                $scope.popout = function(dash) {
                    dashboardService.popOutDashboard($scope, dash);
                };

            } else {
                $log.debug('widget not found');
            }
        }

        return {
            replace: true,
            restrict: 'EA',
            transclude: false,
            templateUrl: adfTemplatePath +'flip.html',
            scope: {
                definition: '=',
                col: '=column',
                editMode: '@',
                collapsible: '='
            },
            compile: function compile($element, $attr, transclude) {

                /**
                 * use pre link, because link of widget-content
                 * is executed before post link widget
                 */
                return {
                    pre: preLink,
                    post: postLink
                };
            }
        };

    });