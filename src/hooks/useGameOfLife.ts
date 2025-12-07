import { useEffect, useRef, useState } from "react";

export interface Cell {
	isAlive: boolean;
	lastUpdated: number;
}

export interface Settings {
	showRecency: boolean;
	fullScreen: boolean;
	frameLen: number; // ms - time between frames
	cellSize: number; // px - size of each cell

	aliveConditions: { min: number; max: number }[];
	reproduceConditions: { min: number; max: number }[];
}

export const defaultSettings = {
	showRecency: true,
	fullScreen: false,
	frameLen: 150, // ms - time between frames
	cellSize: 10, // px - size of each cell

	aliveConditions: [
		{ min: 2, max: 3 }
	],
	reproduceConditions: [
		{ min: 3, max: 3 }
	]
};

export function useGameOfLife(initialSettings: Settings = JSON.parse(JSON.stringify(defaultSettings))) {
	const stateRef = useRef<Cell[][]>([[]]);

	const [gridDims, setGridDims] = useState({
		x: 0,
		y: 0
	});
	const gridDimsRef = useRef(gridDims);
	useEffect(() => { gridDimsRef.current = gridDims; }, [gridDims]);

	const [settings, setSettings] = useState(initialSettings);
	const settingsRef = useRef(settings);
	useEffect(() => { settingsRef.current = settings; }, [settings]);

	const renderGrid = (ctx: CanvasRenderingContext2D) => {
		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

		const v = stateRef.current;
		for (let i = 0; i < v.length; i++) {
			for (let j = 0; j < v[i].length; j++) {
				if (v[i][j].isAlive) {
					if (settingsRef.current.showRecency) {
						if (v[i][j].lastUpdated == 0) {
							ctx.fillStyle = "#4678eb";
						} else if (v[i][j].lastUpdated < 3) {
							ctx.fillStyle = "#1ed15a";
						} else if (v[i][j].lastUpdated < 6) {
							ctx.fillStyle = "#f0c930";
						} else if (v[i][j].lastUpdated < 15) {
							ctx.fillStyle = "#e65054";
						} else {
							ctx.fillStyle = "#646970";
						}
					} else {
						ctx.fillStyle = "#ffffff";
					}
					ctx.fillRect(j * settingsRef.current.cellSize, i * settingsRef.current.cellSize, settingsRef.current.cellSize, settingsRef.current.cellSize);
				}
			}
		}
	};

	const step = (ctx: CanvasRenderingContext2D, isPausedRef: React.MutableRefObject<boolean>) => {
		const v = stateRef.current;

		const newState = stateRef.current.map(row => row.map(cell => ({ ...cell })));

		for (let i = 0; i < v.length; i++) {
			for (let j = 0; j < v[i].length; j++) {
				let count = 0;
				for (let x = -1; x <= 1; x++) {
					for (let y = -1; y <= 1; y++) {
						if (x === 0 && y === 0) continue;
						if (v[i + x] && v[i + x][j + y] && v[i + x][j + y].isAlive) {
							count++;
						}
					}
				}

				if (v[i][j].isAlive) {
					let survive = false;

					const validAliveConditions = settingsRef.current.aliveConditions.filter(condition => {
						const { min, max } = condition;
						return min <= max;
					});

					if (validAliveConditions.length > 0) {
						for (const condition of validAliveConditions) {
							const { min, max } = condition;
							if (count >= min && count <= max) {
								newState[i][j].isAlive = true;
								newState[i][j].lastUpdated++;
								survive = true;
								break;
							}
						}

						if (!survive) {
							newState[i][j].isAlive = false;
						}
					}
				} else {
					for (const conditionIndex in settingsRef.current.reproduceConditions) {
						const { min, max } = settingsRef.current.reproduceConditions[conditionIndex];
						if (min > max) continue;
						if (count >= min && count <= max) {
							newState[i][j].isAlive = true;
							newState[i][j].lastUpdated = 0;
							break;
						}
					}
				}
			}
		}

		stateRef.current = newState;

		// render AFTER updates
		renderGrid(ctx);

		const startTime = performance.now();

		const nextFrame = () => {
			const currentTime = performance.now();
			const elapsedTime = currentTime - startTime;

			if (!isPausedRef.current && elapsedTime >= settingsRef.current.frameLen) {
				requestAnimationFrame(() => step(ctx, isPausedRef));
			} else {
				setTimeout(nextFrame, 1);
			}
		};

		nextFrame();
	};

	const resizeGrid = (canvas?: HTMLCanvasElement | null, cursorCanvas?: HTMLCanvasElement | null, trim: boolean = false) => {
		const width = window.innerWidth;
		const height = window.innerHeight;

		if (canvas) {
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			canvas.width = width;
			canvas.height = height;
			ctx.clearRect(0, 0, width, height);
		}

		if (cursorCanvas) {
			const cursorCtx = cursorCanvas.getContext("2d");
			if (!cursorCtx) return;
			cursorCanvas.width = width;
			cursorCanvas.height = height;
		}

		const newY = Math.floor(height / settingsRef.current.cellSize);
		const newX = Math.floor(width / settingsRef.current.cellSize);

		if (trim) {
			stateRef.current = stateRef.current.slice(0, newY).map(row => row.slice(0, newX));
		}

		for (let i = 0; i < newY; i++) {
			if (i >= stateRef.current.length) {
				stateRef.current.push([]);
			}

			for (let j = 0; j < newX; j++) {
				if (j >= stateRef.current[i].length) {
					stateRef.current[i].push({
						isAlive: Math.random() < 0.5,
						lastUpdated: 1
					});
				}
			}
		}

		setGridDims({
			x: stateRef.current[0].length,
			y: stateRef.current.length
		});
	};

	const resetGrid = (canvas?: HTMLCanvasElement | null) => {
		// adjust canvas size if provided
		if (canvas) {
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			const width = window.innerWidth;
			const height = window.innerHeight;
			canvas.width = width;
			canvas.height = height;
		}

		const width = window.innerWidth;
		const height = window.innerHeight;

		for (let i = 0; i < Math.floor(height / settingsRef.current.cellSize); i++) {
			stateRef.current[i] = [];
			for (let j = 0; j < Math.floor(width / settingsRef.current.cellSize); j++) {
				stateRef.current[i][j] = {
					isAlive: Math.random() < 0.5,
					lastUpdated: 0
				};
			}
		}

		setGridDims({
			x: Math.floor(width / settingsRef.current.cellSize),
			y: Math.floor(height / settingsRef.current.cellSize)
		});
	};

	return {
		stateRef,
		gridDims,
		gridDimsRef,
		settings,
		setSettings,
		settingsRef,
		renderGrid,
		step,
		resizeGrid,
		resetGrid
	};
}
