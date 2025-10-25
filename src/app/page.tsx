"use client";

import {useEffect, useRef, useState} from "react";
import {
    FaPlay,
    FaBrush,
    FaEraser,
    FaEye,
    FaGear,
    FaMaximize,
    FaMinimize,
    FaPause,
    FaPlus,
    FaDeleteLeft
} from "react-icons/fa6";
import {useGameOfLife, defaultSettings} from "@/hooks/useGameOfLife";

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cursorCanvasRef = useRef<HTMLCanvasElement>(null);

    const {
        stateRef,
        gridDims,
        gridDimsRef,
        settings,
        setSettings,
        settingsRef,
        renderGrid,
        step,
        resizeGrid,
        resetGrid,
    } = useGameOfLife(JSON.parse(JSON.stringify(defaultSettings)));

    useEffect(() => { resizeGrid(canvasRef.current, cursorCanvasRef.current); }, [settings]);

    const resetGridLocal = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        resetGrid(canvas);

        const ctx = canvas.getContext("2d");
        if (ctx) renderGrid(ctx);
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

        // Initialize the state via hook
        resizeGrid(canvas, cursorCanvas);

        // event listeners
        window.addEventListener("resize", () => {
            resizeGrid(canvasRef.current, cursorCanvasRef.current);
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
            const x = Math.floor(e.clientX / settingsRef.current.cellSize);
            const y = Math.floor(e.clientY / settingsRef.current.cellSize);
            mousePositionRef.current = { x, y };
        });


        // animation: start stepping using hook.step and isPausedRef
        requestAnimationFrame(() => step(ctx, isPausedRef));

        // cursor animation loop
        const cursorStep = () => {
            const {x, y} = mousePositionRef.current;

            cursorCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            if (drawModeRef.current !== "none") {
                cursorCtx.strokeStyle = "#ffffff";
                cursorCtx.lineWidth = 2;
                cursorCtx.strokeRect((x - Math.floor(cursorWidthRef.current / 2)) * settingsRef.current.cellSize, (y - Math.floor(cursorWidthRef.current / 2)) * settingsRef.current.cellSize, settingsRef.current.cellSize * cursorWidthRef.current, settingsRef.current.cellSize * cursorWidthRef.current);
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

                        const cell = stateRef.current[yj][xi];
                        if (drawModeRef.current === "draw") {
                            cell.isAlive = true;
                            cell.lastUpdated = 0;

                            ctx.fillStyle = settingsRef.current.showRecency ? "#4678eb" : "#ffffff";
                            ctx.fillRect(xi * settingsRef.current.cellSize, yj * settingsRef.current.cellSize, settingsRef.current.cellSize, settingsRef.current.cellSize);
                        } else if (drawModeRef.current === "erase") {
                            cell.isAlive = false;
                            cell.lastUpdated = 0;

                            ctx.clearRect(xi * settingsRef.current.cellSize, yj * settingsRef.current.cellSize, settingsRef.current.cellSize, settingsRef.current.cellSize);
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

    const [cursorWidth, setCursorWidth] = useState(1);
    const cursorWidthRef = useRef(cursorWidth);
    useEffect(() => { cursorWidthRef.current = cursorWidth; }, [cursorWidth]);

    const tempDrawBlockRef = useRef(false);

    const [tempAliveRule, setTempAliveRule] = useState<{
        min: number,
        max: number
    } | null>(null);
    const [tempReproduceRule, setTempReproduceRule] = useState<{
        min: number,
        max: number
    } | null>(null);

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
                                        resizeGrid(canvasRef.current, cursorCanvasRef.current);
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
                        <div className="px-5 h-[650px] overflow-auto">
                            <div className="flex flex-col gap-2">
                                <h1>General</h1>
                                <label onClick={() => resizeGrid(canvasRef.current, cursorCanvasRef.current, true)}>Trim out-of-bounds cells: <span className="font-mono font-bold">Trim (Currently {gridDims.x} x {gridDims.y})</span></label>
                                <label onClick={() => setSettings(prev => {
                                    return {
                                        ...prev,
                                        showRecency: !prev.showRecency
                                    }
                                })}>Indicate cell update recency: <span className="font-mono font-bold">{settings.showRecency ? "yes" : "no"}</span></label>
                                <label>Cell size:</label>
                                <div className="flex flex-row">
                                    <input type="range" min={1} max={40} value={settings.cellSize} onChange={ (e) => {
                                        setSettings(prev => {
                                            return {
                                                ...prev,
                                                cellSize: e.target.valueAsNumber
                                            }
                                        })
                                    } } className="font-mono" />
                                    <p className="ml-5 font-mono font-bold">{settings.cellSize} pixel{settings.cellSize === 1 ? "" : "s"}</p>
                                </div>

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
                                    <p className="ml-5 font-mono font-bold">{cursorWidth} pixel{cursorWidth === 1 ? "" : "s"}</p>
                                </div>

                                <h1>Rules</h1>

                                <label>Neighbors necessary to live:</label>
                                <table>
                                    <thead>
                                        <tr>
                                            <th className="text-left">Min</th>
                                            <th className="text-left">Max</th>
                                            <th className="text-left"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            settings.aliveConditions.map((condition, index) => {
                                                return (
                                                    <tr key={index}>
                                                        <td>
                                                            <input type="number" min={0} max={8} value={condition.min} onChange={ (e) => {
                                                                setSettings(prev => {
                                                                    const newConditions = [...prev.aliveConditions];
                                                                    newConditions[index].min = isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber));

                                                                    return {
                                                                        ...prev,
                                                                        aliveConditions: newConditions
                                                                    }
                                                                })
                                                            } } className="font-mono w-full h-full" style={{
                                                                color: condition.min > condition.max ? "red" : ""
                                                            }} />
                                                        </td>
                                                        <td>
                                                            <input type="number" min={0} max={8} value={condition.max} onChange={ (e) => {
                                                                setSettings(prev => {
                                                                    const newConditions = [...prev.aliveConditions];
                                                                    newConditions[index].max = isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber));
                                                                    return {
                                                                        ...prev,
                                                                        aliveConditions: newConditions
                                                                    }
                                                                })
                                                            } } className="font-mono w-full h-full" style={{
                                                                color: condition.min > condition.max ? "red" : ""
                                                            }} />
                                                        </td>
                                                        <td>
                                                            <button type="button" onClick={() => {
                                                                setSettings(prev => {
                                                                    const newConditions = [...prev.aliveConditions];
                                                                    newConditions.splice(index, 1);
                                                                    return {
                                                                        ...prev,
                                                                        aliveConditions: newConditions
                                                                    }
                                                                })
                                                            }}><FaDeleteLeft /></button>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        }

                                        {
                                            tempAliveRule && (
                                                <tr className="text-gray-500">
                                                    <td>
                                                        <input type="number" min={0} max={8} value={tempAliveRule.min} onChange={ (e) => {
                                                            setTempAliveRule(prev => {
                                                                if (!prev) return null;
                                                                return {
                                                                    ...prev,
                                                                    min: isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber))
                                                                }
                                                            })
                                                        } } className="font-mono w-full h-full" style={{
                                                            color: tempAliveRule.min > tempAliveRule.max ? "red" : ""
                                                        }} />
                                                    </td>
                                                    <td>
                                                        <input type="number" min={0} max={8} value={tempAliveRule.max} onChange={ (e) => {
                                                            setTempAliveRule(prev => {
                                                                if (!prev) return null;
                                                                return {
                                                                    ...prev,
                                                                    max: isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber))
                                                                }
                                                            })
                                                        } } className="font-mono w-full h-full" style={{
                                                            color: tempAliveRule.min > tempAliveRule.max ? "red" : ""
                                                        }} />
                                                    </td>
                                                    <td>
                                                        <button className="text-green-500" type="button" onClick={() => {
                                                            setSettings(prev => {
                                                                const newConditions = [...prev.aliveConditions];
                                                                newConditions.push(tempAliveRule);
                                                                return {
                                                                    ...prev,
                                                                    aliveConditions: newConditions
                                                                }
                                                            })
                                                            setTempAliveRule(null);
                                                        }}><FaPlus /></button>
                                                    </td>
                                                </tr>
                                            )
                                        }

                                        <tr>
                                            <td colSpan={2} className="text-left pt-2 underline underline-offset-2">
                                                <button disabled={tempAliveRule !== null} className="flex flex-row gap-3" type="button" onClick={() => {
                                                    setTempAliveRule({
                                                        min: 0,
                                                        max: 0
                                                    })
                                                }}>Add condition (OR)</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <label className="mt-5">Neighbors necessary to reproduce:</label>
                                <table>
                                    <thead>
                                    <tr>
                                        <th className="text-left">Min</th>
                                        <th className="text-left">Max</th>
                                        <th className="text-left"></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {
                                        settings.reproduceConditions.map((condition, index) => {
                                            return (
                                                <tr key={index}>
                                                    <td>
                                                        <input type="number" min={0} max={8} value={condition.min} onChange={ (e) => {
                                                            setSettings(prev => {
                                                                const newConditions = [...prev.reproduceConditions];
                                                                newConditions[index].min = isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber));

                                                                return {
                                                                    ...prev,
                                                                    reproduceConditions: newConditions
                                                                }
                                                            })
                                                        } } className="font-mono w-full h-full" style={{
                                                            color: condition.min > condition.max ? "red" : ""
                                                        }} />
                                                    </td>
                                                    <td>
                                                        <input type="number" min={0} max={8} value={condition.max} onChange={ (e) => {
                                                            setSettings(prev => {
                                                                const newConditions = [...prev.reproduceConditions];
                                                                newConditions[index].max = isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber));
                                                                return {
                                                                    ...prev,
                                                                    reproduceConditions: newConditions
                                                                }
                                                            })
                                                        } } className="font-mono w-full h-full" style={{
                                                            color: condition.min > condition.max ? "red" : ""
                                                        }} />
                                                    </td>
                                                    <td>
                                                        <button type="button" onClick={() => {
                                                            setSettings(prev => {
                                                                const newConditions = [...prev.reproduceConditions];
                                                                newConditions.splice(index, 1);
                                                                return {
                                                                    ...prev,
                                                                    reproduceConditions: newConditions
                                                                }
                                                            })
                                                        }}><FaDeleteLeft /></button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    }

                                    {
                                        tempReproduceRule && (
                                            <tr className="text-gray-500">
                                                <td>
                                                    <input type="number" min={0} max={8} value={tempReproduceRule.min} onChange={ (e) => {
                                                        setTempReproduceRule(prev => {
                                                            if (!prev) return null;
                                                            return {
                                                                ...prev,
                                                                min: isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber))
                                                            }
                                                        })
                                                    } } className="font-mono w-full h-full" style={{
                                                        color: tempReproduceRule.min > tempReproduceRule.max ? "red" : ""
                                                    }} />
                                                </td>
                                                <td>
                                                    <input type="number" min={0} max={8} value={tempReproduceRule.max} onChange={ (e) => {
                                                        setTempReproduceRule(prev => {
                                                            if (!prev) return null;
                                                            return {
                                                                ...prev,
                                                                max: isNaN(e.target.valueAsNumber) ? 0 : Math.max(0, Math.min(8, e.target.valueAsNumber))
                                                            }
                                                        })
                                                    } } className="font-mono w-full h-full" style={{
                                                        color: tempReproduceRule.min > tempReproduceRule.max ? "red" : ""
                                                    }} />
                                                </td>
                                                <td>
                                                    <button className="text-green-500" type="button" onClick={() => {
                                                        setSettings(prev => {
                                                            const newConditions = [...prev.reproduceConditions];
                                                            newConditions.push(tempReproduceRule);
                                                            return {
                                                                ...prev,
                                                                reproduceConditions: newConditions
                                                            }
                                                        })
                                                        setTempReproduceRule(null);
                                                    }}><FaPlus /></button>
                                                </td>
                                            </tr>
                                        )
                                    }

                                    <tr>
                                        <td colSpan={2} className="text-left pt-2 underline underline-offset-2">
                                            <button disabled={tempReproduceRule !== null} className="flex flex-row gap-3" type="button" onClick={() => {
                                                setTempReproduceRule({
                                                    min: 0,
                                                    max: 0
                                                })
                                            }}>Add condition (OR)</button>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>

                                <div className="mt-8 flex flex-col gap-2">
                                    <p
                                        className="text-red-500 cursor-pointer"
                                        onClick={() => {
                                            setSettings(JSON.parse(JSON.stringify(defaultSettings)));
                                        }}
                                    >Reset rules</p>
                                    <p
                                        className="text-red-500 cursor-pointer"
                                        onClick={resetGridLocal}
                                    >Randomize grid</p>
                                    <p
                                        className="text-red-500 cursor-pointer"
                                        onClick={() => {
                                            for (let i=0; i<gridDimsRef.current.y; i++) {
                                                for (let j=0; j<gridDimsRef.current.x; j++) {
                                                    stateRef.current[i][j].isAlive = false;
                                                    stateRef.current[i][j].lastUpdated = 0;
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
