(function (angular) {
    "use strict";
    angular.module('flexyLayout.mediator', ['flexyLayout.block', 'flexyLayout.directives']).
        controller('mediatorCtrl', ['$scope', '$element', '$attrs', 'Block', function (scope, element, attrs, Block) {

            var blocks = [],
                pendingSplitter = null,
                splitterCount = 0,
                self = this,
                possibleOrientations = ['vertical', 'horizontal'],
                orientation = possibleOrientations.indexOf(attrs.orientation) !== -1 ? attrs.orientation : 'horizontal',
                className = orientation === 'horizontal' ? 'column' : 'row';

            element.addClass(className);

            this.lengthProperties = orientation === 'horizontal' ? {lengthName: 'width', offsetName: 'offsetWidth', positionName: 'left', position: 'x', eventProperty: 'clientX'} :
            {lengthName: 'height', offsetName: 'offsetHeight', positionName: 'top', position: 'y', eventProperty: 'clientY'};

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
                    this.movingSplitter = null;
                }
            };

            element.bind('mouseup', function (event) {
                scope.$apply(angular.bind(self, mouseUpHandler, event));
            });

            //todo should do some throttle before call apply
            element.bind('mousemove', function (event) {
                scope.$apply(angular.bind(self, mouseMoveHandler, event));
            });


            /////   adding blocks   ////

            this.addBlock = function (block) {

                var composite;
                var elementLength = element[0][this.lengthProperties.offsetName];

                if (blocks.length < 1) {
                    blocks.push(block);
                    block.moveLength(elementLength);
                }
                else {

                    if (isSplitter(block)) {
                        pendingSplitter = block;
                    }
                    else {

                        if (pendingSplitter !== null) {
                            blocks.push(pendingSplitter);
                            composite = Block.getNewComposite(blocks);
                            composite.moveLength(-pendingSplitter.lengthValue);
                            splitterCount++;
                            pendingSplitter = null;
                        }

                        blocks.push(block);
                        this.moveBlockLength(block, ((elementLength ) / (blocks.length - splitterCount)));
                    }
                }
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

                //free memory?
                //composite.clean();
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

                if (!isSplitter(splitter) || splitterIndex === -1) {
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

            };

            /**
             * return an object with the available length before the splitter and after the splitter
             * @param splitter
             * @returns {{before: *, after: *}}
             */
            this.getSplitterRange = function (splitter) {

                var
                    beforeSplitter = fromSplitterToSplitter(splitter, true),
                    afterSplitter = fromSplitterToSplitter(splitter, false);

                return{
                    before: beforeSplitter.getAvailableLength(),
                    after: afterSplitter.getAvailableLength()
                };
            };

            /**
             * lock/unlock a given block
             * @param block block or blockIndex
             * @param lock new value for block.isLocked
             */
            this.toggleLockBlock = function (block,lock) {
                var
                    blockIndex = typeof block !== 'object' ? block : blocks.indexOf(block),
                    blockToLock;

                if (blockIndex >= 0 && blockIndex < blocks.length) {
                    blockToLock = blocks[blockIndex];
                    blockToLock.isLocked = lock;
                }

            };

            /// utilities /////

            var isSplitter = function (block) {
                return (typeof block === 'object') && (block.constructor.name === 'Splitter');
            };

            var fromSplitterToSplitter = function (splitter, before) {

                var
                    splitterIndex = blocks.indexOf(splitter),
                    blockGroup = before === true ? blocks.slice(0, splitterIndex) : blocks.slice(splitterIndex + 1, blocks.length),
                    fn = before === true ? Array.prototype.pop : Array.prototype.shift,
                    composite = [],
                    testedBlock;

                while (testedBlock = fn.apply(blockGroup)) {
                    if (isSplitter(testedBlock)) {
                        break;
                    } else {
                        composite.push(testedBlock);
                    }
                }
                return Block.getNewComposite(composite);
            };
        }]);
})(angular);