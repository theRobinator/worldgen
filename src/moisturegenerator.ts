import {Settings} from './settings';


export class MoistureGenerator {
	private moistureMap: number[][];

	constructor(private heightMap: number[][], externalMoistureMap?: number[][]) {
		if (externalMoistureMap) {
			this.moistureMap = externalMoistureMap;
		} else {
			const moistureMap: number[][] = [];
			moistureMap.length = heightMap.length;
			const firstColumn: number[] = [];
			firstColumn.length = heightMap[0].length;
			firstColumn.fill(0);
			moistureMap[0] = firstColumn;
			for (let i = 1; i < heightMap.length; ++i) {
				moistureMap[i] = firstColumn.slice();
			}
			this.moistureMap = moistureMap;
		}
	}

	private resetMoistureMap() {
		const moistureMap = this.moistureMap;
		for (let x = 0; x < this.heightMap.length; ++x) {
			moistureMap[x].fill(0);
		}
	}

	public getMap() {
		return this.moistureMap;
	}

	public generate(iterations: number, waterLevel: number, minX: number, minY: number, maxX: number, maxY: number) {
		this.resetMoistureMap();

		const heightMap = this.heightMap;
		const moistureMap = this.moistureMap;
		const mapWidth = heightMap.length, mapHeight = heightMap[0].length;
		const maxXOver2 = maxX / 2;
		const maxMoisture = Settings.MAX_MOISTURE;
		for (let startX = minX; startX < maxX; ++startX) {
			if (startX < maxXOver2) {
				const moistureLevel = startX / maxXOver2 * maxMoisture;
				for (let startY = minY; startY < maxY; ++startY) {
					moistureMap[startX][startY] = moistureLevel;
				}
			} else {
				const moistureLevel = (maxX - startX) / maxXOver2 * maxMoisture;
				for (let startY = minY; startY < maxY; ++startY) {
					moistureMap[startX][startY] = moistureLevel;
				}
			}
				
			// 	moistureMap[startX][startY] += rainAmount;

			// 	// Keep going downhill
			// 	let x = startX, y = startY;
			// 	while (true) {
			// 		let minHeight = heightMap[x][y];
			// 		let minX = x, minY = y;
			// 		for (let i = -1; i < 2; ++i) {
			// 			for (let j = -1; j < 2; ++j) {
			// 				const testX = (x + mapWidth + i) % mapWidth;
			// 				const testY = (y + mapHeight + j) % mapHeight;
			// 				const thisHeight = heightMap[testX][testY];
			// 				if (thisHeight < minHeight) {
			// 					minHeight = thisHeight;
			// 					minX = (x + i + mapWidth) % mapWidth;
			// 					minY = (y + j + mapHeight) % mapHeight;
			// 				}
			// 			}
			// 		}
			// 		if (heightMap[minX][minY] <= waterLevel || (minX == x && minY == y)) {
			// 			break;
			// 		} else {
			// 			x = minX;
			// 			y = minY;
			// 			moistureMap[x][y] += rainAmount;
			// 		}
			// 	}
			// }
		}
		// let min = Infinity, max = -Infinity, maxAllowed = Settings.MAX_MOISTURE;
		// for (let x = minX; x < maxX; ++x) {
		// 	for (let y = minY; y < maxY; ++y) {
		// 		if (moistureMap[x][y] >= maxAllowed) {
		// 			moistureMap[x][y] = maxAllowed - 1;
		// 		}
		// 	}
		// }
	}
}