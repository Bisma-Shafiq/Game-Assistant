import { useState, useCallback, useEffect } from "react";
import "./index.css";
import HomePage from "./pages/HomePage";
import LoaderPage from "./pages/LoaderPage";
import ResultPage from "./pages/ResultPage";
import LevelDesignPage from "./pages/LevelDesignPage";
import SharePage from "./pages/SharePage";
import SessionManager from "./components/SessionManager";
import RestoreBanner from "./components/RestoreBanner";
import { getAutoSave, clearCurrentSession, getSessions } from "./hooks/useSession";

// ── detect share URL on load ──────────────────────────────────────────────────
function getShareIdFromUrl() {
  const match = window.location.pathname.match(/^\/share\/([a-z0-9]+)$/i);
  return match ? match[1] : null;
}

export default function App() {
  const [screen, setScreen] = useState(() => getShareIdFromUrl() ? "share" : "home");
  const [shareId] = useState(getShareIdFromUrl);
  const [idea, setIdea] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const [agents, setAgents] = useState([]);
  const [logs, setLogs] = useState([]);

  // ── session state ─────────────────────────────────────────────────────────
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [autoSave, setAutoSave] = useState(null);
  const [showSessions, setShowSessions] = useState(false);

  // check for auto-save on first load
  useEffect(() => {
    const saved = getAutoSave();
    if (saved) setAutoSave(saved);
  }, []);

  // ── agent helpers ─────────────────────────────────────────────────────────
  const pushLog = useCallback((msg, color = "#555") => {
    setLogs(prev => [...prev, { msg, color }]);
  }, []);

  const setAgent = useCallback((id, patch) => {
    setAgents(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx === -1) return [...prev, { id, status: "idle", label: "", detail: "", time: null, ...patch }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, []);

  // ── restore a saved session ───────────────────────────────────────────────
  function handleRestore(session) {
    setReport(session.data.report);
    setCurrentSessionId(session.id);
    setAutoSave(null);
    setAgents([]);
    setLogs([]);
    setScreen("result");
  }

  // ── reset / new idea ──────────────────────────────────────────────────────
  function handleReset() {
    clearCurrentSession();
    setCurrentSessionId(null);
    setReport(null);
    setAgents([]);
    setLogs([]);
    setScreen("home");
  }

  // ── analyze submit ────────────────────────────────────────────────────────
  async function handleSubmit(gameIdea) {
    setIdea(gameIdea);
    setError("");
    setLogs([]);
    setCurrentSessionId(null); // new idea = new session
    setAgents([
      { id: "mechanics", label: "Mechanics agent", status: "idle", detail: "", time: null },
      { id: "balance", label: "Balance agent", status: "idle", detail: "", time: null },
      { id: "competitor", label: "Competitor agent", status: "idle", detail: "", time: null },
      { id: "synthesis", label: "Synthesis agent", status: "idle", detail: "", time: null },
    ]);
    setScreen("loading");

    setTimeout(() => {
      setAgent("mechanics", { status: "running", detail: "Extracting core loop & mechanics..." });
      setAgent("balance", { status: "running", detail: "Scoring balance & flagging risks..." });
      setAgent("competitor", { status: "running", detail: "Searching Play Store via Tavily..." });
      pushLog("ParallelAgent: 3 agents launched", "#00C8FF");
    }, 600);

    try {
      const { analyzeIdea } = await import("./api/analyze");

      setTimeout(() => { setAgent("mechanics", { status: "done", detail: "Saved to session state" }); pushLog("MechanicsAgent → done", "#FFD600"); }, 1000);
      setTimeout(() => { setAgent("balance", { status: "done", detail: "Saved to session state" }); pushLog("BalanceAgent → done", "#ff6b6b"); }, 1200);
      setTimeout(() => { setAgent("competitor", { status: "done", detail: "Saved to session state" }); pushLog("CompetitorAgent → done", "#4ade80"); }, 1400);
      setTimeout(() => { setAgent("synthesis", { status: "running", detail: "Merging all outputs..." }); pushLog("SynthesisAgent → merging...", "#aaa"); }, 1600);

      const result = await analyzeIdea(gameIdea);

      setAgent("synthesis", { status: "done", detail: "Final report ready" });
      pushLog("SynthesisAgent → done", "#aaa");

      setReport(result);
      setScreen("result");
    } catch (e) {
      setAgent("synthesis", { status: "error", detail: "Failed" });
      setError(e.message || "Something went wrong. Is the backend running?");
      setScreen("home");
    }
  }

  // ── screens ───────────────────────────────────────────────────────────────
  if (screen === "share") return (
    <SharePage
      shareId={shareId}
      onHome={() => { window.history.pushState({}, "", "/"); setScreen("home"); }}
    />
  );

  if (screen === "level-design") return (
    <LevelDesignPage onBack={() => setScreen("home")} />
  );

  if (screen === "loading") return (
    <LoaderPage gameIdea={idea} agents={agents} logs={logs} pushLog={pushLog} />
  );

  if (screen === "result") return (
    <>
      <ResultPage
        report={report}
        agents={agents}
        setAgent={setAgent}
        pushLog={pushLog}
        logs={logs}
        currentSessionId={currentSessionId}
        setCurrentSessionId={setCurrentSessionId}
        onReset={handleReset}
      />

      {/* sessions button — floats over result page */}
      <button
        onClick={() => setShowSessions(true)}
        className="btn btn-ghost"
        style={{ position: "fixed", bottom: 24, right: 24, fontSize: 12, zIndex: 800 }}
      >
        💾 Sessions ({getSessions().length})
      </button>

      {showSessions && (
        <SessionManager
          onLoad={s => { handleRestore(s); setShowSessions(false); }}
          onClose={() => setShowSessions(false)}
        />
      )}
    </>
  );

  // home screen
  return (
    <>
      <HomePage
        onSubmit={handleSubmit}
        error={error}
        onLevelDesign={() => setScreen("level-design")}
        onSessions={() => setShowSessions(true)}
      />

      {/* restore banner — shown on home screen if auto-save exists */}
      <RestoreBanner
        session={autoSave}
        onRestore={() => handleRestore(autoSave)}
        onDismiss={() => setAutoSave(null)}
      />

      {showSessions && (
        <SessionManager
          onLoad={s => { handleRestore(s); setShowSessions(false); }}
          onClose={() => setShowSessions(false)}
        />
      )}
    </>
  );
}