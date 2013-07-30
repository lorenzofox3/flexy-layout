(function (angular) {
    "use strict";
    //TODO this guy is now big, split it, maybe the part for event handling should be moved somewhere else
    angular.module('flexyLayout.mediator', ['flexyLayout.block']).
        controller('mediatorCtrl', ['$scope', '$element', '$attrs', 'Block', function (scope, element, attrs, Block) {

            var blocks = [],
                pendingSplitter = null,
                splitterCount = 0,
                self = this,
                possibleOrientations = ['vertical', 'horizontal'],
                orientation = possibleOrientations.indexOf(attrs.orientation) !== -1 ? attrs.orientation : 'horizontal',
                className = orientation === 'horizontal' ? 'flexy-layout-column' : 'flexy-layout-row';

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
                bufferBlock.moveLength(elementLength - splitterCount * 5);

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