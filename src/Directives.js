(function (angular) {
    "use strict";
    angular.module('flexyLayout.directives', ['flexyLayout.mediator'])
        .directive('flexyLayout', function () {
            return {
                restrict: 'E',
                scope: {},
                template: '<div class="flexy-layout" ng-transclude></div>',
                replace: true,
                transclude: true,
                controller: 'mediatorCtrl',
                link: function (scope, element, attrs, ctrl) {
                    scope.$watch(function () {
                        return element[0][ctrl.lengthProperties.offsetName];
                    }, function () {
                        ctrl.init();
                    });
                }
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
                    var initialLength = scope.$eval(attrs.init);
                    scope.block = Block.getNewBlock(initialLength);
                    scope.$watch('block.lengthValue', function (newValue, oldValue) {
                        element.css(ctrl.lengthProperties.lengthName, Math.floor(newValue) + 'px');
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

                        //to avoid the block content to be selected when dragging the splitter
                        event.preventDefault();
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

    angular.module('flexyLayout', ['flexyLayout.directives']);

})(angular);