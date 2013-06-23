(function (angular) {
    "use strict";
    angular.module('flexyLayout.mediator', ['flexyLayout.block', 'flexyLayout.directives']).
        controller('mediatorCtrl', ['$scope', '$element', 'Block', function (scope, element, Block) {

            var blocks = [];

            this.addBlock = function (block) {

                var length;

                if (block.moveLength) {
                    if (blocks.length < 1) {
                        blocks.push(block);
                        block.moveLength(element[0].offsetWidth);
                    } else {
                        length = blocks.length < 1 ? element[0].offsetWidth : 200;
                        blocks.push(block);
                        this.moveBlockLength(block, length);
                    }
                }
            };

            this.moveBlockLength = function (block, length) {

                var
                    blockIndex = blocks.indexOf(block),
                    composingBlocks,
                    composite,
                    availableLength;

                if (blockIndex === -1 || length === 0 || block.isLocked===true) {
                    return;
                }

                composingBlocks = (blocks.slice(0, blockIndex)).concat(blocks.slice(blockIndex + 1, blocks.length));
                composite = Block.getNewComposite(composingBlocks);

                if(composite.isBlockLocked()===true){
                    return;
                }

                if (length < 0) {
                    availableLength = (-1) * block.moveLength(length);
                    composite.moveLength(availableLength);
                } else {
                    availableLength = (-1) * composite.moveLength(-length);
                    block.moveLength(availableLength);
                }

                //free memory
                composite.clean();
            }
        }]);
})(angular);
