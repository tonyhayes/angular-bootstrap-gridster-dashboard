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
                name: '@',
                admin: '@',
                collapsible: '@',
                adfModel: '=',
                adfWidgetFilter: '='
            },
            controller: function ($scope) {

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

                            if(!$scope.model.dashboardMarginLeft){
                                $scope.model.dashboardMarginLeft = 20;
                            }
                            if(!$scope.model.dashboardMarginRight){
                                $scope.model.dashboardMarginRight = 20;
                            }
                            if(!$scope.model.dashboardColumns){
                                $scope.model.dashboardColumns = 4;
                            }
                            if(!$scope.model.dashboardRows){
                                $scope.model.dashboardRows = 6;
                            }
                            if(!$scope.model.dashboardRowHeight){
                                $scope.model.dashboardRowHeight = 'match';
                            }
                            $scope.gridsterOptions = {
                                margins: [$scope.model.dashboardMarginLeft, $scope.model.dashboardMarginRight],
                                columns: $scope.model.dashboardColumns,
                                rows: $scope.model.dashboardRows,
                                rowHeight:$scope.model.dashboardRowHeight,
                                draggable: {
                                    handle: 'h3'
                                }
                            };


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
                        addScope.model.widgets.unshift(w);
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
  //              $scope.structure = $attr.structure;
            },
            templateUrl: adfTemplatePath + 'dashboard.html'
        };
    });