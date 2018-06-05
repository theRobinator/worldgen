const canvas = document.getElementById('map') as HTMLCanvasElement;
const context = canvas.getContext('2d');
const elevation: number[][] = [];

const waterLevelInput = document.getElementById('waterlevel') as HTMLInputElement;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const ITERATIONS = 1;
const MAX_ELEVATION = 500;
const MIN_ELEVATION = -500;

let WATER_LEVEL = 0;
let MOUNTAIN_LEVEL = 150;

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
	const radius = Math.min(WIDTH, HEIGHT) / 2;
	const step = -MIN_ELEVATION / radius;
	for (let x = 0; x < WIDTH; ++x) {
		elevation[x] = [];
		for (let y = 0; y < HEIGHT; ++y) {
			// if (x < radius) {
			// 	if (y < x) {
			// 		elevation[x][y] = MIN_ELEVATION + y * step;
			// 	} else if (x > HEIGHT - y) {
			// 		elevation[x][y] = MIN_ELEVATION + (HEIGHT - y) * step;
			// 	} else {
			// 		elevation[x][y] = MIN_ELEVATION + x * step;
			// 	}
			// } else if (x > WIDTH - radius) {
			// 	if (WIDTH - x > y) {
			// 		elevation[x][y] = MIN_ELEVATION + y * step;
			// 	} else if (WIDTH - x > HEIGHT - y) {
			// 		elevation[x][y] = MIN_ELEVATION + (HEIGHT - y) * step;
			// 	} else {
			// 		elevation[x][y] = MIN_ELEVATION + (WIDTH - x) * step;
			// 	}
			// } else  if (y < radius) {
			// 	elevation[x][y] = MIN_ELEVATION + y * step;
			// } else if (y > HEIGHT - radius) {
			// 	elevation[x][y] = MIN_ELEVATION + (HEIGHT - y) * step;
			// } else {
				elevation[x][y] = 0;
			// }
		}
	}
}

function generateFull(heightMap: number[][]) {
	for (let i = 0; i < ITERATIONS; ++i) {
		addFault(heightMap, false);
	}

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

	const intercept = centerY - slope * centerX;

	// Increase everything above the line and decrease below the line
	const diff = Math.random() < 0.5 ? 1 : -1;
	const threshold = 7;
	const distanceDivisor = Math.sqrt(1 + slope * slope)

	for (let x = 0; x < WIDTH; ++x) {
		for (let y = 0; y < HEIGHT; ++y) {
			// Hard-line raise/lower whole hemispheres
			// if (slope * x + intercept < y) {
			// 	heightMap[x][y] = Math.min(heightMap[x][y] + diff, MAX_ELEVATION);
			// } else {
			// 	heightMap[x][y] = Math.max(heightMap[x][y] - diff, MIN_ELEVATION);
			// }

			// Raise/lower single trench using a gradient
			// let distanceFromLine = Math.abs(intercept + slope * x - y) / distanceDivisor;
			// if (distanceFromLine < 0) {
			// 	distanceFromLine = -distanceFromLine;
			// }
			// if (distanceFromLine < threshold) {
			// 	heightMap[x][y] = Math.max(Math.min(heightMap[x][y] + diff * (threshold - distanceFromLine) / 2, MAX_ELEVATION), MIN_ELEVATION);
			// }

			// Raise/lower whole hemisphere using gradient line
			let distanceFromLine = Math.abs(intercept + slope * x - y) / distanceDivisor;
			if (distanceFromLine < 0) {
				distanceFromLine = -distanceFromLine;
			}
			if (slope * x + intercept < y) {
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
	const imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
	const dataArr = imageData.data;
	for (let y = 0; y < HEIGHT; ++y) {
		for (let x = 0; x < WIDTH; ++x) {
			const base = y * WIDTH * 4 + x * 4;
			const color = colorForElevation(heightMap[x][y]);
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
waterLevelInput.value = WATER_LEVEL + '';

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
canvas.addEventListener('click', function() {
	reset();
	generateFull(elevation);
});
