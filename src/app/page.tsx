"use client";

import {useEffect, useRef, useState} from "react";
import {FaPlay, FaBrush, FaEraser, FaEye, FaGear, FaMaximize, FaMinimize, FaPause} from "react-icons/fa6";

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cursorCanvasRef = useRef<HTMLCanvasElement>(null);

    interface Cell {
        isAlive: boolean;
        lastUpdated: number; // number of frames since last update
    }

    const state = useRef<Cell[][]>([[]]);
    const [gridDims, setGridDims] = useState({
        x: state.current.length,
        y: state.current[0].length
    });
    const gridDimsRef = useRef(gridDims);
    useEffect(() => { gridDimsRef.current = gridDims; }, [gridDims]);

    const defaultSettings = {
        showRecency: true,
        fullScreen: false,
        frameLen: 150, // ms - time between frames
        cellSize: 10, // px - size of each cell

        // stay alive
        minToLive: 2,
        maxToLive: 3,

        // come to life
        minToReproduce: 3,
        maxToReproduce: 3
    }
    const [settings, setSettings] = useState(defaultSettings);

    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    // const [initWindowSize, setInitWindowSize] = useState({
    //     width: window.innerWidth,
    //     height: window.innerHeight
    // });

    const renderGrid = (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        const v = state.current;
        for (let i=0; i<v.length; i++) {
            for (let j=0; j<v[i].length; j++) {
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
                    ctx.fillRect(j * 10, i * 10, 10, 10);
                }
            }
        }
    }

    const step = (ctx: CanvasRenderingContext2D) => {
        const v = state.current;

        // update
        const newState = state.current.map(row => row.map(cell => ({ ...cell })));

        for (let i=0; i<v.length; i++) {
            for (let j=0; j<v[i].length; j++) {
                let count = 0;
                for (let x=-1; x<=1; x++) {
                    for (let y=-1; y<=1; y++) {
                        if (x === 0 && y === 0) continue;
                        if (v[i+x] && v[i+x][j+y] && v[i+x][j+y].isAlive) {
                            count++;
                        }
                    }
                }

                if (v[i][j].isAlive) {
                    if (count >= settingsRef.current.minToLive && count <= settingsRef.current.maxToLive) {
                        newState[i][j].isAlive = true;
                        newState[i][j].lastUpdated++;
                    } else {
                        newState[i][j].isAlive = false;
                    }
                } else {
                    if (count >= settingsRef.current.minToReproduce && count <= settingsRef.current.maxToReproduce) {
                        newState[i][j].isAlive = true;
                        newState[i][j].lastUpdated = 0;
                    }
                }
            }
        }

        state.current = newState;

        // render AFTER updates to make sure cell drawings are accounted for
        renderGrid(ctx);

        // Request the next frame based on the frame length
        const startTime = performance.now();

        const nextFrame = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;

            if (!isPausedRef.current && elapsedTime >= settingsRef.current.frameLen) {
                requestAnimationFrame(() => step(ctx));
            } else {
                setTimeout(nextFrame, 1);
            }
        };

        nextFrame();
        // ^^ this allows the frame rate to change even if a frame's duration hasn't fully elapsed yet (e.g., prev frame was 5000ms, but you cahnge it BEFORE the end)
    }

    const resizeGrid = (trim: boolean = false) => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // main canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = width;
        canvas.height = height;

        // cursor canvas
        const cursorCanvas = cursorCanvasRef.current;
        if (!cursorCanvas) return;
        const cursorCtx = cursorCanvas.getContext("2d");
        if (!cursorCtx) return;

        cursorCanvas.width = width;
        cursorCanvas.height = height;

        ctx.clearRect(0, 0, width, height);

        const newY = Math.floor(height / settings.cellSize)
        const newX = Math.floor(width / settings.cellSize)

        if (trim) {
            // trim the grid to the new size
            state.current = state.current.slice(0, newY).map(row => row.slice(0, newX));
        }

        for (let i = 0; i < newY; i++) {
            if (i >= state.current.length) {
                state.current.push([]);
            }

            for (let j = 0; j < newX; j++) {
                if (j >= state.current[i].length) {
                    state.current[i].push({
                        isAlive: Math.random() < 0.5,
                        lastUpdated: 1
                    })
                }
            }
        }

        setGridDims({
            x: state.current[0].length,
            y: state.current.length
        });
    }

    const resetGrid = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        canvas.width = width;
        canvas.height = height;

        // Initialize the state with random values
        for (let i = 0; i < Math.floor(height / settings.cellSize); i++) {
            state.current[i] = [];
            for (let j = 0; j < Math.floor(width / settings.cellSize); j++) {
                state.current[i][j] = {
                    isAlive: Math.random() < 0.5,
                    lastUpdated: 0
                }
            }
        }
    }

    const mousePositionRef = useRef({ x: 0, y: 0 });
    const isMouseDownRef = useRef(false);

    useEffect(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // main canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = width;
        canvas.height = height;

        // cursor canvas
        const cursorCanvas = cursorCanvasRef.current;
        if (!cursorCanvas) return;
        const cursorCtx = cursorCanvas.getContext("2d");
        if (!cursorCtx) return;

        cursorCanvas.width = width;
        cursorCanvas.height = height;

        // Initialize the state with random values
        for (let i = 0; i < Math.floor(height / settings.cellSize); i++) {
            state.current[i] = [];
            for (let j = 0; j < Math.floor(width / settings.cellSize); j++) {
                state.current[i][j] = {
                    isAlive: Math.random() < 0.5,
                    lastUpdated: 0
                }
            }
        }

        setGridDims({
            x: Math.floor(width / settings.cellSize),
            y: Math.floor(height / settings.cellSize)
        })

        // event listeners
        window.addEventListener("resize", () => {
            resizeGrid();
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
        window.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement) {
                setSettings(prev => {
                    return {
                        ...prev,
                        fullScreen: true
                    }
                })
            } else {
                setSettings(prev => {
                    return {
                        ...prev,
                        fullScreen: false
                    }
                })
            }
        })

        window.addEventListener("mousedown", () => {
            isMouseDownRef.current = true;
        });
        window.addEventListener("mouseup", () => {
            isMouseDownRef.current = false;
        });

        window.addEventListener("mousemove", (e) => {
            // save the cursor's position
            const x = Math.floor(e.clientX / settings.cellSize);
            const y = Math.floor(e.clientY / settings.cellSize);
            mousePositionRef.current = { x, y };
        });


        // animation
        requestAnimationFrame(() => step(ctx));

        const cursorStep = () => {
            const {x, y} = mousePositionRef.current;

            cursorCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            if (drawModeRef.current !== "none") {
                cursorCtx.strokeStyle = "#ffffff";
                cursorCtx.lineWidth = 2;
                cursorCtx.strokeRect((x - Math.floor(cursorWidthRef.current / 2)) * settings.cellSize, (y - Math.floor(cursorWidthRef.current / 2)) * settings.cellSize, settings.cellSize * cursorWidthRef.current, settings.cellSize * cursorWidthRef.current);
            }

            if (
                !tempDrawBlockRef.current &&
                isMouseDownRef.current &&
                x >= 0 && y >= 0 &&
                x < gridDimsRef.current.x && y < gridDimsRef.current.y
            ) {
                const half = Math.floor(cursorWidthRef.current / 2);

                for (let i = -half; i <= half; i++) {
                    const xi = x + i;
                    if (xi < 0 || xi >= gridDimsRef.current.x) continue;

                    for (let j = -half; j <= half; j++) {
                        const yj = y + j;
                        if (yj < 0 || yj >= gridDimsRef.current.y) continue;

                        const cell = state.current[yj][xi];
                        if (drawModeRef.current === "draw") {
                            cell.isAlive = true;
                            cell.lastUpdated = 0;

                            ctx.fillStyle = settingsRef.current.showRecency ? "#4678eb" : "#ffffff";
                            ctx.fillRect(xi * settings.cellSize, yj * settings.cellSize, settings.cellSize, settings.cellSize);
                        } else if (drawModeRef.current === "erase") {
                            cell.isAlive = false;
                            cell.lastUpdated = 0;

                            ctx.clearRect(xi * settings.cellSize, yj * settings.cellSize, settings.cellSize, settings.cellSize);
                        }
                    }
                }
            }

            requestAnimationFrame(() => cursorStep());
        }
        requestAnimationFrame(() => cursorStep());
    }, []);

    const [showSettings, setShowSettings] = useState(false);

    const getMsPerFrameColor = (value: number, min: number, max: number) => {
        // Example: Color ranges from red (low) to green (high)
        const diff = max - min;
        const t = (value-min)/(diff-min);


        const red = 30 + (t * (230-30));
        const green = 209 + (t * (80-209));
        const blue = 90 + (t * (84-90));

        return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
    };

    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(isPaused);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

    const [drawMode, setDrawMode] = useState<"none" | "draw" | "erase">("none");
    const drawModeRef = useRef(drawMode);
    useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

    const [cursorWidth, setCursorWidth] = useState(31);
    const cursorWidthRef = useRef(cursorWidth);
    useEffect(() => { cursorWidthRef.current = cursorWidth; }, [cursorWidth]);

    const tempDrawBlockRef = useRef(false);

    return (
        <div>
            <div id="settings-cont" className="absolute w-fit top-5 right-5 z-10 select-none">
                <div id="settings" className="p-5 bg-white dark:bg-black" onMouseEnter={() => { tempDrawBlockRef.current = true }} onMouseLeave={() => {
                    tempDrawBlockRef.current = false
                    setShowSettings(false);
                }} style={{ opacity: settings.fullScreen ? 0 : 1, boxShadow: "0px 5px 25px black" }}>
                    <div
                        className="cursor-pointer flex flex-row gap-10 justify-end ring-2 px-3 py-2"
                    >
                        <div className="flex flex-row gap-4">
                            <p className="font-bold mr-2">Playback</p>
                            <p className="draw-tool" onClick={() => {setIsPaused(false)}} style={{ color: !isPaused ? "#1ed15a" : "", transform: `scale(${!isPaused ? 1.5 : 1})` }}><FaPlay /></p>
                            <p className="draw-tool" onClick={() => {setIsPaused(true)}} style={{ color: isPaused ? "#e65054" : "", transform: `scale(${isPaused ? 1.5 : 1})` }}><FaPause /></p>
                        </div>

                        <div className="flex flex-row gap-4">
                            <p className="font-bold mr-2">Draw tools</p>
                            <p className="draw-tool" onClick={() => {setDrawMode("none")}} style={{ color: drawMode == "none" ? "#4678eb" : "", transform: `scale(${drawMode == "none" ? 1.5 : 1})` }}><FaEye /></p>
                            <p className="draw-tool" onClick={() => {setDrawMode("draw")}} style={{ color: drawMode == "draw" ? "#f0c930" : "", transform: `scale(${drawMode == "draw" ? 1.5 : 1})` }}><FaBrush /></p>
                            <p className="draw-tool" onClick={() => {setDrawMode("erase")}} style={{ color: drawMode == "erase" ? "#f0c930" : "", transform: `scale(${drawMode == "erase" ? 1.5 : 1})` }}><FaEraser /></p>
                        </div>

                        <div className="flex flex-row gap-3">
                            <p
                                onClick={() => setShowSettings(prev => !prev)}
                            ><FaGear /></p>

                            <p onClick={() => setSettings(prev => {
                                if (!prev.fullScreen) {
                                    // will become fullscreen
                                    setShowSettings(false);
                                    if (!document.fullscreenElement) {
                                        document.documentElement.requestFullscreen();
                                        resizeGrid();
                                    }
                                } else {
                                    // will become windowed
                                    if (document.fullscreenElement) {
                                        document.exitFullscreen();
                                    }
                                }
                                return {
                                    ...prev,
                                    fullScreen: !prev.fullScreen
                                }
                            })}>{settings.fullScreen ? <FaMinimize /> : <FaMaximize />}</p>
                        </div>
                    </div>

                    { showSettings && (
                        <div className="px-5">
                            <div className="flex flex-col gap-2">
                                <h1>General</h1>
                                <label onClick={() => resizeGrid(true)}>Trim out-of-bounds cells: <span className="font-mono font-bold">Trim (Currently {gridDims.x} x {gridDims.y})</span></label>
                                <label onClick={() => setSettings(prev => {
                                    return {
                                        ...prev,
                                        showRecency: !prev.showRecency
                                    }
                                })}>Indicate cell update recency: <span className="font-mono font-bold">{settings.showRecency ? "yes" : "no"}</span></label>
                                <label>Millisecs/frame:</label>
                                <div className="flex flex-row">
                                    <input type="range" min={5} max={2000} value={settings.frameLen} onChange={ (e) => {
                                        setSettings(prev => {
                                            return {
                                                ...prev,
                                                frameLen: isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                                            }
                                        })
                                    } } className="font-mono" />
                                    <p className="ml-5 font-mono font-bold" style={{color: getMsPerFrameColor(settings.frameLen, 5, 2000)}}>{settings.frameLen} ms/frame</p>
                                </div>

                                <h1>Drawing</h1>
                                <label>Cursor size:</label>
                                <div className="flex flex-row">
                                    <input type="range" min={1} max={51} value={cursorWidth} onChange={ (e) => {
                                        setCursorWidth(e.target.valueAsNumber % 2 == 0 ? e.target.valueAsNumber + 1 : e.target.valueAsNumber);
                                    } } className="font-mono" />
                                    <p className="ml-5 font-mono font-bold">{cursorWidth} pixel</p>
                                </div>

                                <h1>Rules</h1>
                                <label>Min neighbors alive to live: <input type="number" min={0} max={8} value={settings.minToLive} onChange={ (e) => {
                                    setSettings(prev => {
                                        if (e.target.valueAsNumber > settings.maxToLive) {
                                            return {
                                                ...prev,
                                                minToLive: settings.maxToLive,
                                                maxToLive: e.target.valueAsNumber
                                            }
                                        }

                                        return {
                                            ...prev,
                                            minToLive: isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber))
                                        }
                                    })
                                } } className="font-mono" /></label>
                                <label>Max neighbors alive to live: <input type="number" min={0} max={8} value={settings.maxToLive} onChange={ (e) => {
                                    setSettings(prev => {
                                        if (e.target.valueAsNumber < settings.minToLive) {
                                            return {
                                                ...prev,
                                                minToLive: e.target.valueAsNumber,
                                                maxToLive: settings.minToLive
                                            }
                                        }

                                        return {
                                            ...prev,
                                            maxToLive: isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber))
                                        }
                                    })
                                } } className="font-mono" /></label>

                                <label className="mt-2">Min neighbors to reproduce: <input type="number" min={0} max={8} value={settings.minToReproduce} onChange={ (e) => {
                                    setSettings(prev => {
                                        if (e.target.valueAsNumber > settings.maxToReproduce) {
                                            return {
                                                ...prev,
                                                minToReproduce: settings.maxToReproduce,
                                                maxToReproduce: e.target.valueAsNumber
                                            }
                                        }

                                        return {
                                            ...prev,
                                            minToReproduce: isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber))
                                        }
                                    })
                                } } className="font-mono" /></label>
                                <label>Max neighbors to reproduce: <input type="number" min={0} max={8} value={settings.maxToReproduce} onChange={ (e) => {
                                    setSettings(prev => {
                                        if (e.target.valueAsNumber < settings.minToReproduce) {
                                            return {
                                                ...prev,
                                                minToReproduce: e.target.valueAsNumber,
                                                maxToReproduce: settings.minToReproduce
                                            }
                                        }

                                        return {
                                            ...prev,
                                            maxToReproduce: isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber))
                                        }
                                    })
                                } } className="font-mono" /></label>

                                <div className="mt-8 flex flex-col gap-2">
                                    <p
                                        className="text-red-500 cursor-pointer"
                                        onClick={() => {
                                            setSettings(defaultSettings);
                                        }}
                                    >Reset rules</p>
                                    <p
                                        className="text-red-500 cursor-pointer"
                                        onClick={resetGrid}
                                    >Randomize grid</p>
                                    <p
                                        className="text-red-500 cursor-pointer"
                                        onClick={() => {
                                            for (let i=0; i<gridDimsRef.current.y; i++) {
                                                for (let j=0; j<gridDimsRef.current.x; j++) {
                                                    state.current[i][j].isAlive = false;
                                                    state.current[i][j].lastUpdated = 0;
                                                }
                                            }
                                        }}
                                    >Clear grid</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <canvas
                ref={canvasRef}
                className="absolte top-0 left-0"
                style={{ width: '100vw', height: '100vh', display: 'block' }}
            />
            <canvas
                ref={cursorCanvasRef}
                className="absolute top-0 left-0"
                style={{ width: '100vw', height: '100vh', display: 'block' }}
            />
        </div>
    );
}
