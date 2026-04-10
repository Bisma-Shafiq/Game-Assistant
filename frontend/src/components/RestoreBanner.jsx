export default function RestoreBanner({ session, onRestore, onDismiss }) {
    if (!session) return null;

    const stages = ["report", "competitorData", "trendsData", "gddData", "levelDesignData", "gameCodeData"]
        .filter(k => session.data[k]).length;

    return (
        <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 900, background: "#111", border: "1px solid #FFD600",
            borderRadius: 14, padding: "14px 20px", display: "flex",
            alignItems: "center", gap: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            maxWidth: "min(520px, 90vw)", width: "100%",
            animation: "slideUp 0.3s ease",
        }}>
            <style>{"@keyframes slideUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}"}</style>

            <div style={{ fontSize: 24, lineHeight: 1 }}>💾</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>
                    Resume <span style={{ color: "#FFD600" }}>{session.title}</span>?
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>
                    {stages} stage{stages !== 1 ? "s" : ""} completed · last saved {new Date(session.savedAt).toLocaleString()}
                </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={onRestore} className="btn btn-primary" style={{ fontSize: 12, padding: "7px 16px" }}>
                    Resume →
                </button>
                <button onClick={onDismiss} className="btn btn-ghost" style={{ fontSize: 12, padding: "7px 12px" }}>
                    Dismiss
                </button>
            </div>
        </div>
    );
}