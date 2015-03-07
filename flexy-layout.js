(function (angular) {
    "use strict";
    angular.module('flexyLayout.block', [])
        .provider('Block', function () {

            /**
             * A composite block made of different types of blocks that must implement the structural interface
             *
             * moveLength->change the lengthValue according to specific block rules
             * canMoveLength->tells whether the block can change his lengthValue in the current state
             * getAvailableLength->return the length the block can be reduced of
             *
             * , canMoveLength, getAvailableLength
             * @param composingBlocks
             * @constructor
             */
            function CompositeBlock(composingBlocks) {
                this.blocks = [];

                if (angular.isArray(composingBlocks)) {
                    for (var i = 0, l = composingBlocks.length; i < l; i++) {
                        //should implement structural interface
                        if (composingBlocks[i].moveLength && composingBlocks[i].canMoveLength && composingBlocks[i].getAvailableLength) {
                            this.blocks.push(composingBlocks[i]);
                        }
                    }
                }
            }

            CompositeBlock.prototype.moveLength = function (length) {

                var
                    divider = 0,
                    initialLength = length,
                    blockLength;

                for (var i = 0, l = this.blocks.length; i < l; i++) {
                    if (this.blocks[i].canMoveLength(length) === true) {
                        divider++;
                    }
                }

                for (var j = 0; divider > 0; j++) {
                    blockLength = this.blocks[j].moveLength(length / divider);
                    length -= blockLength;
                    if (Math.abs(blockLength) > 0) {
                        divider--;
                    }
                }

                return initialLength - length;
            };

            CompositeBlock.prototype.canMoveLength = function (length) {

                for (var i = 0, l = this.blocks.length; i < l; i++) {
                    if (this.blocks[i].canMoveLength(length) === true) {
                        return true;
                    }
                }

                return false;
            };

            CompositeBlock.prototype.getAvailableLength = function () {
                var length = 0;
                for (var i = 0, l = this.blocks.length; i < l; i++) {
                    length += this.blocks[i].getAvailableLength();
                }

                return length;
            };

            CompositeBlock.prototype.clean = function () {
                delete this.blocks;
            };

            /**
             * A Blokc which can be locked (ie its lengthValue can not change) this is the standard composing block
             * @constructor
             */
            function Block(initial) {
                this.initialLength = initial > 0 ? initial : 0;
                this.isLocked = false;
                this.lengthValue = 0;
                this.minLength = 0;
            }

            Block.prototype.moveLength = function (length) {

                if (this.isLocked === true) {
                    return 0;
                }

                var oldLength = this.lengthValue;
                if (angular.isNumber(length)) {
                    this.lengthValue = Math.max(0, this.lengthValue + length);
                }
                return this.lengthValue - oldLength;
            };

            Block.prototype.canMoveLength = function (length) {
                return !(this.isLocked === true || (length < 0 && (this.getAvailableLength()) === 0));
            };

            Block.prototype.getAvailableLength = function () {
                return this.isLocked === true ? 0 : this.lengthValue - this.minLength;
            };

            /**
             * Splitter a splitter block which split a set of blocks into two separate set
             * @constructor
             */
            function Splitter() {
                this.lengthValue = 5;
                this.initialPosition = { x: 0, y: 0};
                this.availableLength = {before: 0, after: 0};
                this.ghostPosition = { x: 0, y: 0};

            }

            Splitter.prototype.canMoveLength = function () {
                return false;
            };

            Splitter.prototype.moveLength = function () {
                return 0;
            };

            Splitter.prototype.getAvailableLength = function () {
                return 0;
            };

            this.$get = function () {
                return {
                    //variadic -> can call getNewComposite([block1, block2, ...]) or getNewComposite(block1, block2, ...)
                    getNewComposite: function () {
                        var args = [].slice.call(arguments);
                        if (args.length === 1 && angular.isArray(args[0])) {
                            args = args[0];
                        }
                        return new CompositeBlock(args);
                    },
                    getNewBlock: function (initialLength) {
                        return new Block(initialLength);
                    },
                    getNewSplitter: function () {
                        return new Splitter();
                    },

                    isSplitter: function (block) {
                        return block instanceof Splitter;
                    }
                };
            }
        });
})(angular);
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
        .directive('blockSplitter', ['Block', '$log', function (Block, $log) {
            return{
                restrict: 'E',
                require: '^flexyLayout',
                replace: true,
                scope: {
                    onSplitterStop: '=',
                    size: '='
                },
                template: '<div class="block splitter">' +
                    '<div class="ghost"></div>' +
                    '</div>',
                link: function (scope, element, attrs, ctrl) {
                    scope.splitter = Block.getNewSplitter();
                    // Tell controller about this callback.
                    ctrl.onSplitterStop = scope.onSplitterStop;
                    if (scope.size) {
                        // Tell controller about our size, it needs it to calculate
                        // the sizes of all blocks.
                        ctrl.splitterSize = scope.size;
                        if (ctrl.orientation == 'horizontal') {
                            element.css('width', scope.size + 'px');
                        }
                        else {
                            element.css('height', scope.size + 'px');
                        }
                    }
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
(function (angular) {
    "use strict";
    //TODO this guy is now big, split it, maybe the part for event handling should be moved somewhere else
    angular.module('flexyLayout.mediator', ['flexyLayout.block']).
        controller('mediatorCtrl', ['$scope', '$element', '$attrs', 'Block', '$log', function (scope, element, attrs, Block, $log) {

            var blocks = [],
                pendingSplitter = null,
                splitterCount = 0,
                self = this,
                possibleOrientations = ['vertical', 'horizontal'],
                orientation = possibleOrientations.indexOf(attrs.orientation) !== -1 ? attrs.orientation : 'horizontal',
                className = orientation === 'horizontal' ? 'flexy-layout-column' : 'flexy-layout-row';

            element.addClass(className);

            this.orientation = orientation;
            this.lengthProperties = orientation === 'horizontal' ? {lengthName: 'width', offsetName: 'offsetWidth', positionName: 'left', position: 'x', eventProperty: 'clientX'} :
            {lengthName: 'height', offsetName: 'offsetHeight', positionName: 'top', position: 'y', eventProperty: 'clientY'};


           /**
            * Set by blockSplitter directive
            */
           this.onSplitterStop = null;
           this.splitterSize = 5;

            ///// mouse event handler /////

            this.movingSplitter = null;

            var mouseMoveHandler = function (event) {
                var length = 0,
                    eventProperty = this.lengthProperties.eventProperty,
                    position = this.lengthProperties.position;

                if (this.movingSplitter !== null) {
                    length = event[eventProperty] - this.movingSplitter.initialPosition[position];
                    if (length < 0) {
                        this.movingSplitter.ghostPosition[position] = (-1) * Math.min(Math.abs(length), this.movingSplitter.availableLength.before);
                    } else {
                        this.movingSplitter.ghostPosition[position] = Math.min(length, this.movingSplitter.availableLength.after);
                    }
                }
            };

            var mouseUpHandler = function (event) {
                var length = 0,
                    eventProperty = this.lengthProperties.eventProperty,
                    position = this.lengthProperties.position;

                if (this.movingSplitter !== null) {
                    length = event[eventProperty] - this.movingSplitter.initialPosition[position];
                    this.moveSplitterLength(this.movingSplitter, length);
                    this.movingSplitter.ghostPosition[position] = 0;

                    if (this.onSplitterStop) {
                        this.onSplitterStop(this.movingSplitter.ghostPosition, length);
                    }
                    this.movingSplitter = null;
                }
            };

            element.bind('mouseup', function (event) {
                scope.$apply(angular.bind(self, mouseUpHandler, event));
            });

            //todo should do some throttle before calling apply
            element.bind('mousemove', function (event) {
                scope.$apply(angular.bind(self, mouseMoveHandler, event));
            });

            /////   adding blocks   ////

            this.addBlock = function (block) {

                if (!Block.isSplitter(block)) {
                    if (pendingSplitter !== null) {
                        blocks.push(pendingSplitter);
                        splitterCount++;
                        pendingSplitter = null;
                    }

                    blocks.push(block);
                    this.init();
                } else {
                    pendingSplitter = block;
                }
            };

            /**
             * to be called when flexy-layout container has been resized
             */
            this.init = function () {

                var i,
                    l = blocks.length,
                    elementLength = element[0][this.lengthProperties.offsetName],
                    block,
                    bufferBlock = Block.getNewBlock();//temporary buffer block

                blocks.push(bufferBlock);

                //reset all blocks
                for (i = 0; i < l; i++) {
                    block = blocks[i];
                    block.isLocked = false;
                    if (!Block.isSplitter(block)) {
                        block.moveLength(-10000);
                    }
                }
                //buffer block takes all available space
                bufferBlock.moveLength(elementLength - splitterCount * this.splitterSize);

                for (i = 0; i < l; i++) {
                    block = blocks[i];
                    if (block.initialLength > 0) {
                        this.moveBlockLength(block, block.initialLength);
                        block.isLocked=true;
                    }
                }

                //buffer block free space for non fixed block
                this.moveBlockLength(bufferBlock, -10000);

                for (i = 0; i < l; i++) {
                    blocks[i].isLocked = false;
                }

                blocks.splice(l, 1);

            };

            ///// public api /////

            /**
             * Will move a given block length from @length
             *
             * @param block can be a block or an index (likely index of the block)
             * @param length < 0 or > 0 : decrease/increase block size of abs(length) px
             */
            this.moveBlockLength = function (block, length) {

                var
                    blockIndex = typeof block !== 'object' ? block : blocks.indexOf(block),
                    composingBlocks,
                    composite,
                    availableLength,
                    blockToMove;


                if (blockIndex < 0 || length === 0 || blockIndex >= blocks.length) {
                    return;
                }

                blockToMove = blocks[blockIndex];

                composingBlocks = (blocks.slice(0, blockIndex)).concat(blocks.slice(blockIndex + 1, blocks.length));
                composite = Block.getNewComposite(composingBlocks);

                if (composite.canMoveLength(-length) !== true || blockToMove.canMoveLength(length) !== true) {
                    return;
                }

                if (length < 0) {
                    availableLength = (-1) * blockToMove.moveLength(length);
                    composite.moveLength(availableLength);
                } else {
                    availableLength = (-1) * composite.moveLength(-length);
                    blockToMove.moveLength(availableLength);
                }

                //free memory
                composite.clean();
            };

            /**
             * move splitter it will affect all the blocks before until the previous/next splitter or the edge of area
             * @param splitter
             * @param length
             */
                //todo mutualise with moveBlockLength
            this.moveSplitterLength = function (splitter, length) {

                var
                    splitterIndex = blocks.indexOf(splitter),
                    beforeComposite,
                    afterComposite,
                    availableLength;

                if (!Block.isSplitter(splitter) || splitterIndex === -1) {
                    return;
                }

                beforeComposite = Block.getNewComposite(fromSplitterToSplitter(splitter, true));
                afterComposite = Block.getNewComposite(fromSplitterToSplitter(splitter, false));

                if (!beforeComposite.canMoveLength(length) || !afterComposite.canMoveLength(-length)) {
                    return;
                }

                if (length < 0) {
                    availableLength = (-1) * beforeComposite.moveLength(length);
                    afterComposite.moveLength(availableLength);
                } else {
                    availableLength = (-1) * afterComposite.moveLength(-length);
                    beforeComposite.moveLength(availableLength);
                }

                afterComposite.clean();
                beforeComposite.clean();
            };

            /**
             * return an object with the available length before the splitter and after the splitter
             * @param splitter
             * @returns {{before: *, after: *}}
             */
            this.getSplitterRange = function (splitter) {

                var
                    beforeSplitter = fromSplitterToSplitter(splitter, true),
                    afterSplitter = fromSplitterToSplitter(splitter, false),
                    toReturn = {
                        before: beforeSplitter.getAvailableLength(),
                        after: afterSplitter.getAvailableLength()
                    };

                beforeSplitter.clean();
                afterSplitter.clean();

                return toReturn;
            };

            /**
             * lock/unlock a given block
             * @param block block or blockIndex
             * @param lock new value for block.isLocked
             */
            this.toggleLockBlock = function (block, lock) {
                var
                    blockIndex = typeof block !== 'object' ? block : blocks.indexOf(block),
                    blockToLock;

                if (blockIndex >= 0 && blockIndex < blocks.length) {
                    blockToLock = blocks[blockIndex];
                    blockToLock.isLocked = lock;
                }

            };

            var fromSplitterToSplitter = function (splitter, before) {

                var
                    splitterIndex = blocks.indexOf(splitter),
                    blockGroup = before === true ? blocks.slice(0, splitterIndex) : blocks.slice(splitterIndex + 1, blocks.length),
                    fn = before === true ? Array.prototype.pop : Array.prototype.shift,
                    composite = [],
                    testedBlock;

                while (testedBlock = fn.apply(blockGroup)) {
                    if (Block.isSplitter(testedBlock)) {
                        break;
                    } else {
                        composite.push(testedBlock);
                    }
                }
                return Block.getNewComposite(composite);
            };
        }]);
})(angular);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkJsb2NrLmpzIiwiRGlyZWN0aXZlcy5qcyIsIk1lZGlhdG9yQ29udHJvbGxlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJmbGV4eS1sYXlvdXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKGFuZ3VsYXIpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBhbmd1bGFyLm1vZHVsZSgnZmxleHlMYXlvdXQuYmxvY2snLCBbXSlcbiAgICAgICAgLnByb3ZpZGVyKCdCbG9jaycsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGNvbXBvc2l0ZSBibG9jayBtYWRlIG9mIGRpZmZlcmVudCB0eXBlcyBvZiBibG9ja3MgdGhhdCBtdXN0IGltcGxlbWVudCB0aGUgc3RydWN0dXJhbCBpbnRlcmZhY2VcbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBtb3ZlTGVuZ3RoLT5jaGFuZ2UgdGhlIGxlbmd0aFZhbHVlIGFjY29yZGluZyB0byBzcGVjaWZpYyBibG9jayBydWxlc1xuICAgICAgICAgICAgICogY2FuTW92ZUxlbmd0aC0+dGVsbHMgd2hldGhlciB0aGUgYmxvY2sgY2FuIGNoYW5nZSBoaXMgbGVuZ3RoVmFsdWUgaW4gdGhlIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgICAgICAqIGdldEF2YWlsYWJsZUxlbmd0aC0+cmV0dXJuIHRoZSBsZW5ndGggdGhlIGJsb2NrIGNhbiBiZSByZWR1Y2VkIG9mXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogLCBjYW5Nb3ZlTGVuZ3RoLCBnZXRBdmFpbGFibGVMZW5ndGhcbiAgICAgICAgICAgICAqIEBwYXJhbSBjb21wb3NpbmdCbG9ja3NcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmdW5jdGlvbiBDb21wb3NpdGVCbG9jayhjb21wb3NpbmdCbG9ja3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJsb2NrcyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShjb21wb3NpbmdCbG9ja3MpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gY29tcG9zaW5nQmxvY2tzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9zaG91bGQgaW1wbGVtZW50IHN0cnVjdHVyYWwgaW50ZXJmYWNlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcG9zaW5nQmxvY2tzW2ldLm1vdmVMZW5ndGggJiYgY29tcG9zaW5nQmxvY2tzW2ldLmNhbk1vdmVMZW5ndGggJiYgY29tcG9zaW5nQmxvY2tzW2ldLmdldEF2YWlsYWJsZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmxvY2tzLnB1c2goY29tcG9zaW5nQmxvY2tzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQ29tcG9zaXRlQmxvY2sucHJvdG90eXBlLm1vdmVMZW5ndGggPSBmdW5jdGlvbiAobGVuZ3RoKSB7XG5cbiAgICAgICAgICAgICAgICB2YXJcbiAgICAgICAgICAgICAgICAgICAgZGl2aWRlciA9IDAsXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxMZW5ndGggPSBsZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrTGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmJsb2Nrcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuYmxvY2tzW2ldLmNhbk1vdmVMZW5ndGgobGVuZ3RoKSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGl2aWRlcisrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGRpdmlkZXIgPiAwOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tMZW5ndGggPSB0aGlzLmJsb2Nrc1tqXS5tb3ZlTGVuZ3RoKGxlbmd0aCAvIGRpdmlkZXIpO1xuICAgICAgICAgICAgICAgICAgICBsZW5ndGggLT0gYmxvY2tMZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhibG9ja0xlbmd0aCkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXZpZGVyLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaW5pdGlhbExlbmd0aCAtIGxlbmd0aDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIENvbXBvc2l0ZUJsb2NrLnByb3RvdHlwZS5jYW5Nb3ZlTGVuZ3RoID0gZnVuY3Rpb24gKGxlbmd0aCkge1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmJsb2Nrcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuYmxvY2tzW2ldLmNhbk1vdmVMZW5ndGgobGVuZ3RoKSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBDb21wb3NpdGVCbG9jay5wcm90b3R5cGUuZ2V0QXZhaWxhYmxlTGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBsZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5ibG9ja3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCArPSB0aGlzLmJsb2Nrc1tpXS5nZXRBdmFpbGFibGVMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gbGVuZ3RoO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgQ29tcG9zaXRlQmxvY2sucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmJsb2NrcztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBCbG9rYyB3aGljaCBjYW4gYmUgbG9ja2VkIChpZSBpdHMgbGVuZ3RoVmFsdWUgY2FuIG5vdCBjaGFuZ2UpIHRoaXMgaXMgdGhlIHN0YW5kYXJkIGNvbXBvc2luZyBibG9ja1xuICAgICAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIEJsb2NrKGluaXRpYWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxMZW5ndGggPSBpbml0aWFsID4gMCA/IGluaXRpYWwgOiAwO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNMb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aFZhbHVlID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLm1pbkxlbmd0aCA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIEJsb2NrLnByb3RvdHlwZS5tb3ZlTGVuZ3RoID0gZnVuY3Rpb24gKGxlbmd0aCkge1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNMb2NrZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG9sZExlbmd0aCA9IHRoaXMubGVuZ3RoVmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNOdW1iZXIobGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aFZhbHVlID0gTWF0aC5tYXgoMCwgdGhpcy5sZW5ndGhWYWx1ZSArIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxlbmd0aFZhbHVlIC0gb2xkTGVuZ3RoO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgQmxvY2sucHJvdG90eXBlLmNhbk1vdmVMZW5ndGggPSBmdW5jdGlvbiAobGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICEodGhpcy5pc0xvY2tlZCA9PT0gdHJ1ZSB8fCAobGVuZ3RoIDwgMCAmJiAodGhpcy5nZXRBdmFpbGFibGVMZW5ndGgoKSkgPT09IDApKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEJsb2NrLnByb3RvdHlwZS5nZXRBdmFpbGFibGVMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNMb2NrZWQgPT09IHRydWUgPyAwIDogdGhpcy5sZW5ndGhWYWx1ZSAtIHRoaXMubWluTGVuZ3RoO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTcGxpdHRlciBhIHNwbGl0dGVyIGJsb2NrIHdoaWNoIHNwbGl0IGEgc2V0IG9mIGJsb2NrcyBpbnRvIHR3byBzZXBhcmF0ZSBzZXRcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmdW5jdGlvbiBTcGxpdHRlcigpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aFZhbHVlID0gNTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxQb3NpdGlvbiA9IHsgeDogMCwgeTogMH07XG4gICAgICAgICAgICAgICAgdGhpcy5hdmFpbGFibGVMZW5ndGggPSB7YmVmb3JlOiAwLCBhZnRlcjogMH07XG4gICAgICAgICAgICAgICAgdGhpcy5naG9zdFBvc2l0aW9uID0geyB4OiAwLCB5OiAwfTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBTcGxpdHRlci5wcm90b3R5cGUuY2FuTW92ZUxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBTcGxpdHRlci5wcm90b3R5cGUubW92ZUxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIFNwbGl0dGVyLnByb3RvdHlwZS5nZXRBdmFpbGFibGVMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLiRnZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgLy92YXJpYWRpYyAtPiBjYW4gY2FsbCBnZXROZXdDb21wb3NpdGUoW2Jsb2NrMSwgYmxvY2syLCAuLi5dKSBvciBnZXROZXdDb21wb3NpdGUoYmxvY2sxLCBibG9jazIsIC4uLilcbiAgICAgICAgICAgICAgICAgICAgZ2V0TmV3Q29tcG9zaXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSAmJiBhbmd1bGFyLmlzQXJyYXkoYXJnc1swXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ29tcG9zaXRlQmxvY2soYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldE5ld0Jsb2NrOiBmdW5jdGlvbiAoaW5pdGlhbExlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCbG9jayhpbml0aWFsTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0TmV3U3BsaXR0ZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgU3BsaXR0ZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgICAgICBpc1NwbGl0dGVyOiBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBibG9jayBpbnN0YW5jZW9mIFNwbGl0dGVyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59KShhbmd1bGFyKTsiLCIoZnVuY3Rpb24gKGFuZ3VsYXIpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBhbmd1bGFyLm1vZHVsZSgnZmxleHlMYXlvdXQuZGlyZWN0aXZlcycsIFsnZmxleHlMYXlvdXQubWVkaWF0b3InXSlcbiAgICAgICAgLmRpcmVjdGl2ZSgnZmxleHlMYXlvdXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImZsZXh5LWxheW91dFwiIG5nLXRyYW5zY2x1ZGU+PC9kaXY+JyxcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ21lZGlhdG9yQ3RybCcsXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRbMF1bY3RybC5sZW5ndGhQcm9wZXJ0aWVzLm9mZnNldE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSlcbiAgICAgICAgLmRpcmVjdGl2ZSgnYmxvY2tDb250YWluZXInLCBbJ0Jsb2NrJywgZnVuY3Rpb24gKEJsb2NrKSB7XG4gICAgICAgICAgICByZXR1cm57XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgICAgICByZXF1aXJlOiAnXmZsZXh5TGF5b3V0JyxcbiAgICAgICAgICAgICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImJsb2NrXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiYmxvY2stY29udGVudFwiIG5nLXRyYW5zY2x1ZGU+JyArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5pdGlhbExlbmd0aCA9IHNjb3BlLiRldmFsKGF0dHJzLmluaXQpO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5ibG9jayA9IEJsb2NrLmdldE5ld0Jsb2NrKGluaXRpYWxMZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goJ2Jsb2NrLmxlbmd0aFZhbHVlJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3MoY3RybC5sZW5ndGhQcm9wZXJ0aWVzLmxlbmd0aE5hbWUsIE1hdGguZmxvb3IobmV3VmFsdWUpICsgJ3B4Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGN0cmwuYWRkQmxvY2soc2NvcGUuYmxvY2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1dKVxuICAgICAgICAuZGlyZWN0aXZlKCdibG9ja1NwbGl0dGVyJywgWydCbG9jaycsICckbG9nJywgZnVuY3Rpb24gKEJsb2NrLCAkbG9nKSB7XG4gICAgICAgICAgICByZXR1cm57XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgICAgICByZXF1aXJlOiAnXmZsZXh5TGF5b3V0JyxcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgIG9uU3BsaXR0ZXJTdG9wOiAnPScsXG4gICAgICAgICAgICAgICAgICAgIHNpemU6ICc9J1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwiYmxvY2sgc3BsaXR0ZXJcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJnaG9zdFwiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnNwbGl0dGVyID0gQmxvY2suZ2V0TmV3U3BsaXR0ZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVsbCBjb250cm9sbGVyIGFib3V0IHRoaXMgY2FsbGJhY2suXG4gICAgICAgICAgICAgICAgICAgIGN0cmwub25TcGxpdHRlclN0b3AgPSBzY29wZS5vblNwbGl0dGVyU3RvcDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLnNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRlbGwgY29udHJvbGxlciBhYm91dCBvdXIgc2l6ZSwgaXQgbmVlZHMgaXQgdG8gY2FsY3VsYXRlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc2l6ZXMgb2YgYWxsIGJsb2Nrcy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwuc3BsaXR0ZXJTaXplID0gc2NvcGUuc2l6ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdHJsLm9yaWVudGF0aW9uID09ICdob3Jpem9udGFsJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKCd3aWR0aCcsIHNjb3BlLnNpemUgKyAncHgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKCdoZWlnaHQnLCBzY29wZS5zaXplICsgJ3B4Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIGdob3N0ID0gZWxlbWVudC5jaGlsZHJlbigpWzBdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbW91c2VEb3duSGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsUG9zaXRpb24ueCA9IGV2ZW50LmNsaWVudFg7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxQb3NpdGlvbi55ID0gZXZlbnQuY2xpZW50WTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXZhaWxhYmxlTGVuZ3RoID0gY3RybC5nZXRTcGxpdHRlclJhbmdlKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3RybC5tb3ZpbmdTcGxpdHRlciA9IHRoaXM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdG8gYXZvaWQgdGhlIGJsb2NrIGNvbnRlbnQgdG8gYmUgc2VsZWN0ZWQgd2hlbiBkcmFnZ2luZyB0aGUgc3BsaXR0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY3RybC5hZGRCbG9jayhzY29wZS5zcGxpdHRlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5iaW5kKCdtb3VzZWRvd24nLCBhbmd1bGFyLmJpbmQoc2NvcGUuc3BsaXR0ZXIsIG1vdXNlRG93bkhhbmRsZXIpKTtcblxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goJ3NwbGl0dGVyLmdob3N0UG9zaXRpb24uJyArIGN0cmwubGVuZ3RoUHJvcGVydGllcy5wb3NpdGlvbiwgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdob3N0LnN0eWxlW2N0cmwubGVuZ3RoUHJvcGVydGllcy5wb3NpdGlvbk5hbWVdID0gbmV3VmFsdWUgKyAncHgnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1dKTtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdmbGV4eUxheW91dCcsIFsnZmxleHlMYXlvdXQuZGlyZWN0aXZlcyddKTtcblxufSkoYW5ndWxhcik7IiwiKGZ1bmN0aW9uIChhbmd1bGFyKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIC8vVE9ETyB0aGlzIGd1eSBpcyBub3cgYmlnLCBzcGxpdCBpdCwgbWF5YmUgdGhlIHBhcnQgZm9yIGV2ZW50IGhhbmRsaW5nIHNob3VsZCBiZSBtb3ZlZCBzb21ld2hlcmUgZWxzZVxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2ZsZXh5TGF5b3V0Lm1lZGlhdG9yJywgWydmbGV4eUxheW91dC5ibG9jayddKS5cclxuICAgICAgICBjb250cm9sbGVyKCdtZWRpYXRvckN0cmwnLCBbJyRzY29wZScsICckZWxlbWVudCcsICckYXR0cnMnLCAnQmxvY2snLCAnJGxvZycsIGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIEJsb2NrLCAkbG9nKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmxvY2tzID0gW10sXHJcbiAgICAgICAgICAgICAgICBwZW5kaW5nU3BsaXR0ZXIgPSBudWxsLFxyXG4gICAgICAgICAgICAgICAgc3BsaXR0ZXJDb3VudCA9IDAsXHJcbiAgICAgICAgICAgICAgICBzZWxmID0gdGhpcyxcclxuICAgICAgICAgICAgICAgIHBvc3NpYmxlT3JpZW50YXRpb25zID0gWyd2ZXJ0aWNhbCcsICdob3Jpem9udGFsJ10sXHJcbiAgICAgICAgICAgICAgICBvcmllbnRhdGlvbiA9IHBvc3NpYmxlT3JpZW50YXRpb25zLmluZGV4T2YoYXR0cnMub3JpZW50YXRpb24pICE9PSAtMSA/IGF0dHJzLm9yaWVudGF0aW9uIDogJ2hvcml6b250YWwnLFxyXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lID0gb3JpZW50YXRpb24gPT09ICdob3Jpem9udGFsJyA/ICdmbGV4eS1sYXlvdXQtY29sdW1uJyA6ICdmbGV4eS1sYXlvdXQtcm93JztcclxuXHJcbiAgICAgICAgICAgIGVsZW1lbnQuYWRkQ2xhc3MoY2xhc3NOYW1lKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSBvcmllbnRhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5sZW5ndGhQcm9wZXJ0aWVzID0gb3JpZW50YXRpb24gPT09ICdob3Jpem9udGFsJyA/IHtsZW5ndGhOYW1lOiAnd2lkdGgnLCBvZmZzZXROYW1lOiAnb2Zmc2V0V2lkdGgnLCBwb3NpdGlvbk5hbWU6ICdsZWZ0JywgcG9zaXRpb246ICd4JywgZXZlbnRQcm9wZXJ0eTogJ2NsaWVudFgnfSA6XHJcbiAgICAgICAgICAgIHtsZW5ndGhOYW1lOiAnaGVpZ2h0Jywgb2Zmc2V0TmFtZTogJ29mZnNldEhlaWdodCcsIHBvc2l0aW9uTmFtZTogJ3RvcCcsIHBvc2l0aW9uOiAneScsIGV2ZW50UHJvcGVydHk6ICdjbGllbnRZJ307XHJcblxyXG5cclxuICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgKiBTZXQgYnkgYmxvY2tTcGxpdHRlciBkaXJlY3RpdmVcclxuICAgICAgICAgICAgKi9cclxuICAgICAgICAgICB0aGlzLm9uU3BsaXR0ZXJTdG9wID0gbnVsbDtcclxuICAgICAgICAgICB0aGlzLnNwbGl0dGVyU2l6ZSA9IDU7XHJcblxyXG4gICAgICAgICAgICAvLy8vLyBtb3VzZSBldmVudCBoYW5kbGVyIC8vLy8vXHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmluZ1NwbGl0dGVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHZhciBtb3VzZU1vdmVIYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gMCxcclxuICAgICAgICAgICAgICAgICAgICBldmVudFByb3BlcnR5ID0gdGhpcy5sZW5ndGhQcm9wZXJ0aWVzLmV2ZW50UHJvcGVydHksXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPSB0aGlzLmxlbmd0aFByb3BlcnRpZXMucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW92aW5nU3BsaXR0ZXIgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSBldmVudFtldmVudFByb3BlcnR5XSAtIHRoaXMubW92aW5nU3BsaXR0ZXIuaW5pdGlhbFBvc2l0aW9uW3Bvc2l0aW9uXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVuZ3RoIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmluZ1NwbGl0dGVyLmdob3N0UG9zaXRpb25bcG9zaXRpb25dID0gKC0xKSAqIE1hdGgubWluKE1hdGguYWJzKGxlbmd0aCksIHRoaXMubW92aW5nU3BsaXR0ZXIuYXZhaWxhYmxlTGVuZ3RoLmJlZm9yZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZpbmdTcGxpdHRlci5naG9zdFBvc2l0aW9uW3Bvc2l0aW9uXSA9IE1hdGgubWluKGxlbmd0aCwgdGhpcy5tb3ZpbmdTcGxpdHRlci5hdmFpbGFibGVMZW5ndGguYWZ0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBtb3VzZVVwSGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGxlbmd0aCA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRQcm9wZXJ0eSA9IHRoaXMubGVuZ3RoUHJvcGVydGllcy5ldmVudFByb3BlcnR5LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gdGhpcy5sZW5ndGhQcm9wZXJ0aWVzLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1vdmluZ1NwbGl0dGVyICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gZXZlbnRbZXZlbnRQcm9wZXJ0eV0gLSB0aGlzLm1vdmluZ1NwbGl0dGVyLmluaXRpYWxQb3NpdGlvbltwb3NpdGlvbl07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlU3BsaXR0ZXJMZW5ndGgodGhpcy5tb3ZpbmdTcGxpdHRlciwgbGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmluZ1NwbGl0dGVyLmdob3N0UG9zaXRpb25bcG9zaXRpb25dID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub25TcGxpdHRlclN0b3ApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vblNwbGl0dGVyU3RvcCh0aGlzLm1vdmluZ1NwbGl0dGVyLmdob3N0UG9zaXRpb24sIGxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92aW5nU3BsaXR0ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZWxlbWVudC5iaW5kKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoYW5ndWxhci5iaW5kKHNlbGYsIG1vdXNlVXBIYW5kbGVyLCBldmVudCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vdG9kbyBzaG91bGQgZG8gc29tZSB0aHJvdHRsZSBiZWZvcmUgY2FsbGluZyBhcHBseVxyXG4gICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNlbW92ZScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGFuZ3VsYXIuYmluZChzZWxmLCBtb3VzZU1vdmVIYW5kbGVyLCBldmVudCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vLy8vICAgYWRkaW5nIGJsb2NrcyAgIC8vLy9cclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIUJsb2NrLmlzU3BsaXR0ZXIoYmxvY2spKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlbmRpbmdTcGxpdHRlciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBibG9ja3MucHVzaChwZW5kaW5nU3BsaXR0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGxpdHRlckNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlbmRpbmdTcGxpdHRlciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBibG9ja3MucHVzaChibG9jayk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdTcGxpdHRlciA9IGJsb2NrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIHRvIGJlIGNhbGxlZCB3aGVuIGZsZXh5LWxheW91dCBjb250YWluZXIgaGFzIGJlZW4gcmVzaXplZFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdGhpcy5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBpLFxyXG4gICAgICAgICAgICAgICAgICAgIGwgPSBibG9ja3MubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRMZW5ndGggPSBlbGVtZW50WzBdW3RoaXMubGVuZ3RoUHJvcGVydGllcy5vZmZzZXROYW1lXSxcclxuICAgICAgICAgICAgICAgICAgICBibG9jayxcclxuICAgICAgICAgICAgICAgICAgICBidWZmZXJCbG9jayA9IEJsb2NrLmdldE5ld0Jsb2NrKCk7Ly90ZW1wb3JhcnkgYnVmZmVyIGJsb2NrXHJcblxyXG4gICAgICAgICAgICAgICAgYmxvY2tzLnB1c2goYnVmZmVyQmxvY2spO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vcmVzZXQgYWxsIGJsb2Nrc1xyXG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrID0gYmxvY2tzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrLmlzTG9ja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFCbG9jay5pc1NwbGl0dGVyKGJsb2NrKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBibG9jay5tb3ZlTGVuZ3RoKC0xMDAwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy9idWZmZXIgYmxvY2sgdGFrZXMgYWxsIGF2YWlsYWJsZSBzcGFjZVxyXG4gICAgICAgICAgICAgICAgYnVmZmVyQmxvY2subW92ZUxlbmd0aChlbGVtZW50TGVuZ3RoIC0gc3BsaXR0ZXJDb3VudCAqIHRoaXMuc3BsaXR0ZXJTaXplKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmxvY2sgPSBibG9ja3NbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2NrLmluaXRpYWxMZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZUJsb2NrTGVuZ3RoKGJsb2NrLCBibG9jay5pbml0aWFsTGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2suaXNMb2NrZWQ9dHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy9idWZmZXIgYmxvY2sgZnJlZSBzcGFjZSBmb3Igbm9uIGZpeGVkIGJsb2NrXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVCbG9ja0xlbmd0aChidWZmZXJCbG9jaywgLTEwMDAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tzW2ldLmlzTG9ja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYmxvY2tzLnNwbGljZShsLCAxKTtcclxuXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAvLy8vLyBwdWJsaWMgYXBpIC8vLy8vXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogV2lsbCBtb3ZlIGEgZ2l2ZW4gYmxvY2sgbGVuZ3RoIGZyb20gQGxlbmd0aFxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBAcGFyYW0gYmxvY2sgY2FuIGJlIGEgYmxvY2sgb3IgYW4gaW5kZXggKGxpa2VseSBpbmRleCBvZiB0aGUgYmxvY2spXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBsZW5ndGggPCAwIG9yID4gMCA6IGRlY3JlYXNlL2luY3JlYXNlIGJsb2NrIHNpemUgb2YgYWJzKGxlbmd0aCkgcHhcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHRoaXMubW92ZUJsb2NrTGVuZ3RoID0gZnVuY3Rpb24gKGJsb2NrLCBsZW5ndGgpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICBibG9ja0luZGV4ID0gdHlwZW9mIGJsb2NrICE9PSAnb2JqZWN0JyA/IGJsb2NrIDogYmxvY2tzLmluZGV4T2YoYmxvY2spLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvc2luZ0Jsb2NrcyxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb3NpdGUsXHJcbiAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlTGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrVG9Nb3ZlO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2tJbmRleCA8IDAgfHwgbGVuZ3RoID09PSAwIHx8IGJsb2NrSW5kZXggPj0gYmxvY2tzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBibG9ja1RvTW92ZSA9IGJsb2Nrc1tibG9ja0luZGV4XTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb21wb3NpbmdCbG9ja3MgPSAoYmxvY2tzLnNsaWNlKDAsIGJsb2NrSW5kZXgpKS5jb25jYXQoYmxvY2tzLnNsaWNlKGJsb2NrSW5kZXggKyAxLCBibG9ja3MubGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgICBjb21wb3NpdGUgPSBCbG9jay5nZXROZXdDb21wb3NpdGUoY29tcG9zaW5nQmxvY2tzKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9zaXRlLmNhbk1vdmVMZW5ndGgoLWxlbmd0aCkgIT09IHRydWUgfHwgYmxvY2tUb01vdmUuY2FuTW92ZUxlbmd0aChsZW5ndGgpICE9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChsZW5ndGggPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlTGVuZ3RoID0gKC0xKSAqIGJsb2NrVG9Nb3ZlLm1vdmVMZW5ndGgobGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb21wb3NpdGUubW92ZUxlbmd0aChhdmFpbGFibGVMZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVMZW5ndGggPSAoLTEpICogY29tcG9zaXRlLm1vdmVMZW5ndGgoLWxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tUb01vdmUubW92ZUxlbmd0aChhdmFpbGFibGVMZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vZnJlZSBtZW1vcnlcclxuICAgICAgICAgICAgICAgIGNvbXBvc2l0ZS5jbGVhbigpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIG1vdmUgc3BsaXR0ZXIgaXQgd2lsbCBhZmZlY3QgYWxsIHRoZSBibG9ja3MgYmVmb3JlIHVudGlsIHRoZSBwcmV2aW91cy9uZXh0IHNwbGl0dGVyIG9yIHRoZSBlZGdlIG9mIGFyZWFcclxuICAgICAgICAgICAgICogQHBhcmFtIHNwbGl0dGVyXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBsZW5ndGhcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgICAgICAvL3RvZG8gbXV0dWFsaXNlIHdpdGggbW92ZUJsb2NrTGVuZ3RoXHJcbiAgICAgICAgICAgIHRoaXMubW92ZVNwbGl0dGVyTGVuZ3RoID0gZnVuY3Rpb24gKHNwbGl0dGVyLCBsZW5ndGgpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICBzcGxpdHRlckluZGV4ID0gYmxvY2tzLmluZGV4T2Yoc3BsaXR0ZXIpLFxyXG4gICAgICAgICAgICAgICAgICAgIGJlZm9yZUNvbXBvc2l0ZSxcclxuICAgICAgICAgICAgICAgICAgICBhZnRlckNvbXBvc2l0ZSxcclxuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVMZW5ndGg7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFCbG9jay5pc1NwbGl0dGVyKHNwbGl0dGVyKSB8fCBzcGxpdHRlckluZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBiZWZvcmVDb21wb3NpdGUgPSBCbG9jay5nZXROZXdDb21wb3NpdGUoZnJvbVNwbGl0dGVyVG9TcGxpdHRlcihzcGxpdHRlciwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICAgICAgYWZ0ZXJDb21wb3NpdGUgPSBCbG9jay5nZXROZXdDb21wb3NpdGUoZnJvbVNwbGl0dGVyVG9TcGxpdHRlcihzcGxpdHRlciwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWJlZm9yZUNvbXBvc2l0ZS5jYW5Nb3ZlTGVuZ3RoKGxlbmd0aCkgfHwgIWFmdGVyQ29tcG9zaXRlLmNhbk1vdmVMZW5ndGgoLWxlbmd0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGxlbmd0aCA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVMZW5ndGggPSAoLTEpICogYmVmb3JlQ29tcG9zaXRlLm1vdmVMZW5ndGgobGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICBhZnRlckNvbXBvc2l0ZS5tb3ZlTGVuZ3RoKGF2YWlsYWJsZUxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZUxlbmd0aCA9ICgtMSkgKiBhZnRlckNvbXBvc2l0ZS5tb3ZlTGVuZ3RoKC1sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJlZm9yZUNvbXBvc2l0ZS5tb3ZlTGVuZ3RoKGF2YWlsYWJsZUxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJDb21wb3NpdGUuY2xlYW4oKTtcclxuICAgICAgICAgICAgICAgIGJlZm9yZUNvbXBvc2l0ZS5jbGVhbigpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIHJldHVybiBhbiBvYmplY3Qgd2l0aCB0aGUgYXZhaWxhYmxlIGxlbmd0aCBiZWZvcmUgdGhlIHNwbGl0dGVyIGFuZCBhZnRlciB0aGUgc3BsaXR0ZXJcclxuICAgICAgICAgICAgICogQHBhcmFtIHNwbGl0dGVyXHJcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt7YmVmb3JlOiAqLCBhZnRlcjogKn19XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB0aGlzLmdldFNwbGl0dGVyUmFuZ2UgPSBmdW5jdGlvbiAoc3BsaXR0ZXIpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICBiZWZvcmVTcGxpdHRlciA9IGZyb21TcGxpdHRlclRvU3BsaXR0ZXIoc3BsaXR0ZXIsIHRydWUpLFxyXG4gICAgICAgICAgICAgICAgICAgIGFmdGVyU3BsaXR0ZXIgPSBmcm9tU3BsaXR0ZXJUb1NwbGl0dGVyKHNwbGl0dGVyLCBmYWxzZSksXHJcbiAgICAgICAgICAgICAgICAgICAgdG9SZXR1cm4gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZTogYmVmb3JlU3BsaXR0ZXIuZ2V0QXZhaWxhYmxlTGVuZ3RoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyOiBhZnRlclNwbGl0dGVyLmdldEF2YWlsYWJsZUxlbmd0aCgpXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBiZWZvcmVTcGxpdHRlci5jbGVhbigpO1xyXG4gICAgICAgICAgICAgICAgYWZ0ZXJTcGxpdHRlci5jbGVhbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0b1JldHVybjtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBsb2NrL3VubG9jayBhIGdpdmVuIGJsb2NrXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBibG9jayBibG9jayBvciBibG9ja0luZGV4XHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBsb2NrIG5ldyB2YWx1ZSBmb3IgYmxvY2suaXNMb2NrZWRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlTG9ja0Jsb2NrID0gZnVuY3Rpb24gKGJsb2NrLCBsb2NrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICBibG9ja0luZGV4ID0gdHlwZW9mIGJsb2NrICE9PSAnb2JqZWN0JyA/IGJsb2NrIDogYmxvY2tzLmluZGV4T2YoYmxvY2spLFxyXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrVG9Mb2NrO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChibG9ja0luZGV4ID49IDAgJiYgYmxvY2tJbmRleCA8IGJsb2Nrcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBibG9ja1RvTG9jayA9IGJsb2Nrc1tibG9ja0luZGV4XTtcclxuICAgICAgICAgICAgICAgICAgICBibG9ja1RvTG9jay5pc0xvY2tlZCA9IGxvY2s7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIGZyb21TcGxpdHRlclRvU3BsaXR0ZXIgPSBmdW5jdGlvbiAoc3BsaXR0ZXIsIGJlZm9yZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgIHNwbGl0dGVySW5kZXggPSBibG9ja3MuaW5kZXhPZihzcGxpdHRlciksXHJcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tHcm91cCA9IGJlZm9yZSA9PT0gdHJ1ZSA/IGJsb2Nrcy5zbGljZSgwLCBzcGxpdHRlckluZGV4KSA6IGJsb2Nrcy5zbGljZShzcGxpdHRlckluZGV4ICsgMSwgYmxvY2tzLmxlbmd0aCksXHJcbiAgICAgICAgICAgICAgICAgICAgZm4gPSBiZWZvcmUgPT09IHRydWUgPyBBcnJheS5wcm90b3R5cGUucG9wIDogQXJyYXkucHJvdG90eXBlLnNoaWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvc2l0ZSA9IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIHRlc3RlZEJsb2NrO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlICh0ZXN0ZWRCbG9jayA9IGZuLmFwcGx5KGJsb2NrR3JvdXApKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEJsb2NrLmlzU3BsaXR0ZXIodGVzdGVkQmxvY2spKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvc2l0ZS5wdXNoKHRlc3RlZEJsb2NrKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQmxvY2suZ2V0TmV3Q29tcG9zaXRlKGNvbXBvc2l0ZSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfV0pO1xyXG59KShhbmd1bGFyKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=