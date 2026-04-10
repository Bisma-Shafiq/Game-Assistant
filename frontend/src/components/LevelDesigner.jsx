import { useState, useRef } from "react";

const COLS = 16, ROWS = 14;
const TILES = [
    { id: "grass", label: "Grass", icon: "🌿", color: "#4a7c2f", light: "#C0DD97" },
    { id: "water", label: "Water", icon: "💧", color: "#1e6fa8", light: "#B5D4F4" },
    { id: "lava", label: "Lava", icon: "🔥", color: "#c0441a", light: "#F0997B" },
    { id: "stone", label: "Stone", icon: "🪨", color: "#707070", light: "#D3D1C7" },
    { id: "sand", label: "Sand", icon: "🏖", color: "#b07010", light: "#FAC775" },
    { id: "ice", label: "Ice", icon: "❄", color: "#5090c0", light: "#C8E4F8" },
    { id: "wall", label: "Wall", icon: "⬛", color: "#2a2a2a", light: "#888780" },
    { id: "spawn", label: "Spawn", icon: "🔵", color: "#5040c0", light: "#AFA9EC" },
    { id: "goal", label: "Goal", icon: "🏆", color: "#0d7a58", light: "#9FE1CB" },
    { id: "coin", label: "Coin", icon: "🪙", color: "#c8960a", light: "#FAE080" },
    { id: "enemy", label: "Enemy", icon: "👾", color: "#8b1a1a", light: "#F7C1C1" },
    { id: "bridge", label: "Bridge", icon: "🌉", color: "#7a5c2a", light: "#E8D5A0" },
];
const TILE_MAP = Object.fromEntries(TILES.map(t => [t.id, t]));
const EMPTY = "empty";
const mkGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

const CLAUDE_SYSTEM = `You are an expert mobile game level designer.
The user describes a level. Generate a ${ROWS}x${COLS} tile grid.
Available tiles: grass, water, lava, stone, sand, ice, wall, spawn, goal, coin, enemy, bridge, empty
Rules:
- Exactly ONE spawn and ONE goal tile
- Clear path from spawn to goal
- Bottom row mostly solid (wall/ground tiles)
- empty = open air
Respond ONLY with valid JSON, no markdown:
{"name":"Level Name","description":"One sentence.","grid":[[row0...],[row1...],...]}
Grid must be exactly ${ROWS} rows of ${COLS} tiles each.`;

export default function LevelDesigner() {
    const [grid, setGrid] = useState(mkGrid());
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [lvlName, setLvlName] = useState("Your Level");
    const [lvlDesc, setLvlDesc] = useState("Describe your level idea and AI will build it.");
    const [error, setError] = useState("");
    const [history, setHistory] = useState([]);
    const [selTile, setSel] = useState("wall");
    const [tool, setTool] = useState("paint");
    const [cursor, setCursor] = useState(null);
    const painting = useRef(false);

    const SUGGESTIONS = [
        "A volcanic island with lava rivers and stone bridges",
        "Snowy mountain with ice platforms and frozen enemies",
        "Underwater cave with water pools and coin trails",
        "Desert ruins with sand dunes and hidden treasures",
        "Dark dungeon with wall mazes and many enemies",
        "Grassy meadow with a river crossing and coins",
    ];

    // ── Call Anthropic API directly (Claude) ──────────────────────────────────
    const generate = async (p) => {
        const userPrompt = p || prompt;
        if (!userPrompt.trim()) return;
        setLoading(true); setError("");
        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    system: CLAUDE_SYSTEM,
                    messages: [{ role: "user", content: `Generate a level for: "${userPrompt}"` }],
                }),
            });
            const data = await res.json();
            const text = data.content?.find(b => b.type === "text")?.text || "";
            const clean = text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(clean);
            if (!parsed.grid || parsed.grid.length !== ROWS) throw new Error("Invalid grid");
            setHistory(h => [{ name: lvlName, grid, desc: lvlDesc }, ...h.slice(0, 4)]);
            setGrid(parsed.grid);
            setLvlName(parsed.name || userPrompt);
            setLvlDesc(parsed.description || "");
        } catch (e) {
            setError("Generation failed. Check your prompt and try again.");
        }
        setLoading(false);
    };

    // ── Manual paint/erase ────────────────────────────────────────────────────
    const paintCell = (r, c) => {
        setGrid(g => g.map((row, ri) => row.map((cell, ci) =>
            ri === r && ci === c ? (tool === "erase" ? EMPTY : selTile) : cell
        )));
    };
    const onDown = (r, c) => { painting.current = true; paintCell(r, c); };
    const onEnter = (r, c) => { setCursor([r, c]); if (painting.current) paintCell(r, c); };
    const onUp = () => { painting.current = false; };

    // ── Export ────────────────────────────────────────────────────────────────
    const exportJSON = () => {
        const blob = new Blob([JSON.stringify({ name: lvlName, description: lvlDesc, cols: COLS, rows: ROWS, grid }, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${lvlName.replace(/\s+/g, "_")}.json`;
        a.click();
    };

    const painted = grid.flat().filter(v => v !== EMPTY).length;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 58px)", fontFamily: "inherit", background: "var(--black)" }}>

            {/* Level name + export bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", background: "var(--card)", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>🗺</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{lvlName}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{lvlDesc}</div>
                </div>
                <button onClick={exportJSON} className="btn btn-ghost" style={{ fontSize: 12 }}>Export JSON</button>
            </div>

            {/* AI Prompt bar */}
            <div style={{ padding: "10px 20px", background: "var(--card2)", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                        value={prompt} onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && generate()}
                        placeholder="Describe your level… e.g. 'a lava cave with stone bridges and coins'"
                        style={{ flex: 1, fontSize: 13, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "#0d0d0d", color: "#fff", outline: "none" }}
                    />
                    <button
                        onClick={() => generate()}
                        disabled={loading || !prompt.trim()}
                        className="btn btn-primary"
                        style={{ fontSize: 13, minWidth: 110, opacity: loading || !prompt.trim() ? 0.45 : 1 }}>
                        {loading ? "Building…" : "✨ Generate"}
                    </button>
                </div>
                {/* Quick suggestion pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {SUGGESTIONS.map(s => (
                        <button key={s} onClick={() => { setPrompt(s); generate(s); }}
                            style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, border: "0.5px solid var(--border)", background: "transparent", color: "#666", cursor: "pointer" }}>
                            {s}
                        </button>
                    ))}
                </div>
                {error && <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 6 }}>{error}</div>}
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                {/* Left sidebar — tiles + tools */}
                <div style={{ width: 118, background: "var(--card)", borderRight: "0.5px solid var(--border)", display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
                    <div style={{ padding: "5px 10px", fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "0.5px solid var(--border)" }}>Tiles</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, padding: 7 }}>
                        {TILES.map(t => (
                            <div key={t.id} onClick={() => { setSel(t.id); setTool("paint"); }} title={t.label}
                                style={{ width: 28, height: 28, borderRadius: 5, background: t.light, border: selTile === t.id && tool === "paint" ? "2px solid #FFD600" : "1.5px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                                {t.icon}
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: "5px 10px", fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", borderTop: "0.5px solid var(--border)", borderBottom: "0.5px solid var(--border)" }}>Tools</div>
                    {[{ id: "paint", icon: "✏️", l: "Paint" }, { id: "erase", icon: "⬜", l: "Erase" }].map(t => (
                        <button key={t.id} onClick={() => setTool(t.id)}
                            style={{ margin: "4px 7px", fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "0.5px solid var(--border)", background: tool === t.id ? "#1f1500" : "transparent", color: tool === t.id ? "#FFD600" : "#555", cursor: "pointer", textAlign: "left", display: "flex", gap: 5, alignItems: "center" }}>
                            <span style={{ fontSize: 12 }}>{t.icon}</span>{t.l}
                        </button>
                    ))}

                    {/* History */}
                    {history.length > 0 && (
                        <>
                            <div style={{ padding: "5px 10px", fontSize: 10, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.07em", borderTop: "0.5px solid var(--border)", marginTop: "auto" }}>History</div>
                            {history.map((h, i) => (
                                <button key={i} onClick={() => { setGrid(h.grid); setLvlName(h.name); setLvlDesc(h.desc); }}
                                    style={{ margin: "2px 7px", fontSize: 10, padding: "3px 7px", borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", color: "#555", cursor: "pointer", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    ↩ {h.name}
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* Canvas */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", overflow: "auto", position: "relative" }}
                    onMouseUp={onUp}
                    onMouseLeave={() => { setCursor(null); painting.current = false; }}>

                    {loading && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                            <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite" }}>⚙️</div>
                            <div style={{ fontSize: 14, color: "#FFD600", fontWeight: 600 }}>AI is designing your level…</div>
                            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>This takes a few seconds</div>
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS},1fr)`, gap: 1, background: "#1a1a1a", border: "1px solid #333", userSelect: "none", flexShrink: 0 }}>
                        {grid.map((row, r) => row.map((cell, c) => {
                            const t = TILE_MAP[cell];
                            const isCur = cursor && cursor[0] === r && cursor[1] === c;
                            return (
                                <div key={`${r}-${c}`}
                                    onMouseDown={() => onDown(r, c)}
                                    onMouseEnter={() => onEnter(r, c)}
                                    title={t ? t.label : "empty"}
                                    style={{ width: 26, height: 26, cursor: "crosshair", background: cell === EMPTY ? "#141414" : t?.color, opacity: isCur ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, transition: "opacity 0.05s" }}>
                                    {cell !== EMPTY && t ? <span style={{ pointerEvents: "none", lineHeight: 1 }}>{t.icon}</span> : null}
                                </div>
                            );
                        }))}
                    </div>
                </div>

                {/* Right stats panel */}
                <div style={{ width: 118, background: "var(--card)", borderLeft: "0.5px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
                    <div style={{ padding: "5px 10px", fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "0.5px solid var(--border)" }}>Stats</div>
                    {[["Grid", `${COLS}×${ROWS}`], ["Painted", `${painted}/${COLS * ROWS}`], ["Cursor", cursor ? `${cursor[1]},${cursor[0]}` : "—"]].map(([k, v]) => (
                        <div key={k} style={{ padding: "6px 10px", borderBottom: "0.5px solid var(--border)" }}>
                            <div style={{ fontSize: 10, color: "#444", marginBottom: 1 }}>{k}</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#ccc" }}>{v}</div>
                        </div>
                    ))}
                    <div style={{ padding: "5px 10px", fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "0.5px solid var(--border)", borderTop: "0.5px solid var(--border)" }}>Tiles used</div>
                    {TILES.filter(t => grid.flat().includes(t.id)).map(t => {
                        const cnt = grid.flat().filter(v => v === t.id).length;
                        return (
                            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px", fontSize: 10, color: "#555" }}>
                                <span>{t.icon} {t.label}</span>
                                <span style={{ fontWeight: 500, color: "#aaa" }}>{cnt}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Status bar */}
            <div style={{ padding: "4px 20px", background: "var(--card)", borderTop: "0.5px solid var(--border)", fontSize: 10, color: "#444", display: "flex", gap: 16, flexShrink: 0 }}>
                <span>Tool: <strong style={{ color: "#aaa" }}>{tool}</strong></span>
                <span>Tile: <strong style={{ color: "#aaa" }}>{TILE_MAP[selTile]?.label}</strong></span>
                <span style={{ marginLeft: "auto", color: "#FFD600" }}>✨ Powered by Claude AI</span>
            </div>
        </div>
    );
}