export class FaultGenerator {
	private heightMap: number[][] = [];

	constructor(
		private mapWidth: number,
		private mapHeight: number,
		heightMap?: number[][],
	) {
		if (heightMap) {
			this.heightMap = heightMap;
		} else {
			// Set up memory for a private height map
			const firstColumn: number[] = [];
			firstColumn.length = mapHeight;
			this.heightMap.push(firstColumn);
			for (let x = 1; x < mapWidth; ++x) {
				this.heightMap.push(firstColumn.slice());  // Native copy is probably faster than appending
			}
		}
	}

	private resetHeightMap = function() {
		const heightMap = this.heightMap;
		for (let x = 0; x < this.mapWidth; ++x) {
			heightMap[x].fill(0);
		}
	}

	public regenerate(iterations: number) {
		this.resetHeightMap();

		const width = this.mapWidth;
		const height = this.mapHeight;
		const radius = Math.min(width, height) / 5;
		const radiusSquared = radius * radius;
		const threshold = 7;
		const heightMap = this.heightMap;

		for (let faultIndex = 0; faultIndex < iterations; ++faultIndex) {
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
	};
}