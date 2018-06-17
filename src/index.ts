const canvas = document.getElementById('map') as HTMLCanvasElement;
const context = canvas.getContext('2d');
const elevation: number[][] = [];

const waterLevelInput = document.getElementById('waterlevel') as HTMLInputElement;
const xOffsetInput = document.querySelector('input[name="xoffset"]') as HTMLInputElement
const yOffsetInput = document.querySelector('input[name="yoffset"]') as HTMLInputElement

const WIDTH = canvas.width * 2;
const HEIGHT = canvas.height * 2;

const ITERATIONS = 500;
const MAX_ELEVATION = 500;
const MIN_ELEVATION = -500;

let WATER_LEVEL = 0;
let MOUNTAIN_LEVEL = 150;

let X_OFFSET = 0;
let Y_OFFSET = 0;

let ZOOM_LEVEL = 2;

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

function reset() {
	WATER_LEVEL = 0;
	X_OFFSET = 0;
	Y_OFFSET = 0;
	yOffsetInput.value = Y_OFFSET + '';
	xOffsetInput.value = X_OFFSET + '';
	waterLevelInput.value = WATER_LEVEL + '';

	const radius = Math.min(canvas.width, canvas.height) / 2;
	const step = -MIN_ELEVATION / radius;
	for (let x = 0; x < WIDTH; ++x) {
		elevation[x] = [];
		for (let y = 0; y < HEIGHT; ++y) {
			elevation[x][y] = 0;
		}
	}
}

function generateFull(heightMap: number[][]) {
	const before = performance.now();
	for (let i = 0; i < ITERATIONS; ++i) {
		addFault(heightMap, false);
	}
	console.log('Average time', (performance.now() - before) / ITERATIONS);

	paint(heightMap);
}

function addFault(heightMap: number[][], shouldRepaint: boolean = true) {
	// Pick a random line on the plane
	let slope = Math.random() * 10;
	const orientationFlag = Math.random();
	if (orientationFlag < 0.5) {
		slope = 1 / slope;
	}
	if (orientationFlag < 0.25 || orientationFlag >= 0.75) {
		slope = -slope;
	}
	const centerX = Math.random() * WIDTH;
	const centerY = Math.random() * HEIGHT;
	const radius = Math.min(WIDTH, HEIGHT) / 3;

	const radiusSquared = radius * radius;

	// Increase everything above the line and decrease below the line
	const diff = Math.random() < 0.5 ? 1 : -1;
	const threshold = 7;

	for (let x = 0; x < WIDTH; ++x) {
		let testX = x;
		if (Math.abs(x - centerX) > radius + threshold) {
			if (x > centerX) {
				testX -= WIDTH;
			} else {
				testX += WIDTH;
			}
		}
		const dx = testX - centerX;
		for (let y = 0; y < HEIGHT; ++y) {
			let testY = y;
			if (Math.abs(y - centerY) > radius + threshold) {
				if (y > centerY) {
					testY -= HEIGHT;
				} else {
					testY += HEIGHT;
				}
			}
			const dy = testY - centerY;

			let distanceFromLine = Math.sqrt(dx*dx + dy*dy) - radius;
			if (distanceFromLine < 0) {
				distanceFromLine = -distanceFromLine;
			}

			if (dx*dx + dy*dy < radiusSquared) {
				if (distanceFromLine < threshold) {
					heightMap[x][y] = Math.min(heightMap[x][y] + diff * distanceFromLine, MAX_ELEVATION);
				} else {
					heightMap[x][y] = Math.min(heightMap[x][y] + diff * threshold, MAX_ELEVATION);
				}
			} else {
				if (distanceFromLine < threshold) {
					heightMap[x][y] = Math.max(heightMap[x][y] - diff * distanceFromLine, MIN_ELEVATION);
				} else {
					heightMap[x][y] = Math.max(heightMap[x][y] - diff * threshold, MIN_ELEVATION);
				}
			}
		}
	}

	if (shouldRepaint) {
		paint(heightMap);
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
			switch (ZOOM_LEVEL) {
				case 1:
					aggregatedElevation = heightMap[xCoord][yCoord];
					break;
				case 2:
					let nextX = (xCoord + 1) % WIDTH;
					let nextY = (yCoord + 1) % HEIGHT;
					aggregatedElevation = heightMap[xCoord][yCoord]
										+ heightMap[nextX][yCoord]
										+ heightMap[xCoord][nextY]
										+ heightMap[nextX][nextY];
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

function updateWaterLevel(heightMap: number[][]) {
	WATER_LEVEL = parseInt(waterLevelInput.value);
	MOUNTAIN_LEVEL = WATER_LEVEL + 150;
	paint(heightMap);
}

function updateXOffset(newValue: string) {
	X_OFFSET = parseInt(newValue, 10) % WIDTH;
	paint(elevation);
}

function updateYOffset(newValue: string) {
	Y_OFFSET = parseInt(newValue, 10) % HEIGHT;
	paint(elevation);
}

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
			} else if (newLevel > 2) {
				newLevel = 2;
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
}
