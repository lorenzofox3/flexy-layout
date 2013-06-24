(function (angular) {
    "use strict";
    angular.module('flexyLayout.mediator', ['flexyLayout.block', 'flexyLayout.directives']).
        controller('mediatorCtrl', ['$scope', '$element', 'Block', function (scope, element, Block) {

            var blocks = [];
            var splitter = null;
            var splitterCount = 0;

            this.addBlock = function (block) {


                //must implement the structural interface
                if (block.moveLength && block.canMoveLength) {

                    if (blocks.length < 1) {
                        blocks.push(block);
                        block.moveLength(element[0].offsetWidth);
                    }
                    else {

                        if (isSplitter(block)) {
                            splitter = block;
                        }
                        else {

                            if (splitter !== null) {
                                blocks.push(splitter);
                                var composite=Block.getNewComposite(blocks);
                                composite.moveLength(-5);
                                splitterCount++;
                                splitter = null;
                            }

                            blocks.push(block);
                            this.moveBlockLength(block, ((element[0].offsetWidth ) / (blocks.length - splitterCount)) + 5 * splitterCount);
                        }
                    }
                }
            };


            //not the best but Splitter function is not exposed to global scope
            var isSplitter = function (block) {
                return (typeof block === 'object') && (block.constructor.name === 'Splitter');
            };

            this.moveBlockSplitter = function (splitter, length) {

                //that sucks, too many variables !!!
                var
                    splitterIndex = blocks.indexOf(splitter),
                    allBeforeBlockList = blocks.slice(0, splitterIndex),
                    allAfterBlockList = blocks.slice(splitterIndex + 1, blocks.length),
                    beforeArg = [],
                    afterArg = [],
                    beforeComposite,
                    afterComposite,
                    testedBlock,
                    availableLength;

                if (!isSplitter(splitter) || splitterIndex === -1) {
                    return;
                }

                //set before composite
                while (testedBlock = allBeforeBlockList.pop()) {
                    if (isSplitter(testedBlock)) {
                        break;
                    }
                    else {
                        beforeArg.push(testedBlock);
                    }
                }

                //set after composite
                while (testedBlock = allAfterBlockList.shift()) {
                    if (isSplitter(testedBlock)) {
                        break;
                    } else {
                        afterArg.push(testedBlock);
                    }
                }

                beforeComposite = Block.getNewComposite(beforeArg);
                afterComposite = Block.getNewComposite(afterArg);

                if (!beforeComposite.canMoveLength(length) || !afterComposite.canMoveLength(length)) {
                    return;
                }

                if (length < 0) {
                    availableLength = (-1) * beforeComposite.moveLength(length);
                    afterComposite.moveLength(availableLength);
                } else {
                    availableLength = (-1) * afterComposite.moveLength(-length);
                    beforeComposite.moveLength(-availableLength);
                }


            };


            this.moveBlockLength = function (block, length) {

                var
                    blockIndex = blocks.indexOf(block),
                    composingBlocks,
                    composite,
                    availableLength;

                if (blockIndex === -1 || length === 0 || block.canMoveLength(length) !== true) {
                    return;
                }

                composingBlocks = (blocks.slice(0, blockIndex)).concat(blocks.slice(blockIndex + 1, blocks.length));
                composite = Block.getNewComposite(composingBlocks);

                if(!composite.canMoveLength(-length)){
                    return;
                }

                if (length < 0) {
                    availableLength = (-1) * block.moveLength(length);
                    composite.moveLength(availableLength);
                } else {
                    availableLength = (-1) * composite.moveLength(-length);
                    block.moveLength(availableLength);
                }

                //free memory?
                //composite.clean();
            }
        }]);
})(angular);
