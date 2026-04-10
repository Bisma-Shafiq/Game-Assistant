import { useState, useEffect, useRef } from "react";

const BASE = "http://localhost:8000";

// ── SSE streaming via fetch (POST body support) ───────────────────────────────
async function streamPost(endpoint, body, onStep, onDone, onError) {
    try {
        const res = await fetch(`${BASE}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Server error" }));
            onError(err.detail || "Request failed");
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop(); // keep incomplete chunk

            for (const part of parts) {
                if (!part.trim()) continue;
                // Parse SSE: "event: step\ndata: {...}"
                const lines = part.split("\n");
                const eventLine = lines.find(l => l.startsWith("event:"));
                const dataLine = lines.find(l => l.startsWith("data:"));
                if (!dataLine) continue;

                try {
                    const payload = JSON.parse(dataLine.replace("data:", "").trim());
                    const eventType = eventLine ? eventLine.replace("event:", "").trim() : "message";

                    if (eventType === "step") onStep(payload.text);
                    if (eventType === "done") onDone(payload.result);
                    if (eventType === "error") onError(payload.message);
                } catch { /* malformed chunk — skip */ }
            }
        }
    } catch (e) {
        onError(e.message);
    }
}

// ── Connection status dot ─────────────────────────────────────────────────────
function ConnectionDot({ connected, checking }) {
    if (checking) return (
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#555", animation: "pulse 1s infinite" }} />
    );
    return (
        <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? "#4ade80" : "#ff6b6b",
            boxShadow: connected ? "0 0 6px #4ade80" : "none",
        }} />
    );
}

// ── Step log item ─────────────────────────────────────────────────────────────
function StepLog({ steps }) {
    const endRef = useRef(null);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [steps]);

    return (
        <div style={{
            background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 8,
            height: 220, overflowY: "auto", padding: "10px 12px",
            fontFamily: "'Courier New', monospace", fontSize: 12,
        }}>
            {steps.length === 0 && (
                <div style={{ color: "#333", paddingTop: 8 }}>Waiting for build to start...</div>
            )}
            {steps.map((s, i) => (
                <div key={i} style={{ color: "#4ade80", marginBottom: 4, lineHeight: 1.5 }}>
                    <span style={{ color: "#FFD600" }}>[{String(i + 1).padStart(2, "0")}]</span> {s}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function UnityMCPPanel({ report, gdd, levelDesign }) {
    const [connected, setConnected] = useState(false);
    const [checking, setChecking] = useState(true);
    const [mode, setMode] = useState("full");   // "full" | "scripts"
    const [building, setBuilding] = useState(false);
    const [steps, setSteps] = useState([]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [statusReport, setStatusReport] = useState(null);
    const [fixingErrors, setFixingErrors] = useState(false);

    // ── Poll Unity connection on mount ──────────────────────────────────────────
    useEffect(() => {
        checkConnection();
        const interval = setInterval(checkConnection, 10_000);  // re-check every 10s
        return () => clearInterval(interval);
    }, []);

    async function checkConnection() {
        setChecking(true);
        try {
            const res = await fetch(`${BASE}/unity/ping`);
            const data = await res.json();
            setConnected(data.connected);
        } catch {
            setConnected(false);
        } finally {
            setChecking(false);
        }
    }

    async function fetchStatus() {
        try {
            const res = await fetch(`${BASE}/unity/status`);
            const data = await res.json();
            setStatusReport(data.summary);
        } catch (e) {
            setStatusReport("Failed to fetch status: " + e.message);
        }
    }

    // ── Build ───────────────────────────────────────────────────────────────────
    async function startBuild() {
        if (!connected) return;
        setBuilding(true);
        setSteps([]);
        setResult(null);
        setError("");

        const endpoint = mode === "full" ? "/unity/build-full" : "/unity/scripts-only";
        const body = mode === "full"
            ? { report, gdd, level_design: levelDesign }
            : { report, gdd };

        await streamPost(
            endpoint,
            body,
            (step) => setSteps(p => [...p, step]),
            (res) => { setResult(res); setBuilding(false); },
            (errMsg) => { setError(errMsg); setBuilding(false); },
        );
    }

    // ── Fix errors ──────────────────────────────────────────────────────────────
    async function fixErrors() {
        setFixingErrors(true);
        setSteps([]);
        setError("");

        await streamPost(
            "/unity/fix-errors",
            {},
            (step) => setSteps(p => [...p, step]),
            (res) => { setResult(res); setFixingErrors(false); },
            (errMsg) => { setError(errMsg); setFixingErrors(false); },
        );
    }

    const busy = building || fixingErrors;

    return (
        <div style={{
            background: "#0d0d0d", border: "1px solid #1e1e1e",
            borderRadius: 12, overflow: "hidden", marginBottom: 16,
        }}>

            {/* ── Header ── */}
            <div style={{
                padding: "14px 18px",
                background: "#111",
                borderBottom: "0.5px solid #1e1e1e",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 12,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "#1a1a1a", border: "1px solid #2a2a2a",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18,
                    }}>🔮</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Build in Unity</div>
                        <div style={{ fontSize: 11, color: "#555" }}>Claude MCP → live Unity Editor</div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Connection status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ConnectionDot connected={connected} checking={checking} />
                        <span style={{ fontSize: 12, color: connected ? "#4ade80" : "#555" }}>
                            {checking ? "Checking..." : connected ? "Unity connected" : "Unity not detected"}
                        </span>
                    </div>
                    <button
                        onClick={checkConnection}
                        style={{
                            fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                            background: "transparent", border: "0.5px solid #2a2a2a", color: "#555",
                        }}
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* ── Not connected state ── */}
            {!connected && !checking && (
                <div style={{ padding: "24px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
                    <div style={{ fontSize: 14, color: "#ccc", marginBottom: 8 }}>Unity Editor not detected</div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 20, lineHeight: 1.7 }}>
                        Make sure Unity is open and the MCP server is running.<br />
                        Go to <span style={{ color: "#FFD600" }}>Tools → MCP Unity → Server Window → Start Server</span>
                    </div>
                    <div style={{
                        background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 8,
                        padding: "12px 16px", textAlign: "left", maxWidth: 400, margin: "0 auto",
                    }}>
                        <div style={{ fontSize: 11, color: "#FFD600", marginBottom: 8, fontWeight: 600 }}>SETUP STEPS</div>
                        {[
                            "Install Unity (any version 2021+)",
                            "Window → Package Manager → + → Add from git URL",
                            "Paste: https://github.com/CoderGamester/mcp-unity.git",
                            "Tools → MCP Unity → Server Window → Start Server",
                            "Add ANTHROPIC_API_KEY to your .env",
                        ].map((s, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 12, color: "#888" }}>
                                <span style={{ color: "#FFD600", flexShrink: 0 }}>{i + 1}.</span>
                                <span>{s}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={checkConnection} className="btn btn-primary" style={{ marginTop: 20 }}>
                        Try again
                    </button>
                </div>
            )}

            {/* ── Connected state ── */}
            {connected && (
                <div style={{ padding: "16px 18px" }}>

                    {/* Mode selector */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                            Build mode
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            {[
                                { id: "full", label: "🏗️ Full build", sub: "Scripts + scene + components" },
                                { id: "scripts", label: "📄 Scripts only", sub: "C# files to Assets/Scripts/" },
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => !busy && setMode(m.id)}
                                    style={{
                                        flex: 1, padding: "10px 14px", borderRadius: 8, cursor: busy ? "default" : "pointer",
                                        border: `1.5px solid ${mode === m.id ? "#FFD600" : "#2a2a2a"}`,
                                        background: mode === m.id ? "#FFD60011" : "#111",
                                        textAlign: "left", opacity: busy ? 0.6 : 1,
                                    }}
                                >
                                    <div style={{ fontSize: 13, fontWeight: 600, color: mode === m.id ? "#FFD600" : "#888" }}>{m.label}</div>
                                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{m.sub}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        <button
                            className="btn btn-primary"
                            onClick={startBuild}
                            disabled={busy}
                            style={{ flex: 1, justifyContent: "center", minWidth: 160 }}
                        >
                            {building
                                ? <><span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>⟳</span> Building...</>
                                : "🔮 Build in Unity"
                            }
                        </button>

                        <button
                            className="btn btn-ghost"
                            onClick={fixErrors}
                            disabled={busy}
                            style={{ fontSize: 12 }}
                        >
                            {fixingErrors ? "Fixing..." : "🔧 Fix errors"}
                        </button>

                        <button
                            className="btn btn-ghost"
                            onClick={fetchStatus}
                            disabled={busy}
                            style={{ fontSize: 12 }}
                        >
                            📊 Status
                        </button>
                    </div>

                    {/* Step log */}
                    {(steps.length > 0 || busy) && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                marginBottom: 6,
                            }}>
                                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    Live progress
                                </div>
                                {busy && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFD600", animation: "pulse 1s infinite" }} />
                                        <span style={{ fontSize: 11, color: "#FFD600" }}>Running</span>
                                    </div>
                                )}
                            </div>
                            <StepLog steps={steps} />
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: "#1a0500", border: "1px solid #ff6b6b", borderRadius: 8,
                            padding: "12px 14px", marginBottom: 14,
                            display: "flex", alignItems: "flex-start", gap: 10,
                        }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>❌</span>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#ff6b6b", marginBottom: 4 }}>Build failed</div>
                                <div style={{ fontSize: 12, color: "#888" }}>{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && !busy && (
                        <div style={{
                            background: "#0a2010", border: "1px solid #4ade80", borderRadius: 8,
                            padding: "14px 16px", marginBottom: 14,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 18 }}>✅</span>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>
                                    Build complete — {result.game}
                                </div>
                            </div>
                            <pre style={{
                                fontSize: 12, color: "#ccc", lineHeight: 1.7,
                                whiteSpace: "pre-wrap", wordBreak: "break-word",
                                maxHeight: 300, overflowY: "auto",
                                fontFamily: "inherit", margin: 0,
                            }}>
                                {result.summary}
                            </pre>
                            <button
                                className="btn btn-ghost"
                                style={{ marginTop: 10, fontSize: 12 }}
                                onClick={() => { setResult(null); setSteps([]); }}
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Status report */}
                    {statusReport && (
                        <div style={{
                            background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 8,
                            padding: "14px 16px",
                        }}>
                            <div style={{
                                fontSize: 11, color: "#FFD600", textTransform: "uppercase",
                                letterSpacing: "0.06em", marginBottom: 8,
                            }}>
                                Project status
                            </div>
                            <pre style={{
                                fontSize: 12, color: "#888", lineHeight: 1.7,
                                whiteSpace: "pre-wrap", wordBreak: "break-word",
                                maxHeight: 250, overflowY: "auto",
                                fontFamily: "inherit", margin: 0,
                            }}>
                                {statusReport}
                            </pre>
                            <button
                                className="btn btn-ghost"
                                style={{ marginTop: 8, fontSize: 11 }}
                                onClick={() => setStatusReport(null)}
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
        </div>
    );
}