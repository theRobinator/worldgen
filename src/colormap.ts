import {Settings} from './settings';


const colorMapWidth = 700, colorMapHeight = 700;
const waterBounds = {
	red: [0, 40],
	green: [17, 201],
	blue: [153, 255],
};
const FRESHWATER_COLOR = [66, 214, 217];
const landColors = [
	// 			   deep water       | shallow water    | coastline        | treeline         | mountaintop
	/* dry     */[/*'rgb( 40,201,255)','rgb( 40,201,255)',*/'rgb(122, 93,  10)','rgb(189,121,  0)','rgb(202,202,  9)'],
	/* average */[/*'rgb( 40,201,255)','rgb( 40,201,255)',*/'rgb( 15,132, 13)','rgb( 169,193, 58)','rgb(255,229,145)'],
	/* wet     */[/*'rgb( 40,201,255)','rgb( 40,201,255)',*/'rgb( 15,132, 13)','rgb(149,255,145)','rgb(255,255,255)'],
	/* river   *///['rgb(  0,117,153)','rgb( 40,201,255)','rgb( 40,201,255)','rgb( 40,201,255)','rgb( 40,201,255)'],
	/* ocean   *///['rgb(  0,117,153)','rgb( 40,201,255)','rgb( 40,201,255)','rgb( 40,201,255)','rgb( 40,201,255)'],
];
const xStopDistance = Math.floor(colorMapWidth / landColors[0].length);
const yStopDistance = Math.floor(colorMapHeight / landColors.length);
const landCanvas = document.createElement('canvas');
landCanvas.width = colorMapWidth;
landCanvas.height = colorMapHeight;
const landContext = landCanvas.getContext('2d');

// Draw gradient lines using color stops
for (let x = 0; x < landColors[0].length; ++x) {
	const grad = landContext.createLinearGradient(x * xStopDistance, 0, x * xStopDistance, colorMapHeight);
	for (let y = 0; y < landColors.length; ++y) {
		grad.addColorStop(y / (landColors.length-1), landColors[y][x]);
	}
	landContext.fillStyle = grad;
	landContext.fillRect(x * xStopDistance, 0, 1, colorMapHeight);
}

// Fill in the space between the lines using computed gradients
const imageData = landContext.getImageData(0, 0, colorMapWidth, colorMapHeight).data;
for (let y = 0; y < colorMapHeight; y++) {
	const grad = landContext.createLinearGradient(0, y, colorMapWidth, y);
	for (let x = 0; x < landColors[0].length; ++x) {
		const baseCoord = 4 * (y * colorMapWidth + x * xStopDistance);
		const r = imageData[baseCoord], g = imageData[baseCoord + 1], b = imageData[baseCoord + 2]
		grad.addColorStop(x / (landColors[0].length-1), `rgb(${r}, ${g}, ${b})`);
	}
	landContext.fillStyle = grad;
	landContext.fillRect(0, y, colorMapWidth, 1);
}

const ELEVATION_MOISTURE_MAP = landContext.getImageData(0, 0, colorMapWidth, colorMapHeight).data;
document.body.appendChild(landCanvas);

const {MAX_ELEVATION, MIN_ELEVATION, MAX_MOISTURE} = Settings;

export function getLandColor(elevation: number, moisture: number): [number, number, number] {
	const waterLevel = Settings.WATER_LEVEL;
	if (elevation < waterLevel) {
		const percentElevation = (elevation - MIN_ELEVATION) / (waterLevel - MIN_ELEVATION);
		return [
			(waterBounds.red[0] + (waterBounds.red[1] - waterBounds.red[0]) * percentElevation) | 0,
			(waterBounds.green[0] + (waterBounds.green[1] - waterBounds.green[0]) * percentElevation) | 0,
			(waterBounds.blue[0] + (waterBounds.blue[1] - waterBounds.blue[0]) * percentElevation) | 0,
		];
	} else {
		const percentMoisture = moisture / MAX_MOISTURE;
		if (percentMoisture >= 1) {
			return FRESHWATER_COLOR;
		}
		const mapX = ((elevation - waterLevel) / (MAX_ELEVATION - waterLevel) * colorMapWidth)|0;
		const mapY = (percentMoisture * colorMapHeight)|0;
		const baseCoord = (mapY * colorMapWidth + mapX) * 4;
		
		return [
			ELEVATION_MOISTURE_MAP[baseCoord],
			ELEVATION_MOISTURE_MAP[baseCoord + 1],
			ELEVATION_MOISTURE_MAP[baseCoord + 2],
		];
	}
}
