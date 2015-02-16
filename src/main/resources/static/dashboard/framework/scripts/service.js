/**
 * Created by anthonyhayes on 9/29/14.
 */
/* Services */


angular.module('dashboard.service', []).
    value('version', '0.1')
    .factory('ajaxInterceptor', ['$q', function ($q) {
        //http://jsnlog.com/Documentation/GetStartedLogging/AngularJsErrorHandling
        var myInterceptor = {
            'request': function (config) {
                config.msBeforeAjaxCall = new Date().getTime();
                return config;
            },
            'response': function (response) {
                if (response.config) {
                    var msAfterAjaxCall = new Date().getTime();
                    var timeTakenInMs = msAfterAjaxCall - response.config.msBeforeAjaxCall;
                    console.log('AngularL48.Ajax '+'url:'+ response.config.url +' timeTakenInMs:'+ timeTakenInMs + ' status:'+ response.status);
                }
                return response;
            },
            'responseError': function (rejection) {
                var errorMessage = "timeout";
                if (rejection.status != 0) {
                    if(rejection.data.ExceptionMessage){
                        errorMessage = rejection.data.ExceptionMessage;
                    }else if(rejection.data.message){
                        errorMessage = rejection.data.message;
                    }
                }
                console.log('AngularL48.AjaxError '+'errorMessage:'+ errorMessage + ' status:'+ rejection.status);

                if (rejection.status == 403) {

                    //SHANE!! - this is for you!!!

                }

                return $q.reject(rejection);
            }
        };
        return myInterceptor;
    }])

// simple message\ing (pub/sub)
// -- if we need something more complex -
// http://codingsmackdown.tv/blog/2013/04/29/hailing-all-frequencies-communicating-in-angularjs-with-the-pubsub-design-pattern/
//    .factory('msgBus', ['$rootScope', function ($rootScope) {
    .factory('msgBus', ['$rootScope','socketService', function ($rootScope, socketService) {
        var msgBus = {};

        msgBus.emitMsg = function (channel, data, action, type) {
            data = data || {};
            $rootScope.$emit(channel, data);
            socketService.sendSocketMessage(channel, data, action, type);

        };
        msgBus.broadcastMsg = function (channel, data, action, type) {
            data = data || {};
            $rootScope.$broadcast(channel, data);
            socketService.sendSocketMessage(channel, data, action, type);
        };
        msgBus.onMsg = function (msg, func, scope) {
            var unbind = $rootScope.$on(msg, func);
            if (scope) {
                scope.$on('$destroy', unbind);
            }
        };

        msgBus.queueMsg = function (channel, data, action, type) {
            socketService.sendSocketMessage(channel, data, action, type);
        };

        return msgBus;
    }])
    .service('socketService', function ($rootScope, dashboardService, useSocket) {

            var stompClient = null;

            var token = dashboardService.getToken();
            if(useSocket){
                var socket = new SockJS(dmApplicationEntryPoint + '/socket');
            }

            this.getSocket = function () {
                if (useSocket) {

                    stompClient = Stomp.over(socket);
                    stompClient.connect({}, function (frame) {
                        console.log('Connected: ' + frame);
                        stompClient.subscribe('/widget', function (message) {
                            console.log(message);
                            var msg = JSON.parse(message.body);
                            if (token == msg.token) {
                                if (msg.action == 'initialize') {
                                    $rootScope.$emit(msg.channel, msg.message);
                                    console.log('initial message -- same token');
                                } else {
                                    console.log('discarding message -- same token');
                                }
                            } else {
                                if (msg.action == 'initialize') {
                                    console.log('discarding message -- initialize for new dashboard user');
                                } else {
                                    $rootScope.$emit(msg.channel, msg.message);
                                }
                            }
                        });
                    });
                }
            };
            this.sendSocketMessage = function (channel, data, action, type) {
                if (useSocket) {

                    if (!channel) {
                        channel = 'missingChannel';
                        console.log('socket configuration error -- channel not defined');
                    }
                    if (!action) {
                        action = 'message';
                    }
                    if (!type) {
                        type = 'message';
                    }
                    var payLoad = JSON.stringify({ token: token, channel: channel, action: action, type: type, message: data });
                    stompClient.send("/app/socket", {}, payLoad);
                }
            };

    })
    .service('dashboardService', function (localStorageService, $modal, adfTemplatePath) {

        var token = makeToken();
        // if widget needs a unique identifier within its message
        this.getToken = function () {
            return token;
        };

        this.getUniqueToken = function () {

            var newToken = makeToken();
            return newToken;
        };

        function makeToken()
        {
            var token = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for( var i=0; i < 5; i++ )
                token += possible.charAt(Math.floor(Math.random() * possible.length));

            return token;
        }

        this.getDashboards = function () {
            //need service to read from server
            return localStorageService.keys();
        };
        this.getDashboard = function (name) {
            var model = localStorageService.get(name);
            if (model) {
                return model;
            }

            angular.forEach(db, function (dashboard) {
                if (dashboard.id == name) {
                    return dashboard;
                }
            });
            // this is probably dangerous -- change this to show a dashboard splash page
            if(db.length > 0){
                return db[0];
            }

        };
        this.setDashboard = function (name, model) {
            var found = false;
            localStorageService.set(name, model);
            angular.forEach(db, function (dashboard) {
                if (dashboard.id == name) {
                    dashboard = model;
                    found = true;
                }
            });
            if(!found){
                db.push(model);
            }
        };

        this.removeDashboard = function (name) {
            localStorageService.remove(name);
            angular.forEach(db, function (dashboard, idx) {
                if (dashboard.id == name) {
                    db.splice(idx, 1);
                }
            });
        };

        this.popOutDashboard = function (scope,dash) {
            var popoutScope = scope.$new();
            popoutScope.model = this.getDashboard(dash);
            if(popoutScope.model){
                popoutScope.name = popoutScope.model.title;
                var opts = {
                    scope: popoutScope,
                    templateUrl: adfTemplatePath + 'dashboard-panel.html'
                };

                var instance = $modal.open(opts);
                popoutScope.closeDialog = function() {
                    instance.close();
                    popoutScope.$destroy();
                };
            }else{
                $log.debug('popup dashboard not found - '+ dash);
            }

        };
        var db = [
            {
                title: "Dashboard 01",
                id: "dashboard1",
                widgets:[]
            }

        ];


    })
    .service('ModalService', ['$modal',
        function ($modal) {

            var modalDefaults = {
                backdrop: true,
                keyboard: true,
                modalFade: true,
                templateUrl: 'app/partials/util/modal.html'
            };

            var modalOptions = {
                closeButtonText: 'Close',
                actionButtonText: 'OK',
                headerText: 'Proceed?',
                bodyText: 'Perform this action?',
                record: null,
                model1: null,
                model2: null,
                model3: null,
                model4: null
            };

            this.showModal = function (customModalDefaults, customModalOptions) {
                if (!customModalDefaults) customModalDefaults = {};
                customModalDefaults.backdrop = 'static';
                return this.show(customModalDefaults, customModalOptions);
            };

            this.show = function (customModalDefaults, customModalOptions) {
                //Create temp objects to work with since we're in a singleton service
                var tempModalDefaults = {};
                var tempModalOptions = {};

                //Map angular-ui modal custom defaults to modal defaults defined in this service
                angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);

                //Map modal.html $scope custom properties to defaults defined in this service
                angular.extend(tempModalOptions, modalOptions, customModalOptions);

                if (!tempModalDefaults.controller) {
                    tempModalDefaults.controller = function ($scope, $modalInstance) {
                        $scope.modalOptions = tempModalOptions;
                        $scope.modalOptions.ok = function (result) {
                            $modalInstance.close('ok');
                        };
                        $scope.modalOptions.close = function (result) {

                            $modalInstance.close('cancel');
                        };
                    };
                }

                return $modal.open(tempModalDefaults).result;
            };


        }
    ])
    .service('DialogService', ['$dialog',
        function ($dialog) {
            var dialogDefaults = {
                backdrop: true,
                keyboard: true,
                backdropClick: true,
                dialogFade: true,
                templateUrl: 'app/partials/util/dialog.html'
            };

            var dialogOptions = {
                closeButtonText: 'Close',
                actionButtonText: 'OK',
                headerText: 'Proceed?',
                bodyText: 'Perform this action?'
            };

            this.showModalDialog = function (customDialogDefaults, customDialogOptions) {
                if (!customDialogDefaults) customDialogDefaults = {};
                customDialogDefaults.backdropClick = false;
                this.showDialog(customDialogDefaults, customDialogOptions);
            };

            this.showDialog = function (customDialogDefaults, customDialogOptions) {
                //Create temp objects to work with since we're in a singleton service
                var tempDialogDefaults = {};
                var tempDialogOptions = {};

                //Map angular-ui dialog custom defaults to dialog defaults defined in this service
                angular.extend(tempDialogDefaults, dialogDefaults, customDialogDefaults);

                //Map dialog.html $scope custom properties to defaults defined in this service
                angular.extend(tempDialogOptions, dialogOptions, customDialogOptions);

                if (!tempDialogDefaults.controller) {
                    tempDialogDefaults.controller = function ($scope, dialog) {
                        $scope.dialogOptions = tempDialogOptions;
                        $scope.dialogOptions.close = function (result) {
                            dialog.close(result);
                        };
                        $scope.dialogOptions.callback = function () {
                            dialog.close();
                            customDialogOptions.callback();
                        };
                    };
                }

                var d = $dialog.dialog(tempDialogDefaults);
                d.open();
            };

            this.showMessage = function (title, message, buttons) {
                var defaultButtons = [
                    {
                        result: 'ok',
                        label: 'OK',
                        cssClass: 'btn-primary'
                    }
                ];
                var msgBox = new $dialog.dialog({
                    dialogFade: true,
                    templateUrl: 'template/dialog/message.html',
                    controller: 'MessageBoxController',
                    resolve: {
                        model: function () {
                            return {
                                title: title,
                                message: message,
                                buttons: buttons === null ? defaultButtons : buttons
                            };
                        }
                    }
                });
                return msgBox.open();
            };
        }

    ]);