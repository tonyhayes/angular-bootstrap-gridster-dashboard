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

/**
 * @ngdoc directive
 * @name adf.directive:adfDashboard
 * @element div
 * @restrict ECA
 * @scope
 * @description
 *
 * `adfDashboard` is a directive which renders the dashboard with all its
 * components. The directive requires a name attribute. The name of the
 * dashboard can be used to store the model.
 */


'use strict';

angular.module('dashboard')

    .directive("flip", function(flipConfig) {

        function setDim(element, width, height) {
            if (width) {
                element.style.width = width;
            }
            if (height) {
                element.style.height = height;
            }
        }

        return {
            restrict: "E",
            controller: function($scope, $element, $attrs) {

                $attrs.$observe("flipShow", function(newValue){
                    console.log(newValue);
                    if(newValue === "front"){
                        showFront();
                    }
                    else if(newValue === "back"){
                        showBack();
                    }
                    else {
                        console.warn("FLIP: Unknown side.");
                    }
                });

                var self = this;
                self.front = null,
                    self.back = null;


                function showFront() {
                    self.front.removeClass(flipConfig.classNames.hideFront);
                    self.back.addClass(flipConfig.classNames.hideBack);
                }

                function showBack() {
                    self.back.removeClass(flipConfig.classNames.hideBack);
                    self.front.addClass(flipConfig.classNames.hideFront);
                }

                self.init = function() {
                    self.front.addClass(flipConfig.classNames.panel);
                    self.back.addClass(flipConfig.classNames.panel);

                    showFront();

                    if(flipConfig.flipsOnClick){
                        self.front.on("click", showBack);
                        self.back.on("click", showFront);
                    }
                }

            },

            link: function(scope, element, attrs, ctrl) {

                var width = attrs.flipWidth,
                    height = attrs.flipHeight;

                element.addClass(flipConfig.classNames.base);

                if (ctrl.front && ctrl.back) {
                    [element, ctrl.front, ctrl.back].forEach(function(el) {
                        setDim(el[0], width, height);
                    });
                    ctrl.init();
                } else {
                    console.error("FLIP: 2 panels required.");
                }
            }
        }

    })

    .directive("flipPanel", function() {
        return {
            restrict: "E",
            require: "^flip",
            link: function(scope, element, attrs, flipCtr) {
                if (!flipCtr.front) {
                    flipCtr.front = element;
                } else if (!flipCtr.back) {
                    flipCtr.back = element;
                } else {
                    console.error("FLIP: Too many panels.");
                }
            }
        }
    })
    .directive('backButton', function () {
        return {
            restrict: 'E',
            template: '<button type="button" class="btn btn-default pull-right toolbar-padding" ><span class="glyphicon glyphicon-arrow-left"></span>&nbsp;&nbsp;{{back}}</button>',
            scope: {
                back: '@back',
                icons: '@icons'
            },
            link: function(scope, element, attrs) {
                $(element[0]).on('click', function() {
                    history.back();
                    scope.$apply();
                });
            }
        };
    })
    .directive('popOutButton', function (dashboardService) {
        return {
            restrict: 'E',
            template: '<button type="button" class="btn btn-default pull-right toolbar-padding" ><span class="{{icons}}"></span>&nbsp;&nbsp;{{label}}</button>',
            scope: {
                label: '@label',
                icons: '@icons',
                dashboard: '@dashboard'
            },
            link: function(scope, element, attrs) {
                $(element[0]).on('click', function() {
                    if(attrs.dashboard){
                        dashboardService.popOutDashboard(scope, attrs.dashboard);
                    }else{
                        $log.debug('popup dashboard not defined!');
                    }
                });
            }
        };
    })
    .directive('popOutLink', function (dashboardService) {
        return {
            restrict: 'E',
            template: '<a href=""><i class="{{icons}}"></i> </a>',
            scope: {
                icons: '@icons',
                dashboard: '@dashboard'
            },
            link: function(scope, element, attrs) {
                $(element[0]).on('click', function() {
                    if(attrs.dashboard){
                        dashboardService.popOutDashboard(scope, attrs.dashboard);
                    }else{
                        $log.debug('popup dashboard not defined!');
                    }
                });
            }
        };
    })
    .directive('adfWidgetDynamicLink', function ($compile) {

        var button =
            '<pop-out-button class="btn btn-xs" label="{{content.label}}" icons="{{content.icons}}" dashboard="{{content.dashboard}}"></pop-out-button>'
        var link =
            '<pop-out-link icons="{{content.icons}}" dashboard="{{content.dashboard}}"></pop-out-link>';

        var getTemplate = function(buttonType) {
            var template = '';

            switch(buttonType) {
                case 'button':
                    template = button;
                    break;
                case 'link':
                    template = link;
                    break;
            }

            return template;
        };

        var linker = function(scope, element, attrs) {

//            element.html(getTemplate(scope.content.buttonType)).show();

 //           $compile(element.contents())(scope);
            element.append($compile(getTemplate(scope.content.buttonType))(scope));
        };

        return {
            restrict: "E",
            link: linker,
            scope: {
                content:'='
            }
        };
    })
    .directive('adfDashboard', function ($rootScope, $log, $modal, dashboard, adfTemplatePath) {

        function copyWidgets(source, target) {
            if (source.widgets && source.widgets.length > 0) {
                var w = source.widgets.shift();
                while (w) {
                    target.widgets.push(w);
                    w = source.widgets.shift();
                }
            }
        }

        function fillStructure(model, columns, counter) {
            angular.forEach(model.rows, function (row) {
                angular.forEach(row.columns, function (column) {
                    if (!column.widgets) {
                        column.widgets = [];
                    }
                    if (columns[counter]) {
                        copyWidgets(columns[counter], column);
                        counter++;
                    }
                });
            });
            return counter;
        }

        function readColumns(model) {
            var columns = [];
            angular.forEach(model.rows, function (row) {
                angular.forEach(row.columns, function (col) {
                    columns.push(col);
                });
            });
            return columns;
        }

        function changeStructure(model, structure) {
            var columns = readColumns(model);
            model.rows = structure.rows;
            var counter = 0;
            while (counter < columns.length) {
                counter = fillStructure(model, columns, counter);
            }
        }

        function createConfiguration(type) {
            var cfg = {};
            var config = dashboard.widgets[type].config;
            if (config) {
                cfg = angular.copy(config);
            }
            return cfg;
        }

        return {
            replace: true,
            restrict: 'EA',
            transclude: false,
            scope: {
                structure: '@',
                name: '@',
                admin: '@',
                collapsible: '@',
                adfModel: '=',
                adfWidgetFilter: '='
            },
            controller: function ($scope) {
                // sortable options for drag and drop
                $scope.sortableOptions = {
                    connectWith: ".column",
                    handle: ".fa-arrows",
                    cursor: 'move',
                    tolerance: 'pointer',
                    placeholder: 'placeholder',
                    forcePlaceholderSize: true,
                    opacity: 0.4
                };

                var model = {};
                var structure = {};
                var widgetFilter = {};
                var structureName = {};
                var name = $scope.name;

                // Watching for changes on adfModel
                $scope.$watch('adfModel', function(oldVal, newVal) {
                    if(newVal =! null) {
                        model = $scope.adfModel;
                        widgetFilter = $scope.adfWidgetFilter;
                        if ( ! model || ! model.rows ){
                            structureName = $scope.structure;
                            structure = dashboard.structures[structureName];
                            if (structure){
                                if (model){
                                    model.rows = angular.copy(structure).rows;
                                } else {
                                    model = angular.copy(structure);
                                }
                                model.structure = structureName;
                            } else {
                                $log.error( 'could not find structure ' + structureName);
                            }
                        }

                        if (model) {
                            if (!model.title){
                                model.title = 'Dashboard';
                            }
                            if (!model.type){
                                model.type = 'dashboard';
                            }
                            if (model.type == 'dashboard'){
                                $scope.popMode = false;
                            }else{
                                $scope.popMode = true;
                            }
                            $scope.model = model;
                        } else {
                            $log.error('could not find or create model');
                        }
                    }
                }, true);

                // edit mode
                $scope.editMode = $scope.admin;
                $scope.editClass = "";

                $scope.toggleEditMode = function(){
                    $scope.editMode = ! $scope.editMode;
                    if ($scope.editMode){
                        $scope.modelCopy = angular.copy($scope.adfModel, {});
                    }

                    if (!$scope.editMode){
                        $rootScope.$broadcast('adfDashboardChanged', name, model);
                        $rootScope.$broadcast('adfDashboardEditComplete');
                    }
                };

               $scope.cancelEditMode = function(){
                    $scope.editMode = false;
                    $scope.modelCopy = angular.copy($scope.modelCopy, $scope.adfModel);
                    $rootScope.$broadcast('adfDashboardEditComplete');
                };

                // edit dashboard settings
                $scope.editDashboardDialog = function(){
                    var editDashboardScope = $scope.$new();
                    editDashboardScope.structures = dashboard.structures;
                    var instance = $modal.open({
                        scope: editDashboardScope,
                        templateUrl: adfTemplatePath + 'dashboard-edit.html'
                    });
                    $scope.changeStructure = function(name, structure){
                        $log.info('change structure to ' + name);
                        changeStructure(model, structure);
                    };
                    editDashboardScope.closeDialog = function(){
                        instance.close();
                        editDashboardScope.$destroy();
                    };
                };

                // add widget dialog
                $scope.addWidgetDialog = function(){
                    var addScope = $scope.$new();
                    var widgets;
                    if (angular.isFunction(widgetFilter)){
                        widgets = {};
                        angular.forEach(dashboard.widgets, function(widget, type){
                            if (widgetFilter(widget, type)){
                                widgets[type] = widget;
                            }
                        });
                    } else {
                        widgets = dashboard.widgets;
                    }
                    addScope.widgets = widgets;
                    var opts = {
                        scope: addScope,
                        templateUrl: adfTemplatePath + 'widget-add.html'
                    };
                    var instance = $modal.open(opts);
                    addScope.addWidget = function(widget){
                        var w = {
                            type: widget,
                            config: createConfiguration(widget)
                        };
                        addScope.model.rows[0].columns[0].widgets.unshift(w);
                        instance.close();

                        addScope.$destroy();
                    };
                    addScope.closeDialog = function(){
                        instance.close();
                        addScope.$destroy();
                    };
                };
            },
            link: function ($scope, $element, $attr) {
                // pass attributes to scope
                $scope.name = $attr.name;
                $scope.structure = $attr.structure;
            },
            templateUrl: adfTemplatePath + 'dashboard.html'
        };
    });