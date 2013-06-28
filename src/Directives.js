var app = angular.module('app', ['flexyLayout.mediator']);
app.controller('mainCtrl', ['$scope', function (scope) {
        scope.greetings = "hello";
    }]).directive('collapse', function () {
        return {
            require: '^flexyLayout',
            replace: true,
            scope: {},
            template: '<button ng-click="toggle()">test</button>',
            restrict: 'E',
            link: function (scope, element, attr, ctrl) {

                var index = attr.index,
                    minWidth = attr.minWidth || 20,
                    maxWidth = attr.maxWidth || 200;

                scope.isCollapsed = false;
                scope.toggle = function () {
                    ctrl.toggleLockBlock(index, false);
                    scope.isCollapsed = scope.isCollapsed !== true;
                };

                scope.$watch('isCollapsed', function (newValue, oldValue) {
                    if (newValue!==oldValue) {
                        var newLength = newValue === true ? minWidth - element.parent()[0].offsetWidth : maxWidth - element.parent()[0].offsetWidth;
                        ctrl.moveBlockLength(index, newLength);
                        ctrl.toggleLockBlock(index, true);
                    }
                });
            }
        };
    });

(function (angular) {
    "use strict";
    angular.module('flexyLayout.directives', [])
        .directive('flexyLayout', function () {
            return {
                restrict: 'E',
                scope: {},
                template: '<div class="flexy-layout" ng-transclude></div>',
                replace: true,
                transclude: true,
                controller: 'mediatorCtrl'
            };
        })
        .directive('blockContainer', ['Block', function (Block) {
            return{
                restrict: 'E',
                require: '^flexyLayout',
                transclude: true,
                replace: true,
                scope: {},
                template: '<div class="block">' +
                    '<div class="block-content" ng-transclude>' +
                    '</div>' +
                    '</div>',
                link: function (scope, element, attrs, ctrl) {
                    scope.block = Block.getNewBlock();
                    scope.$watch('block.lengthValue', function (newValue, oldValue) {
                        element.css(ctrl.lengthProperties.lengthName, newValue + 'px');
                    });

                    ctrl.addBlock(scope.block);
                }
            };
        }])
        .directive('blockSplitter', ['Block', function (Block) {
            return{
                restrict: 'E',
                require: '^flexyLayout',
                replace: true,
                scope: {},
                template: '<div class="block splitter">' +
                    '<div class="ghost"></div>' +
                    '</div>',
                link: function (scope, element, attrs, ctrl) {
                    scope.splitter = Block.getNewSplitter();

                    var ghost = element.children()[0];
                    var mouseDownHandler = function (event) {
                        this.initialPosition.x = event.clientX;
                        this.initialPosition.y = event.clientY;
                        this.availableLength = ctrl.getSplitterRange(this);
                        ctrl.movingSplitter = this;
                    };

                    ctrl.addBlock(scope.splitter);

                    element.bind('mousedown', angular.bind(scope.splitter, mouseDownHandler));

                    scope.$watch('splitter.ghostPosition.' + ctrl.lengthProperties.position, function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            ghost.style[ctrl.lengthProperties.positionName] = newValue + 'px';
                        }
                    });

                }
            };
        }]);
})(angular);





