(function (angular) {
    "use strict";
    angular.module('flexyLayout.block', [])
        .provider('Block', function () {

            function CompositeBlock(composingBlocks) {
                this.blocks = [];

                if (angular.isArray(composingBlocks)) {
                    for (var i = 0, l = composingBlocks.length; i < l; i++) {
                        if (composingBlocks[i].moveLength && composingBlocks[i].canMoveLength) {
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

            Block.prototype.canMoveLength = function (length) {
                return !(this.isLocked === true || (length < 0 && (this.lengthValue - this.minLength) === 0));
            };


            function Splitter() {
                this.lengthValue = 5;
            }

            Splitter.prototype.canMoveLength = function (length) {
                return false;
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
