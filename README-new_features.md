```
<block-splitter on-splitter-stop="fsResized" size="50"></block-splitter>
```



Callback onSplitterStop
=======================

Set this attribute on the splitter block to a function name (not a function call ;)
and get notified when the splitter stopped moving.

```
$scope.fsResized = function (ghostPosition, length) {
    console.log('triggered', ghostPosition, length);
    $timeout(
        $scope.FileBrowser.api.core.handleWindowResize,
        100
    );
};

```

2 hmmm:

1. ghostPosition always seems to be [0, 0]. Why?
2. FileBrowser is a config object for a ui-grid. The grid has to pick up the new
   size, and it seems to need a delay, before the new numbers are ready.
   Could we evade using a timeout by intelligently using $apply()/$digest()?
   

Splitter size
=============

Set this attribute to a number. The directive will in regards to the set
orientation apply it as pixels to the respective element style ('height' or
'width').
