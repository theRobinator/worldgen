let Module: {[key: string]: any};

const canvas = document.getElementById('map') as HTMLCanvasElement;
const context = canvas.getContext('2d');

const waterLevelInput = document.getElementById('waterlevel') as HTMLInputElement;
const xOffsetInput = document.querySelector('input[name="xoffset"]') as HTMLInputElement
const yOffsetInput = document.querySelector('input[name="yoffset"]') as HTMLInputElement

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let elevationPointer: number;
let elevation: Float64Array;

const ITERATIONS = 1000;
const MAX_ELEVATION = 500;
const MIN_ELEVATION = -500;

let WATER_LEVEL = 0;
let MOUNTAIN_LEVEL = 150;

let X_OFFSET = 0;
let Y_OFFSET = 0;

// Spectrum from dark blue to light green
const GROUND_COLOR_BOUNDS = {
	red: [15, 201],
	green: [132, 192],
	blue: [13, 124],
};

const MOUNTAIN_COLOR_BOUNDS = {
	red: [201, 135],
	green: [192, 90],
	blue: [124, 0],
};

const WATER_COLOR_BOUNDS = {
	red: [0, 40],
	green: [17, 201],
	blue: [153, 255],
};

interface ElevationCModule {
	createBaseMap(width: number, height: number): number;
	generateElevations(mapPointer: number, width: number, height: number, iterations: number): void;
	resetMap(mapPointer: number, width: number, height: number): void;
}
let cModule: ElevationCModule;

function reset() {
	WATER_LEVEL = 0;
	X_OFFSET = 0;
	Y_OFFSET = 0;
	yOffsetInput.value = Y_OFFSET + '';
	xOffsetInput.value = X_OFFSET + '';
	waterLevelInput.value = WATER_LEVEL + '';

	const radius = Math.min(WIDTH, HEIGHT) / 2;
	const step = -MIN_ELEVATION / radius;
	cModule.resetMap(elevationPointer, WIDTH, HEIGHT);
}

function generateFull(mapPointer: number, map: Float64Array) {
	const before = performance.now();
	cModule.generateElevations(mapPointer, WIDTH, HEIGHT, ITERATIONS);
	console.log('Average time', (performance.now() - before) / ITERATIONS);

	paint(map);
}

function paint(heightMap: Float64Array) {
	const imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
	const dataArr = imageData.data;
	for (let y = 0; y < HEIGHT; ++y) {
		const rowOffset = y * WIDTH * 4;
		const yCoord = (y + HEIGHT + Y_OFFSET) % HEIGHT;
		for (let x = 0; x < WIDTH; ++x) {
			const base = rowOffset + x * 4;
			const color = colorForElevation(heightMap[yCoord * WIDTH + ((x + WIDTH + X_OFFSET) % WIDTH)]);
			dataArr[base] = color[0];  // Red
			dataArr[base + 1] = color[1];  // Green
			dataArr[base + 2] = color[2];  // Blue
			dataArr[base + 3] = 255;  // Alpha
		}
	}
	context.putImageData(imageData, 0, 0);
}

function colorForElevation(elevation: number): [number, number, number] {
	let bounds;
	let percentElevation;
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
	} else {
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

function updateXOffset(newValue: string) {
	X_OFFSET = parseInt(newValue, 10) % WIDTH;
	paint(elevation);
}

function updateYOffset(newValue: string) {
	Y_OFFSET = parseInt(newValue, 10) % HEIGHT;
	paint(elevation);
}

// Dragging functionality
(function() {
	let dragging = false;
	let origX = NaN;
	let origY = NaN;
	let origXOffset = NaN;
	let origYOffset = NaN;
	canvas.addEventListener('mousedown', function(event) {
		dragging = true;
		origX = event.clientX;
		origY = event.clientY;
		origXOffset = X_OFFSET;
		origYOffset = Y_OFFSET;
	});
	canvas.addEventListener('mousemove', function(event) {
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

Module['onRuntimeInitialized'] = function() {
	cModule = {
		createBaseMap: Module.cwrap('createBaseMap', 'number', ['number', 'number']),
		generateElevations: Module.cwrap('generateElevations', 'void', ['number', 'number', 'number', 'number']),
		resetMap: Module.cwrap('resetMap', 'void', ['number', 'number', 'number']),
	};

	// Get pointer and reference to the created map
	elevationPointer = cModule.createBaseMap(WIDTH, HEIGHT);

	elevation = Module.HEAPF64.subarray(elevationPointer/8, elevationPointer/8 + WIDTH*HEIGHT);


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
