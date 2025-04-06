"use client";

import {useEffect, useRef, useState} from "react";

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    interface Cell {
        isAlive: boolean;
        lastUpdated: number; // number of frames since last update
    }

    const state = useRef<Cell[][]>([[]]);
    const [gridDims, setGridDims] = useState({
        x: state.current.length,
        y: state.current[0].length
    });

    const defaultSettings = {
        showRecency: true,
        fullScreen: false,
        frameLen: 50, // ms - time between frames
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

    const step = (ctx: CanvasRenderingContext2D) => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        ctx.clearRect(0, 0, width, height);

        let v = state.current;
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

        // update
        let newState = state.current.map(row => row.map(cell => ({ ...cell })));

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

        let elapsed = 0;
        const int = setInterval(() => {
            elapsed += 1;
            if (elapsed >= settingsRef.current.frameLen) {
                requestAnimationFrame(() => step(ctx));
                clearInterval(int);
            }
        }, 1)
        // ^^ this allows the frame rate to change even if a frame's duration hasn't fully elapsed yet (e.g., prev frame was 5000ms, but you cahnge it BEFORE the end)

        setTimeout(() => {

        }, settingsRef.current.frameLen);
    }

    const resizeGrid = (trim: boolean = false) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

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

    useEffect(() => {
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

        // animation
        requestAnimationFrame(() => step(ctx));
    }, []);

    const [showSettings, setShowSettings] = useState(false);

    return (
        <div>
            <div id="settings-cont" className="absolute w-fit top-5 right-5">
                <div id="settings" className="p-5 bg-black" style={{ visibility: settings.fullScreen ? "hidden" : "visible", boxShadow: "0px 10px 25px black" }}>
                    <div
                        className="cursor-pointer flex flex-row justify-end"
                        onClick={() => setShowSettings(prev => !prev)}
                    >
                        <p>{showSettings ? "Hide" : "Show"} settings</p>
                    </div>

                    { showSettings && (
                        <div>
                            <div className="flex flex-col gap-2">
                                <h1 className="font-bold mt-4">Settings</h1>
                                <label onClick={() => setSettings(prev => {
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
                                })}>Fullscreen: <span className="font-mono font-bold">{settings.fullScreen ? "yes" : "no"}</span></label>
                                <label onClick={() => resizeGrid(true)}>Trim out-of-bounds cells: <span className="font-mono font-bold">Trim (Currently {gridDims.x} x {gridDims.y})</span></label>
                                <label onClick={() => setSettings(prev => {
                                    return {
                                        ...prev,
                                        showRecency: !prev.showRecency
                                    }
                                })}>Indicate recency: <span className="font-mono font-bold">{settings.showRecency ? "yes" : "no"}</span></label>
                                <label>Millisecs/frame: <input type="number" value={settings.frameLen} onChange={ (e) => {
                                    setSettings(prev => {
                                        return {
                                            ...prev,
                                            frameLen: isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                                        }
                                    })
                                } } className="font-mono" /></label>

                                <p className="font-bold mt-4">Rules</p>
                                <label>Min neighbors alive to live: <input type="number" value={settings.minToLive} onChange={ (e) => {
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
                                            minToLive: isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                                        }
                                    })
                                } } className="font-mono" /></label>
                                <label>Max neighbors alive to live: <input type="number" value={settings.maxToLive} onChange={ (e) => {
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
                                            maxToLive: isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                                        }
                                    })
                                } } className="font-mono" /></label>

                                <label className="mt-2">Min neighbors to reproduce: <input type="number" value={settings.minToReproduce} onChange={ (e) => {
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
                                            minToReproduce: isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                                        }
                                    })
                                } } className="font-mono" /></label>
                                <label>Max neighbors to reproduce: <input type="number" value={settings.maxToReproduce} onChange={ (e) => {
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
                                            maxToReproduce: isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                                        }
                                    })
                                } } className="font-mono" /></label>

                                <p
                                    className="mt-8 text-red-500 cursor-pointer"
                                    onClick={resetGrid}
                                >Randomize grid</p>
                                <p
                                    className="text-red-500 cursor-pointer"
                                    onClick={() => {
                                        resetGrid();
                                        setSettings(defaultSettings);
                                    }}
                                >Randomize grid and randomize rules</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <canvas
                id="canvas"
                ref={canvasRef}
                style={{ width: '100vw', height: '100vh', display: 'block' }}
            />
        </div>
    );
}
