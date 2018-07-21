import {FaultGenerator} from './faultgenerator';
import {RiverGenerator} from './rivergenerator';
import {getLandColor} from './colormap';
import {Settings} from './settings';


const WorldGen: {[key: string]: any} = {};
window.WorldGen = WorldGen;

const canvas = document.getElementById('map') as HTMLCanvasElement;
const context = canvas.getContext('2d');
const elevation: number[][] = [];
const moistureMap: number[][] = [];

const WORKERS: Worker[] = [];

const statusDisplay = document.getElementById('statusDisplay');
const waterLevelInput = document.getElementById('waterlevel') as HTMLInputElement;
const xOffsetInput = document.querySelector('input[name="xoffset"]') as HTMLInputElement
const yOffsetInput = document.querySelector('input[name="yoffset"]') as HTMLInputElement

const WIDTH = canvas.width * 3;
const HEIGHT = canvas.height * 3;

const ITERATIONS = 1000;
const WORKER_COUNT = 4;
const startingMoisture = Settings.MAX_MOISTURE / 2;
let MOUNTAIN_LEVEL = 150;

let X_OFFSET = 0;
let Y_OFFSET = 0;

let ZOOM_LEVEL = 3;

// Spectrum from dark blue to light green
const GROUND_COLOR_BOUNDS = {
	red: [15, 255],
	green: [132, 212],
	blue: [13, 0],
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
const riverGenerator = new RiverGenerator(elevation, moistureMap);
const moistureGenerator = new FaultGenerator(WIDTH, HEIGHT, moistureMap, startingMoisture);

function reset() {
	Settings.WATER_LEVEL = 0;
	X_OFFSET = 0;
	Y_OFFSET = 0;
	yOffsetInput.value = Y_OFFSET + '';
	xOffsetInput.value = X_OFFSET + '';
	waterLevelInput.value = Settings.WATER_LEVEL + '';

	for (let x = 0; x < WIDTH; ++x) {
		elevation[x] = [];
		moistureMap[x] = [];
		for (let y = 0; y < HEIGHT; ++y) {
			elevation[x][y] = 0;
			moistureMap[x][y] = startingMoisture;
		}
	}
}

function generateFull(heightMap: number[][]) {
	const before = performance.now();
	let started = 0;
	let done = 0;
	statusDisplay.style.display = 'block';
	statusDisplay.innerHTML = 'Generating terrain...';
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
					statusDisplay.innerHTML = 'Compiling terrain...';
				}
			} else if (data['type'] === 'result') {
				console.log('Got data back');
				const elevationDelta = data['data'];
				const MAX_ELEVATION = Settings.MAX_ELEVATION, MIN_ELEVATION = Settings.MIN_ELEVATION;
				for (let x = 0; x < WIDTH; ++x) {
					for (let y = 0; y < HEIGHT; ++y) {
						heightMap[x][y] = Math.max(Math.min(heightMap[x][y] + elevationDelta[x][y], MAX_ELEVATION), MIN_ELEVATION);
					}
				}
				done++;
				if (done === WORKER_COUNT - 1) {
					console.log('Average time', (performance.now() - before) / ITERATIONS);
					statusDisplay.innerHTML = 'Computing rainfall...';
					setTimeout(() => {
						setPercentWater(heightMap, 0.67);
						moistureGenerator.regenerate(150);
						riverGenerator.generate(100, Settings.WATER_LEVEL, 0, 0, WIDTH, HEIGHT);
						
						// const MAX_MOISTURE = Settings.MAX_MOISTURE;
						// for (let x = 0; x < WIDTH; ++x) {
						// 	for (let y = 0; y < HEIGHT; ++y) {
						// 		moistureMap[x][y] = Math.max(Math.min(moistureMap[x][y], MAX_MOISTURE), 0);
						// 	}
						// }
						paint(heightMap);
						statusDisplay.style.display = 'none';
					}, 10);
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
			let aggregatedMoisture = 0;
			let nextX, nextY;
			switch (ZOOM_LEVEL) {
				case 1:
					aggregatedElevation = heightMap[xCoord][yCoord];
					aggregatedMoisture = moistureMap[xCoord][yCoord];
					break;
				case 2:
					nextX = (xCoord + 1) % WIDTH;
					nextY = (yCoord + 1) % HEIGHT;
					aggregatedElevation = heightMap[xCoord][yCoord]
										+ heightMap[nextX][yCoord]
										+ heightMap[xCoord][nextY]
										+ heightMap[nextX][nextY];
					aggregatedMoisture  = moistureMap[xCoord][yCoord]
										+ moistureMap[nextX][yCoord]
										+ moistureMap[xCoord][nextY]
										+ moistureMap[nextX][nextY];
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

					aggregatedMoisture  = moistureMap[xCoord][yCoord]
										+ moistureMap[nextX][yCoord]
										+ moistureMap[thirdX][yCoord]
										+ moistureMap[xCoord][nextY]
										+ moistureMap[nextX][nextY]
										+ moistureMap[thirdX][nextY]
										+ moistureMap[xCoord][thirdY]
										+ moistureMap[nextX][thirdY]
										+ moistureMap[thirdX][thirdY];
					break;

			}

			//const color = colorForMoisture(aggregatedElevation / zoomDivisor, aggregatedMoisture / zoomDivisor);
			const color = getLandColor(aggregatedElevation / zoomDivisor, aggregatedMoisture / zoomDivisor);
			const base = rowOffset + x * 4;
			dataArr[base] = color[0];  // Red
			dataArr[base + 1] = color[1];  // Green
			dataArr[base + 2] = color[2];  // Blue
			dataArr[base + 3] = 255;  // Alpha
		}
	}
	context.putImageData(imageData, 0, 0);
}

function colorForMoisture(elevation: number, moisture: number): [number, number, number] {
	const max = 1000;
	const scaled = 255 - (Math.min(moisture, max) * 255 / max)|0;
	return [scaled, scaled, scaled];
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

	Settings.WATER_LEVEL = sortedPixels[Math.floor(WIDTH * HEIGHT * percent)];
	console.log('Min:', sortedPixels[0], 'Max:', sortedPixels[WIDTH * HEIGHT - 1]);
	waterLevelInput.value = Settings.WATER_LEVEL.toString();
}

function updateWaterLevel() {
	Settings.WATER_LEVEL = parseInt(waterLevelInput.value);
	MOUNTAIN_LEVEL = Settings.WATER_LEVEL + 150;
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
