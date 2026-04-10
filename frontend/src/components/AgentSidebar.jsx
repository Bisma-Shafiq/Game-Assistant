const STATUS_COLOR = {
    idle: "#333",
    running: "#FFD600",
    done: "#4ade80",
    error: "#ff6b6b",
};

function AgentRow({ agent }) {
    const { label, status, detail, time } = agent;
    const color = STATUS_COLOR[status] ?? "#555";

    return (
        <div style={{
            padding: "10px 14px",
            borderBottom: "0.5px solid #1a1a1a",
            opacity: status === "idle" ? 0.35 : 1,
            transition: "opacity 0.3s",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <div style={{ flexShrink: 0 }}>
                    {status === "done" && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="6" fill="#0a2010" stroke="#4ade80" strokeWidth="1" />
                            <path d="M4 7l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                    {status === "running" && (
                        <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #333", borderTopColor: "#FFD600", animation: "spin 0.7s linear infinite" }} />
                    )}
                    {status === "error" && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="6" fill="#2a0808" stroke="#ff6b6b" strokeWidth="1" />
                            <path d="M7 4v3M7 9.5v.5" stroke="#ff6b6b" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    )}
                    {status === "idle" && (
                        <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid #333" }} />
                    )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: status === "idle" ? "#444" : "#fff" }}>
                    {label}
                </span>
                {time && status === "done" && (
                    <span style={{ fontSize: 10, color: "#444", marginLeft: "auto" }}>{time}s</span>
                )}
            </div>
            {detail && (
                <div style={{ fontSize: 11, color, paddingLeft: 22, lineHeight: 1.4 }}>{detail}</div>
            )}
        </div>
    );
}

export default function AgentSidebar({ agents, logs }) {
    return (
        <aside style={{
            width: 220,
            flexShrink: 0,
            background: "#0d0d0d",
            borderRight: "0.5px solid #1e1e1e",
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100vh - 58px)",
        }}>
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>

            {/* Header */}
            <div style={{ padding: "14px 14px 10px", borderBottom: "0.5px solid #1e1e1e" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Agent activity
                </div>
            </div>

            {/* Agent rows */}
            <div style={{ flex: 1 }}>
                {agents.map((a, i) => <AgentRow key={i} agent={a} />)}
            </div>

            {/* Live log */}
            {logs.length > 0 && (
                <div style={{ borderTop: "0.5px solid #1e1e1e" }}>
                    <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Log
                    </div>
                    <div style={{ padding: "0 14px 12px", maxHeight: 160, overflowY: "auto" }}>
                        {logs.slice(-20).map((l, i) => (
                            <div key={i} style={{ fontSize: 10, fontFamily: "monospace", color: l.color ?? "#444", padding: "2px 0", lineHeight: 1.4 }}>
                                {l.msg}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}