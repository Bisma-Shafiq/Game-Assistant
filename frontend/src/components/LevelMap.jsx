import { useEffect, useRef } from "react";

// ── Tile definitions ──────────────────────────────────────────────────────────
const TILE_COLORS = {
    floor: { top: "#1c1c1c", left: "#141414", right: "#181818" },
    citizen: { top: "#FFD600", left: "#b89900", right: "#d4b000" },
    obstacle: { top: "#ff6b6b", left: "#b34040", right: "#cc5555" },
    goal: { top: "#D4537E", left: "#8a2c4e", right: "#a83560" },
    powerup: { top: "#378ADD", left: "#1a4d8a", right: "#225faa" },
    boss: { top: "#cc44ff", left: "#6600aa", right: "#8800cc" },
    start: { top: "#4ade80", left: "#1a7a40", right: "#229950" },
};

const TILE_LABELS = {
    citizen: "C", obstacle: "X", goal: "END", powerup: "P", boss: "BOSS", start: "GO",
};

const LEGEND = [
    { color: "#4ade80", label: "Start", desc: "Where the player begins" },
    { color: "#D4537E", label: "Goal / Exit", desc: "Reach here to complete the level" },
    { color: "#FFD600", label: "Collectible", desc: "Citizens or items to collect" },
    { color: "#ff6b6b", label: "Obstacle", desc: "Hazards that damage the player" },
    { color: "#378ADD", label: "Power-up", desc: "Boosts or special abilities" },
    { color: "#cc44ff", label: "Boss", desc: "Boss enemy — defeat to progress" },
    { color: "#1c1c1c", label: "Floor", desc: "Walkable tile" },
];

// ── Seeded RNG + grid builder ─────────────────────────────────────────────────
function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function buildGrid(level, gameIdSeed = 0) {
    const contentSeed = hashStr(
        (level.primary_mechanic || "") + (level.name || "") +
        (level.objective || "") + (level.obstacles || []).join("") + level.difficulty
    );
    let seed = Math.abs((level.number * 137 + contentSeed + gameIdSeed * 31) | 0) || 1;
    const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) | 0; return (seed >>> 0) / 0xffffffff; };

    const cols = level.difficulty < 35 ? 5 : level.difficulty < 65 ? 6 : 7;
    const rows = level.difficulty < 35 ? 4 : level.difficulty < 65 ? 5 : 6;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
    grid[0][0] = 9;
    grid[rows - 1][cols - 1] = 4;

    const hasPowerup = (level.primary_mechanic || "").toLowerCase().includes("power") ||
        (level.secondary_mechanic || "").toLowerCase().includes("power");
    const hasBoss = (level.primary_mechanic || "").toLowerCase().includes("boss");
    const obsCount = Math.min((level.obstacles || []).length + Math.floor(level.difficulty / 20), 6);
    const citizenCount = Math.min(level.estimated_attempts || 3, cols * rows - 4);

    let placed = 0;
    for (let attempt = 0; attempt < 100 && placed < obsCount; attempt++) {
        const r = Math.floor(rand() * rows), c = Math.floor(rand() * cols);
        if (grid[r][c] === 1 && !(r === 0 && c === 0) && !(r === rows - 1 && c === cols - 1)) { grid[r][c] = 3; placed++; }
    }
    placed = 0;
    for (let attempt = 0; attempt < 200 && placed < citizenCount; attempt++) {
        const r = Math.floor(rand() * rows), c = Math.floor(rand() * cols);
        if (grid[r][c] === 1) { grid[r][c] = 2; placed++; }
    }
    if (hasPowerup) {
        for (let i = 0; i < 2; i++) for (let a = 0; a < 50; a++) {
            const r = Math.floor(rand() * rows), c = Math.floor(rand() * cols);
            if (grid[r][c] === 1) { grid[r][c] = 5; break; }
        }
    }
    if (hasBoss) { const br = Math.floor(rows / 2), bc = Math.floor(cols / 2); grid[br][bc] = 6; }
    return grid;
}

function getTileType(val) {
    return ["floor", "floor", "citizen", "obstacle", "goal", "powerup", "boss", "floor", "floor", "start"][val] ?? "floor";
}

// ── Canvas renderers ──────────────────────────────────────────────────────────
function drawIsoCanvas(canvas, grid, TW = 46, TH = 24, TZ = 14) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rows = grid.length, cols = grid[0].length;
    const ox = canvas.width / 2, oy = 28;
    const isoX = (r, c) => ox + (c - r) * (TW / 2);
    const isoY = (r, c) => oy + (c + r) * (TH / 2);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const type = getTileType(grid[r][c]);
            const tc = TILE_COLORS[type];
            const x = isoX(r, c), y = isoY(r, c);
            const h = type !== "floor" ? TZ + 8 : TZ;

            // right face
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + TW / 2, y + TH / 2);
            ctx.lineTo(x + TW / 2, y + TH / 2 + h); ctx.lineTo(x, y + h);
            ctx.closePath(); ctx.fillStyle = tc.right; ctx.fill();
            // left face
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x - TW / 2, y + TH / 2);
            ctx.lineTo(x - TW / 2, y + TH / 2 + h); ctx.lineTo(x, y + h);
            ctx.closePath(); ctx.fillStyle = tc.left; ctx.fill();
            // top face
            ctx.beginPath();
            ctx.moveTo(x, y + h); ctx.lineTo(x + TW / 2, y + TH / 2 + h);
            ctx.lineTo(x, y + TH + h); ctx.lineTo(x - TW / 2, y + TH / 2 + h);
            ctx.closePath(); ctx.fillStyle = tc.top; ctx.fill();
            ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 0.5; ctx.stroke();

            if (type !== "floor") {
                ctx.fillStyle = type === "citizen" ? "#0a0a0a" : "#fff";
                ctx.font = "bold 7px sans-serif";
                ctx.textAlign = "center"; ctx.textBaseline = "top";
                ctx.fillText(TILE_LABELS[type] || "", x, y + TH / 2 + h + 1);
            }
        }
    }
}

function drawThumbCanvas(canvas, grid) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const TW = 10, TH = 5, TZ = 3;
    const rows = grid.length, cols = grid[0].length;
    const ox = canvas.width / 2, oy = 5;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const type = getTileType(grid[r][c]);
            const tc = TILE_COLORS[type];
            const x = ox + (c - r) * (TW / 2), y = oy + (c + r) * (TH / 2);
            const h = type !== "floor" ? TZ + 2 : TZ;
            ctx.beginPath();
            ctx.moveTo(x, y + h); ctx.lineTo(x + TW / 2, y + TH / 2 + h);
            ctx.lineTo(x, y + TH + h); ctx.lineTo(x - TW / 2, y + TH / 2 + h);
            ctx.closePath(); ctx.fillStyle = tc.top; ctx.fill();
        }
    }
}

// ── Thumbnail card ────────────────────────────────────────────────────────────
function Thumb({ level, grid, active, onClick }) {
    const ref = useRef();
    useEffect(() => { if (ref.current) drawThumbCanvas(ref.current, grid); }, [grid]);
    const churnCol = { low: "#4ade80", medium: "#FFD600", high: "#ff6b6b" }[level.churn_risk] ?? "#888";
    const diffCol = level.difficulty < 35 ? "#4ade80" : level.difficulty < 65 ? "#FFD600" : "#ff6b6b";

    return (
        <div onClick={onClick} style={{
            background: active ? "#1a1400" : "#111",
            border: `1.5px solid ${active ? "#FFD600" : "#1e1e1e"}`,
            borderRadius: 10, padding: 8, cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s",
            position: "relative",
        }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = "#333"; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = "#1e1e1e"; }}
        >
            {/* level number + churn dot */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#FFD600", fontWeight: 700 }}>#{level.number}</span>
                <span title={`Churn risk: ${level.churn_risk}`}
                    style={{ width: 7, height: 7, borderRadius: "50%", background: churnCol, display: "inline-block" }} />
            </div>

            {/* iso thumbnail */}
            <canvas ref={ref} width={80} height={50}
                style={{ width: "100%", display: "block", borderRadius: 4, background: "#0d0d0d" }} />

            {/* level name */}
            <div style={{
                fontSize: 10, color: active ? "#FFD600" : "#555", marginTop: 5,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: active ? 600 : 400
            }}>
                {level.name}
            </div>

            {/* difficulty bar */}
            <div style={{ marginTop: 4, height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${level.difficulty}%`, background: diffCol, borderRadius: 2 }} />
            </div>
        </div>
    );
}

// ── Main LevelMap component ───────────────────────────────────────────────────
export default function LevelMap({ levels, activeIdx, onSelect, gameTitle = "", genre = "" }) {
    const mainRef = useRef();

    const gameSeed = hashStr(
        gameTitle + genre +
        (levels[0]?.name || "") + (levels[0]?.primary_mechanic || "") +
        (levels[0]?.objective || "") + (levels[levels.length - 1]?.name || "")
    );
    const grids = levels.map(lv => buildGrid(lv, gameSeed));

    useEffect(() => {
        const draw = () => { if (mainRef.current && levels[activeIdx]) drawIsoCanvas(mainRef.current, grids[activeIdx]); };
        draw();
        const t = setTimeout(draw, 50);
        return () => clearTimeout(t);
    }, [activeIdx, levels]);

    const lv = levels[activeIdx];
    if (!lv) return null;

    const churnCol = { low: "#4ade80", medium: "#FFD600", high: "#ff6b6b" }[lv.churn_risk] ?? "#888";
    const diffCol = lv.difficulty < 35 ? "#4ade80" : lv.difficulty < 65 ? "#FFD600" : "#ff6b6b";
    const diffLabel = lv.difficulty < 35 ? "Easy" : lv.difficulty < 65 ? "Medium" : "Hard";
    const flat = grids[activeIdx].flat();
    const counts = { citizens: flat.filter(v => v === 2).length, obstacles: flat.filter(v => v === 3).length, powerups: flat.filter(v => v === 5).length };

    return (
        <div>
            {/* ── thumbnail strip — 5 per row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8, marginBottom: 16 }}>
                {levels.map((lv, i) => (
                    <Thumb key={i} level={lv} grid={grids[i]} active={i === activeIdx} onClick={() => onSelect(i)} />
                ))}
            </div>

            {/* ── "how to read this map" guide ── */}
            <div style={{
                background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10,
                padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10
            }}>
                <div style={{ fontSize: 18, lineHeight: 1 }}>🗺</div>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#FFD600", marginBottom: 4 }}>How to read this map</div>
                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
                        Each tile represents one game element on the level grid. <span style={{ color: "#4ade80" }}>Green = start</span>,{" "}
                        <span style={{ color: "#D4537E" }}>pink = goal/exit</span>,{" "}
                        <span style={{ color: "#FFD600" }}>yellow = collectibles</span>,{" "}
                        <span style={{ color: "#ff6b6b" }}>red = obstacles</span>,{" "}
                        <span style={{ color: "#378ADD" }}>blue = power-ups</span>.{" "}
                        The map is procedurally generated from the level's mechanics and difficulty — higher difficulty = larger, denser grid.
                        The <span style={{ color: "#4ade80" }}>●</span> / <span style={{ color: "#FFD600" }}>●</span> / <span style={{ color: "#ff6b6b" }}>●</span> dot on each thumbnail shows churn risk (low / medium / high).
                    </div>
                </div>
            </div>

            {/* ── detail panel ── */}
            <div style={{ background: "#111", border: "0.5px solid #242424", borderRadius: 12, padding: 18 }}>

                {/* level header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                            Level {lv.number} — <span style={{ color: "#FFD600" }}>{lv.name}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#888", marginTop: 4, maxWidth: 500 }}>{lv.objective}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                            fontSize: 11, padding: "3px 10px", borderRadius: 20,
                            background: diffCol + "22", color: diffCol, border: `1px solid ${diffCol}`, fontWeight: 700
                        }}>
                            {diffLabel} · {lv.difficulty}/100
                        </span>
                        <span style={{
                            fontSize: 11, padding: "3px 10px", borderRadius: 20,
                            background: churnCol + "22", color: churnCol, border: `1px solid ${churnCol}`, fontWeight: 700
                        }}>
                            Churn: {lv.churn_risk}
                        </span>
                        <span style={{
                            fontSize: 11, padding: "3px 10px", borderRadius: 20,
                            background: "#1a1a1a", color: "#FFD600", border: "0.5px solid #333", fontWeight: 600
                        }}>
                            {lv.primary_mechanic}
                        </span>
                        {lv.secondary_mechanic && (
                            <span style={{
                                fontSize: 11, padding: "3px 10px", borderRadius: 20,
                                background: "#1a1a1a", color: "#888", border: "0.5px solid #2a2a2a"
                            }}>
                                + {lv.secondary_mechanic}
                            </span>
                        )}
                    </div>
                </div>

                {/* iso map + right panel */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
                    <canvas ref={mainRef} width={420} height={280}
                        style={{ width: "100%", display: "block", borderRadius: 8, background: "#0d0d0d" }} />

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                        {/* legend */}
                        <div style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{
                                fontSize: 10, color: "#444", textTransform: "uppercase",
                                letterSpacing: "0.07em", marginBottom: 10, fontWeight: 700
                            }}>Map legend</div>
                            {LEGEND.map(({ color, label, desc }) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontSize: 11, color: "#ccc", fontWeight: 600 }}>{label}</span>
                                        <span style={{ fontSize: 10, color: "#555", marginLeft: 5 }}>{desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* tile counts */}
                        <div style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{
                                fontSize: 10, color: "#444", textTransform: "uppercase",
                                letterSpacing: "0.07em", marginBottom: 8, fontWeight: 700
                            }}>Level stats</div>
                            {[
                                ["Grid size", `${grids[activeIdx][0].length} × ${grids[activeIdx].length} tiles`],
                                ["Collectibles", counts.citizens, "#FFD600"],
                                ["Obstacles", counts.obstacles, "#ff6b6b"],
                                ["Power-ups", counts.powerups, "#378ADD"],
                                ["Est. attempts", Math.ceil(lv.difficulty / 15), "#888"],
                                ["World", `World ${lv.world}`, "#555"],
                            ].map(([k, v, col]) => (
                                <div key={k} style={{
                                    display: "flex", justifyContent: "space-between",
                                    padding: "5px 0", borderBottom: "0.5px solid #1a1a1a", fontSize: 12
                                }}>
                                    <span style={{ color: "#555" }}>{k}</span>
                                    <span style={{ color: col || "#ccc", fontWeight: col ? 600 : 400 }}>{v}</span>
                                </div>
                            ))}
                        </div>

                        {/* churn warning */}
                        {lv.churn_reason && (
                            <div style={{
                                background: "#0d0d0d", border: `0.5px solid ${churnCol}`,
                                borderRadius: 10, padding: "10px 12px"
                            }}>
                                <div style={{
                                    fontSize: 10, color: churnCol, textTransform: "uppercase",
                                    letterSpacing: "0.06em", marginBottom: 5, fontWeight: 700
                                }}>⚠ Churn risk</div>
                                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{lv.churn_reason}</div>
                            </div>
                        )}

                        {/* onboarding note */}
                        {lv.onboarding_note && (
                            <div style={{
                                background: "#0d0d0d", border: "0.5px solid #4ade80",
                                borderRadius: 10, padding: "10px 12px"
                            }}>
                                <div style={{
                                    fontSize: 10, color: "#4ade80", textTransform: "uppercase",
                                    letterSpacing: "0.06em", marginBottom: 5, fontWeight: 700
                                }}>📖 Tutorial note</div>
                                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{lv.onboarding_note}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* obstacles row */}
                {(lv.obstacles || []).length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "0.5px solid #1e1e1e" }}>
                        <div style={{
                            fontSize: 10, color: "#444", textTransform: "uppercase",
                            letterSpacing: "0.07em", marginBottom: 8, fontWeight: 700
                        }}>Obstacles in this level</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {lv.obstacles.map((obs, i) => (
                                <span key={i} style={{
                                    fontSize: 12, padding: "4px 12px", borderRadius: 20,
                                    background: "#ff6b6b22", color: "#ff6b6b", border: "0.5px solid #ff6b6b55"
                                }}>
                                    ✕ {obs}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}