(function (angular) {
    "use strict";
    angular.module('flexyLayout.block', [])
        .provider('Block', function () {

            function CompositeBlock(composingBlocks) {
                this.blocks = [];

                if (angular.isArray(composingBlocks)) {
                    for (var i = 0, l = composingBlocks.length; i < l; i++) {
                        if (composingBlocks[i].moveLength && composingBlocks[i].isBlockLocked) {
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
                    if (this.blocks[i].isBlockLocked() !== true) {
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

            CompositeBlock.prototype.isBlockLocked = function () {

                for (var i = 0, l = this.blocks.length; i < l; i++) {
                    if (this.blocks[i].isLocked !== true) {
                        return false
                    }
                }

                return true;
            };

            CompositeBlock.prototype.clean = function () {
                this.blocks = [];
            };

            function Block() {
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

            Block.prototype.isBlockLocked = function () {
                return this.isLocked;
            };


            function Splitter() {
                this.lengthValue = 5;
            }

            Splitter.prototype.isBlockLocked = function () {
                return true;
            };

            Splitter.prototype.moveLength = function () {
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
                    getNewBlock: function () {
                        return new Block();
                    },
                    getNewSplitter: function () {
                        return new Splitter();
                    }
                };
            }
        });
})(angular);
