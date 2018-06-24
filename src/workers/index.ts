import {FaultGenerator} from '../faultgenerator';

onmessage = function(messageEvent) {
	const [command, ...args] = messageEvent.data;
	const result = COMMANDS[command](...args);
	postMessage(result);
}

let generator: FaultGenerator = null;

const COMMANDS = {
	buildElevationMap: function(iterations: number, width: number, height: number) {
		if (generator === null) {
			generator = new FaultGenerator(width, height);
		}

		return generator.regenerate(iterations);
	}
} as {[key: string]: Function};
