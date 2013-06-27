var app = angular.module('app', ['flexyLayout.mediator']);
app.controller('mainCtrl', ['$scope', function (scope) {
    scope.greetings = "hello";
}]);


(function (angular) {
    "use strict";
    angular.module('flexyLayout.directives', [])
        .directive('flexyLayout', ['Block', function (Block) {
            return {
                restrict: 'E',
                template: '<div class="flexy-layout" ng-transclude></div>',
                replace: true,
                transclude: true,
                controller: 'mediatorCtrl',
                link: function (scope, element, attr) {

                }
            };
        }])
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
                    '<input ng-model="value" type="number"/>' +
                    '<input type="checkbox" ng-model="block.isLocked"/>' +
                    '<span>{{block.lengthValue}}</span>' +
                    '</div>',
                link: function (scope, element, attrs, ctrl) {
                    scope.block = Block.getNewBlock();
                    scope.$watch('block.lengthValue', function (newValue, oldValue) {
                        element.css('width', newValue + 'px');
                    });

                    ctrl.addBlock(scope.block);
                    scope.value = 0;
                    var input = angular.element(element.children()[1]);
                    input.bind('blur', function () {
                        scope.$apply(function () {
                            ctrl.moveBlockLength(scope.block, scope.value);
                            scope.value = 0;
                        });
                    });
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
                        this.availableLength = ctrl.getSplitterRange(this);
                        ctrl.movingSplitter = this;
                    };

                    ctrl.addBlock(scope.splitter);

                    element.bind('mousedown', angular.bind(scope.splitter, mouseDownHandler));

                    scope.$watch('splitter.ghostPosition.x', function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            ghost.style.left = newValue+'px';
                        }
                    });

                }
            };
        }]);
})(angular);





