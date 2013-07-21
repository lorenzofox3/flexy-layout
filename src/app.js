var app = angular.module('app', ['flexyLayout']);
app.controller('mainCtrl', ['$scope', function (scope) {

        scope.greetings = 'hello';
    }])
    .directive('collapse', function () {
        return {
            require: '^flexyLayout',
            replace: true,
            scope: {},
            template: '<div><span ng-class="{collapse:isCollapsed}" ng-click="toggle()">< ></span></div>',
            restrict: 'E',
            link: function (scope, element, attr, ctrl) {

                var index = parseInt(attr.index,10),
                    minWidth = attr.minWidth || 35,
                    maxWidth = attr.maxWidth || 200;

                scope.isCollapsed = false;
                scope.toggle = function () {
                    ctrl.toggleLockBlock(index, false);
                    scope.isCollapsed = scope.isCollapsed !== true;
                };

                scope.$watch('isCollapsed', function (newValue, oldValue) {
                    if (newValue !== oldValue) {
                        var newLength = newValue === true ? minWidth - element.parent()[0].offsetWidth : maxWidth - element.parent()[0].offsetWidth;
                        ctrl.moveBlockLength(index, newLength);
                        ctrl.toggleLockBlock(index, true);
                    }
                });
            }
        };
    })
    .directive('blockCommand', function () {
        return {
            restrict: 'C',
            require: '^flexyLayout',
            template: '<div><input type="number" ng-model="newLength"/><input type="checkbox" ng-model="isLocked"/></div>',
            replace: true,
            scope: {},
            link: function (scope, element, attrs, ctrl) {
                var index = parseInt(attrs.index,10);

                scope.isLocked=false;

                var input=angular.element(element.children()[1]);
                input.bind('blur', function () {
                    scope.$apply(function () {
                        ctrl.moveBlockLength(index,scope.newLength);
                    });
                });

                scope.$watch('isLocked', function (newValue, oldValue) {
                    if (newValue !== oldValue) {
                        ctrl.toggleLockBlock(index, newValue);
                    }
                });
            }

        };
    });

