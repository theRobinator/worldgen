import {FaultGenerator} from '../faultgenerator';

onmessage = function(messageEvent) {
	const [command, ...args] = messageEvent.data;
	const result = COMMANDS[command](...args);
	postMessage({'type': 'result', 'data': result});
}

let generator: FaultGenerator = null;

const COMMANDS = {
	buildElevationMap: function(iterations: number, width: number, height: number) {
		console.log('Worker starting');
		postMessage({'type': 'status', 'data': 'started'});
		if (generator === null) {
			generator = new FaultGenerator(width, height);
		}

		return generator.regenerate(iterations);
	}
} as {[key: string]: Function};
