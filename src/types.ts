declare global {
	interface Window {
		WorldGen: {[key: string]: any};
	}
	interface Array<T> {
		fill(item: T, start?: number, end?: number): void;
	}
}
export {};
