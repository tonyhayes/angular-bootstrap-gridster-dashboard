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

angular.module('dashboard', [
    'dashboard.provider',
    'dashboard.service',
    'dashboard.controllers',
    'ui.bootstrap',
    'ui.sortable',
    'ngAnimate',
    'LocalStorageModule',
    'ngRoute',
    'oc.lazyLoad',
    'dashboardControllers'
    ])

    .constant('adfTemplatePath', 'dashboard/framework/templates/')
    .value('useSocket', false)
    .value('adfVersion', '<<adfVersion>>')

    .config(function ($routeProvider, localStorageServiceProvider,
                      $ocLazyLoadProvider, adfTemplatePath) {

        localStorageServiceProvider.setPrefix('adf');

        $routeProvider.when('/dashboard', {
            templateUrl: adfTemplatePath+'accend-db.html',
            controller: 'DashboardController'
        })
            .when('/dashboard/:dashboardId', {
                templateUrl: adfTemplatePath+'accend-db.html',
                controller: 'DashboardController'
            })
            .when('/admin', {
                templateUrl: adfTemplatePath+'admin.html',
                controller: 'AdminController'
            })
            .otherwise({
                redirectTo: '/dashboard'
            });


        $ocLazyLoadProvider.config({
            asyncLoader: $script
        });


    })
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.interceptors.push('ajaxInterceptor');
        $httpProvider.defaults.withCredentials = true;
        $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
        /**
         * http://stackoverflow.com/questions/19254029/angularjs-http-post-does-not-send-data
         * The workhorse; converts an object to x-www-form-urlencoded serialization.
         * @param {Object} obj
         * @return {String}
         */
        var param = function(obj) {
            var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

            for(name in obj) {
                value = obj[name];

                if(value instanceof Array) {
                    for(i=0; i<value.length; ++i) {
                        subValue = value[i];
                        fullSubName = name + '[' + i + ']';
                        innerObj = {};
                        innerObj[fullSubName] = subValue;
                        query += param(innerObj) + '&';
                    }
                }
                else if(value instanceof Object) {
                    for(subName in value) {
                        subValue = value[subName];
                        fullSubName = name + '[' + subName + ']';
                        innerObj = {};
                        innerObj[fullSubName] = subValue;
                        query += param(innerObj) + '&';
                    }
                }
                else if(value !== undefined && value !== null)
                    query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
            }

            return query.length ? query.substr(0, query.length - 1) : query;
        };

        // Override $http service's default transformRequest
        $httpProvider.defaults.transformRequest = [function(data) {
            return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
        }];

    }])

    ;