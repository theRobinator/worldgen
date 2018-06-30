import {FaultGenerator} from './faultgenerator.js';


const WorldGen: {[key: string]: any} = {};
window.WorldGen = WorldGen;

const canvas = document.getElementById('map') as HTMLCanvasElement;
const context = canvas.getContext('2d');
const elevation: number[][] = [];

const WORKERS: Worker[] = [];

const waterLevelInput = document.getElementById('waterlevel') as HTMLInputElement;
const xOffsetInput = document.querySelector('input[name="xoffset"]') as HTMLInputElement
const yOffsetInput = document.querySelector('input[name="yoffset"]') as HTMLInputElement

const WIDTH = canvas.width * 3;
const HEIGHT = canvas.height * 3;

const ITERATIONS = 1000;
const MAX_ELEVATION = 1000;
const MIN_ELEVATION = -1000;
const WORKER_COUNT = 4;

let WATER_LEVEL = 0;
let MOUNTAIN_LEVEL = 150;

let X_OFFSET = 0;
let Y_OFFSET = 0;

let ZOOM_LEVEL = 3;

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

// Initialize memory
reset();
const faultGenerator = new FaultGenerator(WIDTH, HEIGHT, elevation);
for (let i = 0; i < WORKER_COUNT; ++i) {
	WORKERS.push(new Worker('/workerbase.js'));
}

function reset() {
	WATER_LEVEL = 0;
	X_OFFSET = 0;
	Y_OFFSET = 0;
	yOffsetInput.value = Y_OFFSET + '';
	xOffsetInput.value = X_OFFSET + '';
	waterLevelInput.value = WATER_LEVEL + '';

	for (let x = 0; x < WIDTH; ++x) {
		elevation[x] = [];
		for (let y = 0; y < HEIGHT; ++y) {
			elevation[x][y] = 0;
		}
	}
}

function generateFull(heightMap: number[][]) {
	const before = performance.now();
	let started = 0;
	let done = 0;
	const iterationCount = Math.round(ITERATIONS / WORKER_COUNT);
	for (let i = 1; i < WORKER_COUNT; ++i) {
		const worker = WORKERS[i];
		const listener = function(message: MessageEvent) {
			const data = message.data;
			if (data['type'] === 'status') {
				started++;
				if (started === WORKER_COUNT - 1) {
					// Start the main thread now that everything else is running
					console.log('Main thread starting');
					faultGenerator.regenerate(iterationCount);
					console.log('Main thread complete');
				}
			} else if (data['type'] === 'result') {
				console.log('Got data back');
				const elevationDelta = data['data'];
				for (let x = 0; x < WIDTH; ++x) {
					for (let y = 0; y < HEIGHT; ++y) {
						heightMap[x][y] = Math.max(Math.min(heightMap[x][y] + elevationDelta[x][y], MAX_ELEVATION), MIN_ELEVATION);
					}
				}
				done++;
				if (done === WORKER_COUNT - 1) {
					console.log('Average time', (performance.now() - before) / ITERATIONS);
					setPercentWater(heightMap, 0.67);
					paint(heightMap);
				}
				worker.removeEventListener('message', listener);
			}
		};
		worker.addEventListener('message', listener);
		worker.postMessage(['buildElevationMap', iterationCount, WIDTH, HEIGHT]);
	}
}

function paint(heightMap: number[][]) {
	const zoomDivisor = ZOOM_LEVEL * ZOOM_LEVEL;
	const canvasWidth = canvas.width, canvasHeight = canvas.height;
	const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
	const dataArr = imageData.data;

	for (let y = 0; y < canvasHeight; ++y) {
		const rowOffset = y * canvasWidth * 4;
		const yCoord = (ZOOM_LEVEL * (y + HEIGHT) + Y_OFFSET) % HEIGHT;
		for (let x = 0; x < canvasWidth; ++x) {
			const xCoord = (ZOOM_LEVEL * (x + WIDTH) + X_OFFSET) % WIDTH;

			let aggregatedElevation = 0;
			let nextX, nextY;
			switch (ZOOM_LEVEL) {
				case 1:
					aggregatedElevation = heightMap[xCoord][yCoord];
					break;
				case 2:
					nextX = (xCoord + 1) % WIDTH;
					nextY = (yCoord + 1) % HEIGHT;
					aggregatedElevation = heightMap[xCoord][yCoord]
										+ heightMap[nextX][yCoord]
										+ heightMap[xCoord][nextY]
										+ heightMap[nextX][nextY];
					break;
				case 3:
					nextX = (xCoord + 1) % WIDTH;
					nextY = (yCoord + 1) % HEIGHT;
					let thirdX = (xCoord + 2) % WIDTH;
					let thirdY = (yCoord + 2) % HEIGHT;

					aggregatedElevation = heightMap[xCoord][yCoord]
										+ heightMap[nextX][yCoord]
										+ heightMap[thirdX][yCoord]
										+ heightMap[xCoord][nextY]
										+ heightMap[nextX][nextY]
										+ heightMap[thirdX][nextY]
										+ heightMap[xCoord][thirdY]
										+ heightMap[nextX][thirdY]
										+ heightMap[thirdX][thirdY];
					break;

			}

			const color = colorForElevation(aggregatedElevation / zoomDivisor);
			const base = rowOffset + x * 4;
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

function setPercentWater(heightMap: number[][], percent: number) {
	// Sort everything
	const sortedPixels: number[] = [];
	sortedPixels.length = WIDTH * HEIGHT;
	for (let y = 0; y < HEIGHT; ++y) {
		const rowBase = y * WIDTH;
		for (let x = 0; x < WIDTH; ++x) {
			sortedPixels[rowBase + x] = heightMap[x][y];
		}
	}
	sortedPixels.sort((a, b) => a - b);

	WATER_LEVEL = sortedPixels[Math.floor(WIDTH * HEIGHT * percent)];
	waterLevelInput.value = WATER_LEVEL.toString();
}

function updateWaterLevel() {
	WATER_LEVEL = parseInt(waterLevelInput.value);
	MOUNTAIN_LEVEL = WATER_LEVEL + 150;
	paint(elevation);
}
WorldGen['updateWaterLevel'] = updateWaterLevel;

function updateXOffset(newValue: string) {
	X_OFFSET = parseInt(newValue, 10) % WIDTH;
	paint(elevation);
}
WorldGen['updateXOffset'] = updateXOffset;

function updateYOffset(newValue: string) {
	Y_OFFSET = parseInt(newValue, 10) % HEIGHT;
	paint(elevation);
}
WorldGen['updateYOffset'] = updateYOffset;

function updateZoomLevel(newValue: string, centerX?: number, centerY?: number) {
	const newZoom = parseInt(newValue, 10);
	const maxZoom = Math.max(ZOOM_LEVEL, newZoom);
	if (centerX === undefined) {
		centerX = Math.round(canvas.width / maxZoom);
	}
	if (centerY === undefined) {
		centerY = Math.round(canvas.height / maxZoom);
	}

	if (newZoom > ZOOM_LEVEL) {
		// Zooming out
		X_OFFSET = (X_OFFSET - centerX + WIDTH) % WIDTH;
		Y_OFFSET = (Y_OFFSET - centerY + HEIGHT) % HEIGHT;
	} else {
		// Zooming in
		X_OFFSET = (X_OFFSET + centerX + WIDTH) % WIDTH;
		Y_OFFSET = (Y_OFFSET + centerY + HEIGHT) % HEIGHT;
	}
	ZOOM_LEVEL = newZoom;
	paint(elevation);
}
WorldGen['updateZoomLevel'] = updateZoomLevel;

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
			X_OFFSET = (origXOffset + (origX - event.clientX) * ZOOM_LEVEL) % WIDTH;
			Y_OFFSET = (origYOffset + (origY - event.clientY) * ZOOM_LEVEL) % HEIGHT;
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

// Zooming functionality
(function() {
	let lastScrollTime = 0;
	const isFirefox = /Firefox/i.test(navigator.userAgent);
	canvas.addEventListener(isFirefox ? "DOMMouseScroll" : "mousewheel", function(event: {[key: string]: any}) {
		const now = Date.now();
		if (now > lastScrollTime + 1000) {  // Throttle to once per second
			lastScrollTime = now;

			const goingUp = isFirefox ? event.detail < 0 : event.wheelDeltaY > 0;

			let newLevel = goingUp ? ZOOM_LEVEL - 1 : ZOOM_LEVEL + 1;
			if (newLevel < 1) {
				newLevel = 1;
			} else if (newLevel > 3) {
				newLevel = 3;
			}
			if (newLevel != ZOOM_LEVEL) {
				updateZoomLevel(newLevel + '', event.clientX, event.clientY);
			}
		}
		event.preventDefault();
		event.stopPropagation();
		return false;
	});

	canvas.addEventListener('mouseenter', e => document.body.style.overflow = 'hidden');
	canvas.addEventListener('mouseleave', e => document.body.style.overflow = 'scroll');
})();

window.addEventListener('load', function() {
	// paint(elevation);

	generateFull(elevation);

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
});

function regenerate() {
	reset();
	generateFull(elevation);
	context.clearRect(0, 0, canvas.width, canvas.height);
}
WorldGen['regenerate'] = regenerate;

function invert() {
	for (let x = 0; x < WIDTH; ++x) {
		for (let y = 0; y < HEIGHT; ++y) {
			elevation[x][y] = -elevation[x][y];
		}
	}
	paint(elevation);
}
WorldGen['invert'] = invert;
