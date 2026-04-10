import { useEffect } from "react";
import AgentSidebar from "../components/AgentSidebar";

const TIMING = {
  mechanics: { start: 600, end: 6000 },
  balance: { start: 600, end: 7200 },
  competitor: { start: 600, end: 8400 },
};

const LOGS = [
  { t: 400, msg: "SequentialAgent: pipeline started", color: "#555" },
  { t: 650, msg: "ParallelAgent: 3 agents launched", color: "#FFD600" },
  { t: 800, msg: "MechanicsAgent → started", color: "#FFD600" },
  { t: 850, msg: "BalanceAgent → started", color: "#ff6b6b" },
  { t: 900, msg: "CompetitorAgent + Tavily → started", color: "#4ade80" },
  { t: 4000, msg: "Gemini: streaming from 3 parallel calls...", color: "#555" },
  { t: 6000, msg: "MechanicsAgent → done", color: "#FFD600" },
  { t: 7200, msg: "BalanceAgent → done", color: "#ff6b6b" },
  { t: 8400, msg: "CompetitorAgent → done", color: "#4ade80" },
  { t: 8700, msg: "ParallelAgent: all 3 complete", color: "#555" },
  { t: 9000, msg: "SynthesisAgent → merging outputs...", color: "#aaa" },
  { t: 11000, msg: "SynthesisAgent → report ready", color: "#aaa" },
];

const Logo = () => (
  <span className="nav-logo">
    <span className="nav-logo-icon">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1.5" fill="#0a0a0a" />
        <rect x="10" y="2" width="6" height="6" rx="1.5" fill="#0a0a0a" />
        <rect x="2" y="10" width="6" height="6" rx="1.5" fill="#0a0a0a" />
        <rect x="10" y="10" width="6" height="6" rx="1.5" fill="#0a0a0a" />
      </svg>
    </span>
    Level Zero
  </span>
);

export default function LoaderPage({ gameIdea, agents, logs }) {
  useEffect(() => {
    // log only — agent state is driven by App.jsx
    const timers = LOGS.map(({ t, msg, color }) =>
      setTimeout(() => pushLog(msg, color), t)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="page">
      <nav className="nav"><Logo /></nav>
      <div style={{ display: "flex", flex: 1 }}>
        <AgentSidebar agents={agents} logs={logs} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #222", borderTopColor: "#FFD600", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
            <div style={{ fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Analyzing your idea...</div>
            {gameIdea && <div style={{ fontSize: 13, color: "#555", fontStyle: "italic", maxWidth: 400 }}>"{gameIdea.slice(0, 90)}{gameIdea.length > 90 ? "..." : ""}"</div>}
            <div style={{ fontSize: 12, color: "#333", marginTop: 16 }}>Follow progress in the sidebar →</div>
          </div>
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        </div>
      </div>
    </div>
  );
}