import { useState } from "react";
import { getSessions, deleteSession } from "../hooks/useSession";

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
}

export default function SessionManager({ onLoad, onClose }) {
    const [sessions, setSessions] = useState(getSessions);
    const [confirmId, setConfirmId] = useState(null);

    function handleDelete(id) {
        if (confirmId === id) {
            deleteSession(id);
            setSessions(getSessions());
            setConfirmId(null);
        } else {
            setConfirmId(id);
            setTimeout(() => setConfirmId(null), 3000);
        }
    }

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: "#111", border: "0.5px solid #242424", borderRadius: 16,
                width: "min(560px, 92vw)", maxHeight: "80vh", display: "flex", flexDirection: "column",
                overflow: "hidden",
            }}>
                {/* header */}
                <div style={{
                    padding: "18px 20px", borderBottom: "0.5px solid #1e1e1e",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Saved sessions</div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                            {sessions.length} session{sessions.length !== 1 ? "s" : ""} saved locally
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", color: "#555", fontSize: 20,
                        cursor: "pointer", lineHeight: 1, padding: "4px 8px",
                    }}>✕</button>
                </div>

                {/* list */}
                <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
                    {sessions.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: "#333", fontSize: 14 }}>
                            No saved sessions yet.<br />
                            <span style={{ fontSize: 12, color: "#2a2a2a" }}>Sessions are saved automatically as you work.</span>
                        </div>
                    ) : sessions.map(s => (
                        <div key={s.id} style={{
                            background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10,
                            padding: "12px 14px", marginBottom: 8,
                            display: "flex", alignItems: "center", gap: 12,
                        }}>
                            {/* icon */}
                            <div style={{
                                width: 40, height: 40, borderRadius: 10, background: "#1a1a1a",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 18, flexShrink: 0,
                            }}>🎮</div>

                            {/* info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: 14, fontWeight: 600, color: "#fff",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                }}>
                                    {s.title}
                                </div>
                                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                                    {s.genre && (
                                        <span style={{
                                            fontSize: 10, padding: "1px 7px", borderRadius: 10,
                                            background: "#1f1500", color: "#FFD600", border: "0.5px solid #FFD600"
                                        }}>
                                            {s.genre}
                                        </span>
                                    )}
                                    <span style={{ fontSize: 11, color: "#444" }}>{timeAgo(s.savedAt)}</span>
                                    {/* show which stages are complete */}
                                    {["report", "competitorData", "trendsData", "gddData", "levelDesignData", "gameCodeData"]
                                        .filter(k => s.data[k])
                                        .map(k => ({
                                            report: "Analysis", competitorData: "Competitors", trendsData: "Trends",
                                            gddData: "GDD", levelDesignData: "Levels", gameCodeData: "Game",
                                        }[k]))
                                        .map(label => (
                                            <span key={label} style={{
                                                fontSize: 10, padding: "1px 7px", borderRadius: 10,
                                                background: "#0a2010", color: "#4ade80", border: "0.5px solid #4ade80"
                                            }}>
                                                ✓ {label}
                                            </span>
                                        ))
                                    }
                                </div>
                            </div>

                            {/* actions */}
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                <button onClick={() => onLoad(s)} className="btn btn-primary"
                                    style={{ fontSize: 12, padding: "6px 14px" }}>
                                    Load
                                </button>
                                <button onClick={() => handleDelete(s.id)}
                                    style={{
                                        fontSize: 12, padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                                        background: confirmId === s.id ? "#ff6b6b22" : "none",
                                        border: `0.5px solid ${confirmId === s.id ? "#ff6b6b" : "#2a2a2a"}`,
                                        color: confirmId === s.id ? "#ff6b6b" : "#444",
                                    }}>
                                    {confirmId === s.id ? "Sure?" : "✕"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* footer */}
                <div style={{
                    padding: "12px 20px", borderTop: "0.5px solid #1e1e1e",
                    fontSize: 11, color: "#333", textAlign: "center"
                }}>
                    Sessions are stored in your browser's localStorage · not synced to the cloud
                </div>
            </div>
        </div>
    );
}