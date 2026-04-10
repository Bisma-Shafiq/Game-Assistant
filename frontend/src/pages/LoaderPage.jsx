import { useEffect } from "react";
import AgentSidebar from "../components/AgentSidebar";

const LOGS = [
    { t: 400, msg: "SequentialAgent: pipeline started", color: "#555" },
    { t: 650, msg: "ParallelAgent: 3 agents launched", color: "#FFD600" },
    { t: 800, msg: "MechanicsAgent → started", color: "#FFD600" },
    { t: 850, msg: "BalanceAgent → started", color: "#ff6b6b" },
    { t: 900, msg: "CompetitorAgent + Tavily → started", color: "#4ade80" },
    { t: 4000, msg: "Gemini: streaming 3 parallel calls...", color: "#555" },
];

export default function LoaderPage({ gameIdea, agents, logs, pushLog }) {
    useEffect(() => {
        const timers = LOGS.map(({ t, msg, color }) =>
            setTimeout(() => pushLog(msg, color), t)
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="page">
            <nav className="nav">
                <span className="nav-logo">
                    <span className="nav-logo-icon">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <rect x="2" y="2" width="6" height="6" rx="1.5" fill="#0a0a0a" />
                            <rect x="10" y="2" width="6" height="6" rx="1.5" fill="#0a0a0a" />
                            <rect x="2" y="10" width="6" height="6" rx="1.5" fill="#0a0a0a" />
                            <rect x="10" y="10" width="6" height="6" rx="1.5" fill="#0a0a0a" />
                        </svg>
                    </span>
                    Prompt2Play
                </span>
            </nav>

            <div style={{ display: "flex", minHeight: "calc(100vh - 58px)" }}>
                <AgentSidebar agents={agents} logs={logs} />

                {/* Center — clean prompt + spinner only */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ textAlign: "center", maxWidth: 500 }}>

                        {/* Spinner */}
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #1e1e1e", borderTopColor: "#FFD600", animation: "spin 0.9s linear infinite" }} />
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 10 }}>
                            Analyzing your idea...
                        </div>

                        {/* Idea quote */}
                        {gameIdea && (
                            <div style={{ fontSize: 14, color: "#444", fontStyle: "italic", lineHeight: 1.6, marginBottom: 20, padding: "0 20px" }}>
                                "{gameIdea.slice(0, 100)}{gameIdea.length > 100 ? "..." : ""}"
                            </div>
                        )}

                        {/* Hint */}
                        <div style={{ fontSize: 12, color: "#2e2e2e" }}>
                            Agent activity visible in the sidebar
                        </div>
                    </div>
                </div>
            </div>

            <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        </div>
    );
}