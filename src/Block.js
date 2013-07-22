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