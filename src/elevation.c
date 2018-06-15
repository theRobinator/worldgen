#define WASM_EXPORT __attribute__((visibility("default")))
#include <emscripten/emscripten.h>

#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <time.h>

#define ITERATIONS 1000
#define MAX_ELEVATION 500
#define MIN_ELEVATION -500
#define GRADIENT_THRESHOLD 7

inline double randFloat() {
  return (double)(rand()) / (double)(RAND_MAX);
}

inline double max(double a, double b) {
  return a > b ? a : b;
}

inline double min(double a, double b) {
  return a < b ? a : b;
}

WASM_EXPORT
void addFault(double* heightMap, const int WIDTH, const int HEIGHT) {
	const double centerX = randFloat() * WIDTH;
	const double centerY = randFloat() * HEIGHT;
	const double radius = min(WIDTH, HEIGHT) / 3;

	const double radiusSquared = radius * radius;

	const int diff = rand() % 2 == 0 ? 1 : -1;

	for (int x = 0; x < WIDTH; ++x) {
		int testX = x;
		if (fabs(x - centerX) > radius + GRADIENT_THRESHOLD) {
			if (x > centerX) {
				testX -= WIDTH;
			} else {
				testX += WIDTH;
			}
		}
		const double dxSquared = (testX - centerX) * (testX - centerX);
		for (int y = 0; y < HEIGHT; ++y) {
			int testY = y;
			if (fabs(y - centerY) > radius + GRADIENT_THRESHOLD) {
				if (y > centerY) {
					testY -= HEIGHT;
				} else {
					testY += HEIGHT;
				}
			}
			const double dy = testY - centerY;

			double distanceFromLine = sqrt(dxSquared + dy*dy) - radius;
			if (distanceFromLine < 0) {
				distanceFromLine = -distanceFromLine;
			}

			const int mapOffset = y * WIDTH + x;
			if (dxSquared + dy*dy < radiusSquared) {
				if (distanceFromLine < GRADIENT_THRESHOLD) {
					heightMap[mapOffset] = min(heightMap[mapOffset] + diff * distanceFromLine, MAX_ELEVATION);
				} else {
					heightMap[mapOffset] = min(heightMap[mapOffset] + diff * GRADIENT_THRESHOLD, MAX_ELEVATION);
				}
			} else {
				if (distanceFromLine < GRADIENT_THRESHOLD) {
					heightMap[mapOffset] = max(heightMap[mapOffset] - diff * distanceFromLine, MIN_ELEVATION);
				} else {
					heightMap[mapOffset] = max(heightMap[mapOffset] - diff * GRADIENT_THRESHOLD, MIN_ELEVATION);
				}
			}
		}
	}
}

EMSCRIPTEN_KEEPALIVE
double* generateElevations(double* map, const int width, const int height, const int iterations) {
  for (int i = 0; i < ITERATIONS; ++i) {
    addFault(map, width, height);
  }
  return map;
}

EMSCRIPTEN_KEEPALIVE
double* createBaseMap(const int width, const int height) {
	srand(time(NULL));
	const int memorySize = (sizeof (double)) * width * height;
	double* map = (double*)malloc(memorySize);
	memset(map, 0, memorySize);
	return map;
}

EMSCRIPTEN_KEEPALIVE
void resetMap(double* map, int w, int h) {
	memset(map, 0, w * h);
}
