describe('block module', function () {

    beforeEach(module('flexyLayout.block'));

    describe('composite block', function () {

        var blockMock;

        beforeEach(function () {
            blockMock = {
                moveLength: function () {
                    return 200;
                },
                canMoveLength: function () {
                    return true;
                },
                getAvailableLength: function () {
                    return 20;
                }
            };
        });

        it('should always return an object (CompositeBlock)', inject(function (Block) {
            var composite = Block.getNewComposite();
            expect(typeof composite).toEqual('object');
            expect(composite.constructor.name).toEqual('CompositeBlock');
        }));

        it('should add object that implements structural interface', inject(function (Block) {
            var composite = Block.getNewComposite(blockMock);
            expect(composite.blocks.length).toBe(1);
        }));

        it('should not add object that does not implement interface', inject(function (Block) {
            var composite = Block.getNewComposite({});
            expect(composite.blocks.length).toBe(0);
        }));

        it('should work with array argument', inject(function (Block) {
            var
                secondBlock = angular.copy(blockMock),
                composite = Block.getNewComposite([blockMock, secondBlock]);
            expect(composite.blocks[0]).toBe(blockMock);
            expect(composite.blocks[1]).toBe(secondBlock);
        }));

        it('should work with variadic arguments', inject(function (Block) {
            var
                secondBlock = angular.copy(blockMock),
                composite = Block.getNewComposite(blockMock, secondBlock);
            expect(composite.blocks[0]).toBe(blockMock);
            expect(composite.blocks[1]).toBe(secondBlock);
        }));

        describe('composite interface', function () {
            var blockMock2, composite;

            beforeEach(inject(function (Block) {
                blockMock2 = angular.copy(blockMock);
                composite = Block.getNewComposite(blockMock, blockMock2);
            }));

            it('should sum the consumable length of all members', function () {
                blockMock.getAvailableLength = function () {
                    return 400;
                };
                blockMock2.getAvailableLength = function () {
                    return 222;
                };
                spyOn(blockMock, 'getAvailableLength').andCallThrough();
                spyOn(blockMock2, 'getAvailableLength').andCallThrough();
                var available = composite.getAvailableLength();
                expect(available).toEqual(622);
                expect(blockMock.getAvailableLength).toHaveBeenCalled()
                expect(blockMock2.getAvailableLength).toHaveBeenCalled();
            });

            it('should call moveLength for all members with appropriate divider', function () {
                spyOn(blockMock, 'moveLength').andCallThrough();
                spyOn(blockMock2, 'moveLength').andCallThrough();
                composite.moveLength(500);
                expect(blockMock.moveLength).toHaveBeenCalledWith(250) // blockMock will return 200
                expect(blockMock2.moveLength).toHaveBeenCalledWith(300);
            });

            it('should call moveLength for all members with appropriate divider', inject(function (Block) {
                blockMock2.canMoveLength = function () {
                    return false;
                };
                spyOn(blockMock, 'moveLength').andCallThrough();
                spyOn(blockMock2, 'moveLength').andCallThrough();
                composite.moveLength(500);
                expect(blockMock.moveLength).toHaveBeenCalledWith(500);
                expect(blockMock2.moveLength).not.toHaveBeenCalled();
            }));

            it('composite can move length whenever at least one block can move', inject(function (Block) {
                blockMock2.canMoveLength = function () {
                    return false;
                };
                expect(composite.canMoveLength(200)).toBe(true);
            }));

            it('composite can not move length if all composing blocks can not move length', inject(function () {
                blockMock.canMoveLength = blockMock2.canMoveLength = function () {
                    return false;
                };
                expect(composite.canMoveLength()).toBe(false);
            }));
        });

        describe('Block', function () {
            var block;
            beforeEach(inject(function (Block) {
                block = Block.getNewBlock();
                block.lengthValue = 200;
            }));

            it('should not move if isLocked', function () {
                block.isLocked = true;
                var length = block.moveLength(300);
                expect(length).toEqual(0);
                expect(block.lengthValue).toEqual(200);

                length = block.moveLength(-200);
                expect(length).toEqual(0);
                expect(block.lengthValue).toEqual(200);
            });

            it('should move length value and return what it effectively moved from', function () {
                var length = block.moveLength(-100);
                expect(length).toEqual(-100);
                expect(block.lengthValue).toEqual(100);
            });

            it('should move length value and return what it effectively moved from', function () {
                var length = block.moveLength(100);
                expect(length).toEqual(100);
                expect(block.lengthValue).toEqual(300);
            });

            it('should reduce length value to maximum 0', function () {
                var length = block.moveLength(-300);
                expect(length).toEqual(-200);
                expect(block.lengthValue).toEqual(0);
            });

            it('can not move if it is locked', function () {
                block.isLocked = true;
                expect(block.canMoveLength(-100)).toBe(false);
                expect(block.canMoveLength(100)).toBe(false);
            });

            it('should always be able to expand if not locked', function () {
                expect(block.canMoveLength(100)).toBe(true);
                expect(block.canMoveLength(100000)).toBe(true);
            });

            it('should no be able to move if it is already at 0 and length is negative', function () {
                block.lengthValue = 0;
                expect(block.canMoveLength(-1)).toBe(false);
            });

            it('should not have any available length if it is locked', function () {
                block.isLocked = true;
                expect(block.getAvailableLength()).toEqual(0);
            });

            it('the available length should be its current lengthvalue', function () {
                expect(block.getAvailableLength()).toEqual(200);
                block.lengthValue = 456;
                expect(block.getAvailableLength()).toEqual(456);
            });
        });

        describe('Splitter', function () {
            var splitter;
            beforeEach(inject(function (Block) {
                splitter = Block.getNewSplitter();
            }));

            it('should never be able to move length', function () {
                expect(splitter.canMoveLength(-100)).toBe(false);
                expect(splitter.canMoveLength(100)).toBe(false);
            });

            it('should always return 0 when moving length', function () {
                var length = splitter.moveLength(100);
                expect(length).toEqual(0);
                length = splitter.moveLength(-100);
                expect(length).toEqual(0);
            });

            it('should not have any length available', function () {
                expect(splitter.getAvailableLength()).toEqual(0);
            });

            it('should return true if instance of splitter',inject(function (Block) {
                expect(Block.isSplitter(splitter)).toBe(true);
                expect(Block.isSplitter(Block.getNewBlock())).toBe(false);
                expect(Block.isSplitter(Block.getNewComposite())).toBe(false);
            }));
        });
    });
});

