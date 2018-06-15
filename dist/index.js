var Module;
var canvas = document.getElementById('map');
var context = canvas.getContext('2d');
var waterLevelInput = document.getElementById('waterlevel');
var xOffsetInput = document.querySelector('input[name="xoffset"]');
var yOffsetInput = document.querySelector('input[name="yoffset"]');
var WIDTH = canvas.width;
var HEIGHT = canvas.height;
var elevationPointer;
var elevation;
var ITERATIONS = 1000;
var MAX_ELEVATION = 500;
var MIN_ELEVATION = -500;
var WATER_LEVEL = 0;
var MOUNTAIN_LEVEL = 150;
var X_OFFSET = 0;
var Y_OFFSET = 0;
// Spectrum from dark blue to light green
var GROUND_COLOR_BOUNDS = {
    red: [15, 201],
    green: [132, 192],
    blue: [13, 124]
};
var MOUNTAIN_COLOR_BOUNDS = {
    red: [201, 135],
    green: [192, 90],
    blue: [124, 0]
};
var WATER_COLOR_BOUNDS = {
    red: [0, 40],
    green: [17, 201],
    blue: [153, 255]
};
var cModule;
function reset() {
    WATER_LEVEL = 0;
    X_OFFSET = 0;
    Y_OFFSET = 0;
    yOffsetInput.value = Y_OFFSET + '';
    xOffsetInput.value = X_OFFSET + '';
    waterLevelInput.value = WATER_LEVEL + '';
    var radius = Math.min(WIDTH, HEIGHT) / 2;
    var step = -MIN_ELEVATION / radius;
    cModule.resetMap(elevationPointer, WIDTH, HEIGHT);
}
function generateFull(mapPointer, map) {
    var before = performance.now();
    cModule.generateElevations(mapPointer, WIDTH, HEIGHT, ITERATIONS);
    console.log('Average time', (performance.now() - before) / ITERATIONS);
    paint(map);
}
function paint(heightMap) {
    var imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
    var dataArr = imageData.data;
    for (var y = 0; y < HEIGHT; ++y) {
        var rowOffset = y * WIDTH * 4;
        var yCoord = (y + HEIGHT + Y_OFFSET) % HEIGHT;
        for (var x = 0; x < WIDTH; ++x) {
            var base = rowOffset + x * 4;
            var color = colorForElevation(heightMap[yCoord * WIDTH + ((x + WIDTH + X_OFFSET) % WIDTH)]);
            dataArr[base] = color[0]; // Red
            dataArr[base + 1] = color[1]; // Green
            dataArr[base + 2] = color[2]; // Blue
            dataArr[base + 3] = 255; // Alpha
        }
    }
    context.putImageData(imageData, 0, 0);
}
function colorForElevation(elevation) {
    var bounds;
    var percentElevation;
    if (elevation < WATER_LEVEL) {
        bounds = WATER_COLOR_BOUNDS;
        percentElevation = (elevation - MIN_ELEVATION) / (WATER_LEVEL - MIN_ELEVATION);
        // } else if (elevation <= MOUNTAIN_LEVEL) {
        // 	bounds = GROUND_COLOR_BOUNDS;
        // 	percentElevation = (elevation - WATER_LEVEL) / (MOUNTAIN_LEVEL - WATER_LEVEL);
        // } else {
        // 	bounds = MOUNTAIN_COLOR_BOUNDS;
        // 	percentElevation = (elevation - MOUNTAIN_LEVEL) / (MAX_ELEVATION - MOUNTAIN_LEVEL);
        // }
    }
    else {
        bounds = GROUND_COLOR_BOUNDS;
        percentElevation = (elevation - WATER_LEVEL) / (MAX_ELEVATION - WATER_LEVEL);
    }
    return [
        (bounds.red[0] + (bounds.red[1] - bounds.red[0]) * percentElevation) | 0,
        (bounds.green[0] + (bounds.green[1] - bounds.green[0]) * percentElevation) | 0,
        (bounds.blue[0] + (bounds.blue[1] - bounds.blue[0]) * percentElevation) | 0,
    ];
}
function updateWaterLevel() {
    WATER_LEVEL = parseInt(waterLevelInput.value);
    MOUNTAIN_LEVEL = WATER_LEVEL + 150;
    paint(elevation);
}
function updateXOffset(newValue) {
    X_OFFSET = parseInt(newValue, 10) % WIDTH;
    paint(elevation);
}
function updateYOffset(newValue) {
    Y_OFFSET = parseInt(newValue, 10) % HEIGHT;
    paint(elevation);
}
// Dragging functionality
(function () {
    var dragging = false;
    var origX = NaN;
    var origY = NaN;
    var origXOffset = NaN;
    var origYOffset = NaN;
    canvas.addEventListener('mousedown', function (event) {
        dragging = true;
        origX = event.clientX;
        origY = event.clientY;
        origXOffset = X_OFFSET;
        origYOffset = Y_OFFSET;
    });
    canvas.addEventListener('mousemove', function (event) {
        if (dragging) {
            X_OFFSET = (origXOffset + origX - event.clientX) % WIDTH;
            Y_OFFSET = (origYOffset + origY - event.clientY) % HEIGHT;
            paint(elevation);
        }
    });
    function stopDragging() {
        dragging = false;
        xOffsetInput.value = X_OFFSET + '';
        yOffsetInput.value = Y_OFFSET + '';
    }
    canvas.addEventListener('mouseleave', stopDragging);
    canvas.addEventListener('mouseup', stopDragging);
})();
Module['onRuntimeInitialized'] = function () {
    cModule = {
        createBaseMap: Module.cwrap('createBaseMap', 'number', ['number', 'number']),
        generateElevations: Module.cwrap('generateElevations', 'void', ['number', 'number', 'number', 'number']),
        resetMap: Module.cwrap('resetMap', 'void', ['number', 'number', 'number'])
    };
    // Get pointer and reference to the created map
    elevationPointer = cModule.createBaseMap(WIDTH, HEIGHT);
    elevation = Module.HEAPF64.subarray(elevationPointer / 8, elevationPointer / 8 + WIDTH * HEIGHT);
    generateFull(elevationPointer, elevation);
    // let count = 0;
    // let totalTime = 0;
    // const interval = setInterval(function() {
    // 	const last = window.performance.now();
    // 	addFault(elevation);
    // 	totalTime += window.performance.now() - last;
    // 	count++;
    // 	if (count >= ITERATIONS) {
    // 		clearInterval(interval);
    // 		console.log('Average time: ', totalTime / ITERATIONS)
    // 	}
    // }, 0);
};
function regenerate() {
    reset();
    generateFull(elevationPointer, elevation);
}
