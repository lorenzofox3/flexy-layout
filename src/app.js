var app = angular.module('app', ['flexyLayout']);
app.controller('mainCtrl', ['$scope', function (scope) {

        scope.greetings = 'hello';
    }])
    .directive('collapse', function () {
        return {
            require: '^flexyLayout',
            replace: true,
            scope: {},
            template: '<button ng-click="toggle()">test</button>',
            restrict: 'E',
            link: function (scope, element, attr, ctrl) {

//                var index = attr.index,
//                    minWidth = attr.minWidth || 20,
//                    maxWidth = attr.maxWidth || 200;
//
//                scope.isCollapsed = false;
                scope.toggle = function () {
                    ctrl.init();
//                    ctrl.toggleLockBlock(index, false);
//                    scope.isCollapsed = scope.isCollapsed !== true;
                };

//                scope.$watch('isCollapsed', function (newValue, oldValue) {
//                    if (newValue!==oldValue) {
//                        var newLength = newValue === true ? minWidth - element.parent()[0].offsetWidth : maxWidth - element.parent()[0].offsetWidth;
//                        ctrl.moveBlockLength(index, newLength);
//                        ctrl.toggleLockBlock(index, true);
//                    }
//                });
            }
        };
    });

//var app = angular.module('app', ['flexyLayout.mediator']);
//app.controller('mainCtrl', ['$scope', function (scope) {
//        scope.greetings = "hello";
//    }]).directive('collapse', function () {
//        return {
//            require: '^flexyLayout',
//            replace: true,
//            scope: {},
//            template: '<button ng-click="toggle()">test</button>',
//            restrict: 'E',
//            link: function (scope, element, attr, ctrl) {
//
//                var index = attr.index,
//                    minWidth = attr.minWidth || 20,
//                    maxWidth = attr.maxWidth || 200;
//
//                scope.isCollapsed = false;
//                scope.toggle = function () {
//                    ctrl.toggleLockBlock(index, false);
//                    scope.isCollapsed = scope.isCollapsed !== true;
//                };
//
//                scope.$watch('isCollapsed', function (newValue, oldValue) {
//                    if (newValue!==oldValue) {
//                        var newLength = newValue === true ? minWidth - element.parent()[0].offsetWidth : maxWidth - element.parent()[0].offsetWidth;
//                        ctrl.moveBlockLength(index, newLength);
//                        ctrl.toggleLockBlock(index, true);
//                    }
//                });
//            }
//        };
//    });

