onmessage = function(messageEvent) {
	const [command, ...args]: [] = messageEvent.data;
	const result = COMMANDS[command](...args);
	postMessage(result);
}

const heightMap: number[][] = []];

const _resetHeightMap = function(width: number, height: number) {
	if (heightMap.length === 0) {
		const firstColumn: number[] = [];
		firstColumn.length = height;
		heightMap.push(firstColumn);
		for (let x = 1; x < width; ++x) {
			heightMap.push(firstColumn.slice());  // Native copy is probably faster than appending
		}
	}
	for (let x = 0; x < width; ++x) {
		heightMap[x].fill(0);
	}
}

const COMMANDS = {
	buildElevationMap: function(iterations: number, width: number, height: number) {
		_resetHeightMap(width, height);

		const radius = Math.min(width, height) / 5;
		const radiusSquared = radius * radius;
		const threshold = 7;

		for (let faultIndex = 0; faultIndex < iterations; ++faultIndex) {
			// Pick a random line on the plane
			let slope = Math.random() * 10;
			const orientationFlag = Math.random();
			if (orientationFlag < 0.5) {
				slope = 1 / slope;
			}
			if (orientationFlag < 0.25 || orientationFlag >= 0.75) {
				slope = -slope;
			}
			const centerX = Math.random() * width;
			const centerY = Math.random() * height;

			// Increase everything above the line and decrease below the line
			const diff = Math.random() < 0.5 ? 1 : -1;

			for (let x = 0; x < width; ++x) {
				let testX = x;
				if (Math.abs(x - centerX) > radius + threshold) {
					if (x > centerX) {
						testX -= width;
					} else {
						testX += width;
					}
				}
				const dx = testX - centerX;
				for (let y = 0; y < height; ++y) {
					let testY = y;
					if (Math.abs(y - centerY) > radius + threshold) {
						if (y > centerY) {
							testY -= height;
						} else {
							testY += height;
						}
					}
					const dy = testY - centerY;

					let distanceFromLine = Math.sqrt(dx*dx + dy*dy) - radius;
					if (distanceFromLine < 0) {
						distanceFromLine = -distanceFromLine;
					}

					if (dx*dx + dy*dy < radiusSquared) {
						if (distanceFromLine < threshold) {
							heightMap[x][y] = heightMap[x][y] + diff * distanceFromLine;
						} else {
							heightMap[x][y] = heightMap[x][y] + diff * threshold;
						}
					} else {
						if (distanceFromLine < threshold) {
							heightMap[x][y] = heightMap[x][y] - diff * distanceFromLine;
						} else {
							heightMap[x][y] = heightMap[x][y] - diff * threshold;
						}
					}
				}
			}
		}
		return heightMap;
	}
};
