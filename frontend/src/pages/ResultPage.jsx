import { useState, useRef, useEffect } from "react";
import { saveSession } from "../hooks/useSession";
import { exportPDF, exportGDDPDF, exportLevelDesignPDF, competitorDeepDive, trendAnalysis, generateGDD, generateLevelDesign, generateGameCode, generateUnityCode, generateGodotCode, downloadUnityZip, downloadGodotZip, fetchSocialTrends, checkIpSafety } from "../api/analyze";
import AgentSidebar from "../components/AgentSidebar";
import LevelMap from "../components/LevelMap";
import ShareButton from "../components/ShareButton";
// import UnityMCPPanel from "../components/UnityMCPPanel";

const SCORE_COLOR = n => n >= 70 ? "#4ade80" : n >= 40 ? "#FFD600" : "#ff6b6b";
const SEV_CLASS = s => ({ high: "badge-high", medium: "badge-medium", low: "badge-low" })[s?.toLowerCase()] ?? "badge-dark";
const SEV_COLOR = s => ({ high: "#ff6b6b", medium: "#FFD600", low: "#4ade80" })[s?.toLowerCase()] ?? "#555";
const IMPACT_COLOR = s => ({ positive: "#4ade80", negative: "#ff6b6b", neutral: "#FFD600" })[s?.toLowerCase()] ?? "#888";
const CHURN_COLOR = { low: "#4ade80", medium: "#FFD600", high: "#ff6b6b" };

const AVATARS = [
  { bg: "#FFD600", color: "#0a0a0a", border: "none" },
  { bg: "#1c1c1c", color: "#FFD600", border: "1px solid #FFD600" },
  { bg: "#1c1c1c", color: "#fff", border: "0.5px solid #333" },
];

const RISK_CONFIG = {
  Low: { color: "#4ade80", bg: "#0a2010", border: "#4ade80", icon: "🟢", label: "Low IP Risk" },
  Medium: { color: "#FFD600", bg: "#1f1500", border: "#FFD600", icon: "🟡", label: "Medium IP Risk" },
  High: { color: "#ff6b6b", bg: "#1a0500", border: "#ff6b6b", icon: "🔴", label: "High IP Risk" },
  Critical: { color: "#ff2d55", bg: "#1a0008", border: "#ff2d55", icon: "🚨", label: "Critical IP Risk — Action Required" },
};

function initials(t) { return (t || "??").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase(); }

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #222", borderTopColor: "#FFD600", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#555" }}>Fetching live data...</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function RunButton({ title, sub, onClick, error }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 16, color: "#ccc", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>{sub}</div>
      <button className="btn btn-primary" onClick={onClick}>{title} →</button>
      {error && <p style={{ color: "#ff6b6b", marginTop: 16, fontSize: 13 }}>{error}</p>}
    </div>
  );
}

// ── IP SAFETY BANNER ──────────────────────────────────────────────────────────
function IpSafetyBanner({ data, loading }) {
  const [expanded, setExpanded] = useState(false);
  if (loading) return (
    <div style={{ background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #333", borderTopColor: "#FFD600", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "#555" }}>Running IP safety check...</span>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
  if (!data) return null;
  const cfg = RISK_CONFIG[data.overall_risk] ?? RISK_CONFIG.Low;
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }} onClick={() => setExpanded(p => !p)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{cfg.icon}</span>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
            <span style={{ fontSize: 12, color: "#555", marginLeft: 10 }}>{data.risk_summary?.split(".")[0]}.</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {(data.safe_title_suggestions || []).length > 0 && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#0d0d0d", color: "#FFD600", border: "0.5px solid #FFD600" }}>
              {data.safe_title_suggestions.length} title suggestions
            </span>
          )}
          <span style={{ fontSize: 11, color: "#555" }}>{expanded ? "▲ Hide" : "▼ Details"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `0.5px solid ${cfg.border}22` }}>
          {(data.title_risks || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Title risks</div>
              {data.title_risks.map((t, i) => (
                <div key={i} style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, fontWeight: 700, background: SEV_COLOR(t.severity) + "22", color: SEV_COLOR(t.severity), border: `0.5px solid ${SEV_COLOR(t.severity)}` }}>{t.severity?.toUpperCase()}</span>
                    <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{t.issue}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Conflicts with: <span style={{ color: "#ff6b6b" }}>{t.example}</span></div>
                  <div style={{ fontSize: 12, color: "#4ade80" }}>Fix: {t.fix}</div>
                </div>
              ))}
            </div>
          )}
          {(data.store_policy_risks || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Store policy risks</div>
              {data.store_policy_risks.map((s, i) => (
                <div key={i} style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 8, padding: "10px 12px", marginBottom: 6, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", alignItems: "start" }}>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, fontWeight: 700, background: "#0a1828", color: "#4fc3f7", border: "0.5px solid #4fc3f7", gridRow: "1 / 3", alignSelf: "center" }}>{s.platform}</span>
                  <span style={{ fontSize: 13, color: "#fff" }}>{s.policy}</span>
                  <span style={{ fontSize: 12, color: "#555" }}>{s.reason} → <span style={{ color: "#4ade80" }}>{s.fix}</span></span>
                </div>
              ))}
            </div>
          )}
          {(data.safe_title_suggestions || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Safe title alternatives</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.safe_title_suggestions.map((t, i) => (
                  <span key={i} style={{ fontSize: 13, padding: "5px 14px", borderRadius: 20, fontWeight: 600, background: "#FFD60022", color: "#FFD600", border: "1px solid #FFD600", cursor: "default" }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {(data.clearance_checklist || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Pre-launch checklist</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {data.clearance_checklist.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0", fontSize: 12, color: "#888" }}>
                    <span style={{ color: "#333", flexShrink: 0, marginTop: 1 }}>☐</span>
                    <span>{c.item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.legal_disclaimer && (
            <div style={{ marginTop: 14, fontSize: 11, color: "#333", fontStyle: "italic" }}>⚖️ {data.legal_disclaimer}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function ResultNav({ r, onReset, sessionData }) {
  return (
    <nav className="result-nav">
      <div className="result-meta">
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
        <div style={{ width: 1, height: 20, background: "#242424" }} />
        <span className="result-title">{r.game_title}</span>
        <span className="badge badge-yellow" style={{ fontSize: 11 }}>{r.genre}</span>
        <span className="badge badge-dark" style={{ fontSize: 11 }}>{r.session_length}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ShareButton sessionData={sessionData} />
        <button className="btn btn-primary" onClick={onReset}>+ New idea</button>
      </div>
    </nav>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ r, onPDF, exporting, ipData, ipLoading }) {
  return (
    <div className="tab-content">
      <IpSafetyBanner data={ipData} loading={ipLoading} />
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Balance score</div><div className="metric-value" style={{ color: SCORE_COLOR(r.balance_score) }}>{r.balance_score}<span style={{ fontSize: 15, color: "#333" }}>/100</span></div></div>
        <div className="metric"><div className="metric-label">Mechanics</div><div className="metric-value">{r.mechanics.length}</div></div>
        <div className="metric"><div className="metric-label">Risk flags</div><div className="metric-value" style={{ color: "#FFD600" }}>{r.balance_flags.length}</div></div>
        <div className="metric"><div className="metric-label">Competitors</div><div className="metric-value">{r.competitors.length}</div></div>
      </div>
      <div className="two-col">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Core loop</div>
          <p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.75, marginBottom: 20 }}>{r.core_loop}</p>
          <div className="section-label">Mechanics</div>
          {r.mechanics.map((m, i) => (
            <div className="mech-row" key={i}>
              <div className="mech-dot" />
              <span className="mech-name">{m.name}</span>
              <span className="mech-desc">{m.player_action}</span>
            </div>
          ))}
        </div>
        <div className="right-col">
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="section-label">Balance</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: SCORE_COLOR(r.balance_score) }}>{r.balance_score}</div>
              <div style={{ flex: 1 }}>
                <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${r.balance_score}%`, background: SCORE_COLOR(r.balance_score) }} /></div>
                <div style={{ fontSize: 12, color: "#555" }}>{r.balance_summary.split(".")[0]}</div>
              </div>
            </div>
            {r.balance_flags.map((f, i) => (
              <div className="risk-row" key={i}>
                <span className={`badge ${SEV_CLASS(f.severity)}`} style={{ fontSize: 11, flexShrink: 0 }}>{f.severity?.toUpperCase().slice(0, 3)}</span>
                <span style={{ fontSize: 14, color: "#e0e0e0" }}>{f.risk}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="section-label">Competitors</div>
            {r.competitors.map((c, i) => (
              <div className="comp-row" key={i}>
                <div className="comp-avatar" style={{ background: AVATARS[i % 3].bg, color: AVATARS[i % 3].color, border: AVATARS[i % 3].border }}>{initials(c.title)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>
                    {c.store_url ? <a href={c.store_url} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "underline", textDecorationColor: "#444" }}>{c.title}</a> : c.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.similarity}</div>
                </div>
                <span className="comp-tag">similar</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ height: 14 }} />
      <div className="verdict-box">
        <div className="section-label" style={{ color: "#FFD600", marginBottom: 10 }}>Our take</div>
        <p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.8 }}>
          {r.verdict.split(". ").map((s, i, arr) =>
            i >= arr.length - 2
              ? <span key={i} style={{ color: "#FFD600", fontWeight: 500 }}>{s}{i < arr.length - 1 ? ". " : ""}</span>
              : <span key={i}>{s}. </span>
          )}
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onPDF} disabled={exporting}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 9.5L3.5 6H6V1h2v5h2.5L7 9.5Z" fill="currentColor" /><path d="M2 11.5h10V13H2v-1.5Z" fill="currentColor" /></svg>
          {exporting ? "Generating..." : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

// ── REPORT ────────────────────────────────────────────────────────────────────
function Report({ r }) {
  return (
    <div className="tab-content">
      <div className="card"><div className="section-label">Core loop</div><p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.75 }}>{r.core_loop}</p></div>
      <div className="card">
        <div className="section-label">Core mechanics</div>
        {r.mechanics.map((m, i) => (
          <div key={i} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: i < r.mechanics.length - 1 ? "0.5px solid #1e1e1e" : "none" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#FFD600", marginBottom: 4 }}>{m.name}</div>
            <p style={{ fontSize: 13, color: "#bbb", marginBottom: 4, lineHeight: 1.6 }}>{m.description}</p>
            <p style={{ fontSize: 12, color: "#555", fontStyle: "italic" }}>Player does: {m.player_action}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="section-label">Balance scorecard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: SCORE_COLOR(r.balance_score) }}>{r.balance_score}</div>
          <div style={{ flex: 1 }}>
            <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${r.balance_score}%`, background: SCORE_COLOR(r.balance_score) }} /></div>
            <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>{r.balance_summary}</p>
          </div>
        </div>
        {r.balance_flags.map((f, i) => (
          <div key={i} className="flag-card" style={{ borderColor: SEV_COLOR(f.severity), marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{f.risk}</span>
              <span className={`badge ${SEV_CLASS(f.severity)}`} style={{ fontSize: 11 }}>{f.severity}</span>
            </div>
            <p style={{ fontSize: 13, color: "#888" }}>{f.recommendation}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="section-label">Competitor landscape</div>
        {r.competitors.map((c, i) => (
          <div key={i} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: i < r.competitors.length - 1 ? "0.5px solid #1e1e1e" : "none" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#FFD600", marginBottom: 6 }}>
              {c.store_url ? <a href={c.store_url} target="_blank" rel="noopener noreferrer" style={{ color: "#FFD600", textDecoration: "underline", textDecorationColor: "#7a6800" }}>{c.title}</a> : c.title}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Similar</div><p style={{ fontSize: 13, color: "#bbb" }}>{c.similarity}</p></div>
              <div><div style={{ fontSize: 10, color: "#FFD600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Your edge</div><p style={{ fontSize: 13, color: "#bbb" }}>{c.differentiator}</p></div>
            </div>
          </div>
        ))}
      </div>
      <div className="verdict-box">
        <div className="section-label" style={{ color: "#FFD600", marginBottom: 10 }}>Our take</div>
        <p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.8 }}>{r.verdict}</p>
      </div>
    </div>
  );
}

// ── COMPETITORS ───────────────────────────────────────────────────────────────
function Competitors({ r, setAgent, pushLog, data, setData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    setAgent("comp-deep", { label: "Competitor deep dive", status: "running", detail: "Searching Play Store live..." });
    pushLog("CompetitorDeepDiveAgent → started", "#FFD600");
    try {
      const result = await competitorDeepDive(r.game_title, r.genre);
      setData(result);
      setAgent("comp-deep", { status: "done", detail: `${result.competitors.length} competitors found` });
      pushLog("CompetitorDeepDiveAgent → done", "#4ade80");
    } catch (e) {
      setError(e.message);
      setAgent("comp-deep", { status: "error", detail: "Search failed" });
    } finally { setLoading(false); }
  }
  if (!data && !loading) return <div className="tab-content"><RunButton title="Run competitor deep dive" sub="Live search for ratings, downloads, revenue tier & market gaps" onClick={load} error={error} /></div>;
  if (loading) return <div className="tab-content"><Spinner /></div>;
  const topGrossing = data.competitors.filter(c => c.revenue_tier === "Top Grossing").length;
  const ratings = data.competitors.map(c => parseFloat(c.rating)).filter(n => !isNaN(n));
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
  return (
    <div className="tab-content">
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Found</div><div className="metric-value">{data.competitors.length}</div></div>
        <div className="metric"><div className="metric-label">Top grossing</div><div className="metric-value" style={{ color: "#FFD600" }}>{topGrossing}</div></div>
        <div className="metric"><div className="metric-label">Avg rating</div><div className="metric-value" style={{ color: "#4ade80" }}>{avgRating}</div></div>
        <div className="metric"><div className="metric-label">Market gap</div><div className="metric-value" style={{ color: "#4ade80", fontSize: 18 }}>Detected</div></div>
      </div>
      {data.competitors.map((c, i) => (
        <div key={i} style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 14, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: AVATARS[i % 3].bg, color: AVATARS[i % 3].color, border: AVATARS[i % 3].border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{initials(c.title)}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 5 }}>{c.title}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: c.revenue_tier === "Top Grossing" ? "#1f1500" : "#1a1a1a", color: c.revenue_tier === "Top Grossing" ? "#FFD600" : "#888", border: `0.5px solid ${c.revenue_tier === "Top Grossing" ? "#FFD600" : "#333"}`, fontWeight: 600 }}>{c.revenue_tier}</span>
              {c.rating !== "Unknown" && <span style={{ fontSize: 12, color: "#4ade80" }}>★ {c.rating}</span>}
              {c.downloads !== "Unknown" && <span style={{ fontSize: 12, color: "#888" }}>{c.downloads}</span>}
              <span style={{ fontSize: 12, color: "#555" }}>{c.platform}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 120 }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your edge</div>
            <div style={{ fontSize: 12, color: "#4ade80", lineHeight: 1.4 }}>{c.weakness}</div>
          </div>
        </div>
      ))}
      <div className="verdict-box" style={{ marginTop: 4 }}>
        <div className="section-label" style={{ color: "#FFD600", marginBottom: 10 }}>Market summary</div>
        <p style={{ fontSize: 14, color: "#FFD600", fontWeight: 500, lineHeight: 1.7 }}>{data.market_summary}</p>
      </div>
    </div>
  );
}

// ── TRENDS ────────────────────────────────────────────────────────────────────
function Trends({ r, setAgent, pushLog, data, setData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    setAgent("trend", { label: "Trend analysis agent", status: "running", detail: "Searching genre trends..." });
    pushLog("TrendAgent → started", "#FFD600");
    try {
      const result = await trendAnalysis(r.game_title, r.genre);
      setData(result);
      setAgent("trend", { status: "done", detail: `${result.trend_direction} trend detected` });
      pushLog("TrendAgent → done", "#4ade80");
    } catch (e) {
      setError(e.message);
      setAgent("trend", { status: "error", detail: "Analysis failed" });
    } finally { setLoading(false); }
  }
  if (!data && !loading) return <div className="tab-content"><RunButton title="Run trend analysis" sub="Live search for genre growth, demographics & monetization patterns" onClick={load} error={error} /></div>;
  if (loading) return <div className="tab-content"><Spinner /></div>;
  const dirColor = { Growing: "#4ade80", Stable: "#FFD600", Declining: "#ff6b6b" }[data.trend_direction] ?? "#888";
  const dirArrow = { Growing: "▲", Stable: "→", Declining: "▼" }[data.trend_direction] ?? "~";
  return (
    <div className="tab-content">
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 12, marginBottom: 16, alignItems: "start" }}>
        <div style={{ background: "#111", border: `2px solid ${dirColor}`, borderRadius: 12, padding: "14px 24px", textAlign: "center", minWidth: 110 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: dirColor }}>{dirArrow}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: dirColor }}>{data.trend_direction}</div>
        </div>
        <div className="metric"><div className="metric-label">Market size</div><div className="metric-value" style={{ fontSize: 20 }}>{data.current_market_size}</div></div>
        <div className="metric"><div className="metric-label">Peak year</div><div className="metric-value" style={{ fontSize: 20 }}>{data.peak_year}</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Top regions</div>
          {data.top_regions.map((reg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < data.top_regions.length - 1 ? "0.5px solid #1a1a1a" : "none" }}>
              <span style={{ fontSize: 13, color: "#ccc" }}>{i + 1}. {reg}</span>
              <div style={{ width: 70 }}><div style={{ height: 5, background: "#1e1e1e", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", background: "#FFD600", borderRadius: 3, width: `${Math.max(30, 100 - i * 18)}%` }} /></div></div>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Key trends</div>
          {data.key_trends.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 0", borderBottom: i < data.key_trends.length - 1 ? "0.5px solid #1a1a1a" : "none" }}>
              <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: IMPACT_COLOR(t.impact) + "22", color: IMPACT_COLOR(t.impact), fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                {t.impact === "positive" ? "+" : t.impact === "negative" ? "—" : "~"}
              </span>
              <div>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{t.trend}</div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.4, marginTop: 2 }}>{t.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="section-label">Best monetization for this genre</div>
        <p style={{ fontSize: 14, color: "#ccc" }}>{data.monetization_trend}</p>
      </div>
      <div className="verdict-box">
        <div className="section-label" style={{ color: "#FFD600", marginBottom: 10 }}>Recommendation</div>
        <p style={{ fontSize: 14, color: "#FFD600", fontWeight: 500, lineHeight: 1.7 }}>{data.recommendation}</p>
      </div>
    </div>
  );
}

// ── GDD ───────────────────────────────────────────────────────────────────────
function GDD({ r, setAgent, pushLog, onConfirm, data, setData }) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => { if (data && !draft) setDraft(JSON.parse(JSON.stringify(data))); }, [data]);

  async function load() {
    setLoading(true); setError("");
    setAgent("gdd", { label: "GDD generator agent", status: "running", detail: "Writing game design document..." });
    pushLog("GDDAgent → started", "#FFD600");
    try {
      const result = await generateGDD(r);
      setData(result); setDraft(JSON.parse(JSON.stringify(result)));
      setAgent("gdd", { status: "done", detail: "GDD ready for download" });
      pushLog("GDDAgent → done", "#4ade80");
    } catch (e) {
      setError(e.message);
      setAgent("gdd", { status: "error", detail: "Generation failed" });
      pushLog("GDDAgent → error", "#ff6b6b");
    } finally { setLoading(false); }
  }

  async function handleExport() {
    setExporting(true);
    try { await exportGDDPDF(draft || data); }
    catch (e) { alert("PDF failed: " + e.message); }
    finally { setExporting(false); }
  }

  function handleSave() { setData(JSON.parse(JSON.stringify(draft))); setEditMode(false); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000); }
  function handleDiscard() { setDraft(JSON.parse(JSON.stringify(data))); setEditMode(false); }
  function setField(path, val) {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = val;
      return next;
    });
  }

  if (!data && !loading) return <div className="tab-content"><RunButton title="Generate GDD" sub="Full game design document — mechanics, monetization, retention, technical plan & risks" onClick={load} error={error} /></div>;
  if (loading) return <div className="tab-content"><Spinner /></div>;

  const d = editMode ? draft : (draft || data);
  const ov = d.overview || {}, gp = d.gameplay || {}, mon = d.monetization || {}, ret = d.retention || {}, tec = d.technical || {};

  const Field = ({ label, path, value }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
      {editMode
        ? <textarea value={value || ""} onChange={e => setField(path, e.target.value)} rows={2} style={{ width: "100%", background: "#0d0d0d", border: "1px solid #FFD600", borderRadius: 6, color: "#fff", fontSize: 13, padding: "6px 9px", lineHeight: 1.5, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        : <div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.6 }}>{value}</div>
      }
    </div>
  );

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          {editMode
            ? <input value={d.title || ""} onChange={e => setField("title", e.target.value)} style={{ fontSize: 20, fontWeight: 600, background: "transparent", border: "none", borderBottom: "1px solid #FFD600", color: "#FFD600", outline: "none", width: 300 }} />
            : <div style={{ fontSize: 20, fontWeight: 600, color: "#FFD600" }}>{d.title}</div>
          }
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{d.version} · {d.date}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {savedFlash && <span style={{ fontSize: 12, color: "#4ade80" }}>✓ Saved</span>}
          {editMode ? (
            <><button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSave}>✓ Save changes</button><button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={handleDiscard}>✕ Discard</button></>
          ) : (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditMode(true)}>✏️ Edit GDD</button>
          )}
          <button className="btn btn-ghost" onClick={handleExport} disabled={exporting}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 9.5L3.5 6H6V1h2v5h2.5L7 9.5Z" fill="currentColor" /><path d="M2 11.5h10V13H2v-1.5Z" fill="currentColor" /></svg>
            {exporting ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>
      {editMode && <div style={{ background: "#1a1000", border: "1px solid #FFD600", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#FFD600", display: "flex", alignItems: "center", gap: 8 }}>✏️ Edit mode — click any field to change it. Press <strong>Save changes</strong> when done.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Overview</div>
          <Field label="Concept" path="overview.concept" value={ov.concept} />
          <Field label="Vision" path="overview.vision" value={ov.vision} />
          <Field label="Target audience" path="overview.target_audience" value={ov.target_audience} />
          <Field label="Platform" path="overview.platform" value={ov.platform} />
          <Field label="Art style" path="overview.art_style" value={ov.art_style} />
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Gameplay</div>
          <Field label="Core loop" path="gameplay.core_loop" value={gp.core_loop} />
          <Field label="Session structure" path="gameplay.session_structure" value={gp.session_structure} />
          <Field label="Controls" path="gameplay.controls" value={gp.controls} />
          <Field label="Progression" path="gameplay.progression" value={gp.progression} />
          <Field label="Difficulty curve" path="gameplay.difficulty_curve" value={gp.difficulty_curve} />
        </div>
      </div>
      <div className="card">
        <div className="section-label">Mechanics</div>
        {(d.mechanics || []).map((m, i) => (
          <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < d.mechanics.length - 1 ? "0.5px solid #1e1e1e" : "none" }}>
            {editMode
              ? <input value={m.name} onChange={e => { const n = JSON.parse(JSON.stringify(draft)); n.mechanics[i].name = e.target.value; setDraft(n); }} style={{ fontSize: 15, fontWeight: 600, background: "transparent", border: "none", borderBottom: "1px solid #FFD600", color: "#FFD600", outline: "none", width: "100%", marginBottom: 8 }} />
              : <div style={{ fontSize: 15, fontWeight: 600, color: "#FFD600", marginBottom: 6 }}>{m.name}</div>
            }
            {editMode
              ? <textarea value={m.description} rows={2} onChange={e => { const n = JSON.parse(JSON.stringify(draft)); n.mechanics[i].description = e.target.value; setDraft(n); }} style={{ width: "100%", background: "#0d0d0d", border: "1px solid #333", borderRadius: 6, color: "#ccc", fontSize: 13, padding: "6px 9px", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              : <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.6, marginBottom: 6 }}>{m.description}</p>
            }
            <p style={{ fontSize: 13, color: "#4ade80", marginBottom: 4 }}>Why it's fun: {m.player_benefit}</p>
            <p style={{ fontSize: 12, color: "#555", fontStyle: "italic" }}>Technical: {m.implementation_notes}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Monetization</div>
          <Field label="Model" path="monetization.model" value={mon.model} />
          <Field label="Ads strategy" path="monetization.ads_strategy" value={mon.ads_strategy} />
          <Field label="Battle pass" path="monetization.battle_pass" value={mon.battle_pass} />
          <Field label="F2P protection" path="monetization.anti_whale_measures" value={mon.anti_whale_measures} />
          {(mon.iap_items || []).length > 0 && <>
            <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, marginTop: 10 }}>IAP items</div>
            {mon.iap_items.map((item, i) => editMode
              ? <input key={i} value={item} onChange={e => { const n = JSON.parse(JSON.stringify(draft)); n.monetization.iap_items[i] = e.target.value; setDraft(n); }} style={{ display: "block", width: "100%", background: "#0d0d0d", border: "1px solid #333", borderRadius: 6, color: "#ccc", fontSize: 13, padding: "5px 8px", marginBottom: 4, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              : <div key={i} style={{ fontSize: 13, color: "#ccc", padding: "3px 0" }}>• {item}</div>
            )}
          </>}
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Retention</div>
          <Field label="Day 1 hook" path="retention.day1" value={ret.day1} />
          <Field label="Day 7 hook" path="retention.day7" value={ret.day7} />
          <Field label="Day 30 hook" path="retention.day30" value={ret.day30} />
          <Field label="Social features" path="retention.social_features" value={ret.social_features} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Technical plan</div>
          <Field label="Engine" path="technical.engine" value={tec.engine} />
          <Field label="Team size" path="technical.team_size" value={tec.team_size} />
          <Field label="Timeline" path="technical.development_time" value={tec.development_time} />
          <Field label="MVP scope" path="technical.mvp_scope" value={tec.mvp_scope} />
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Risks &amp; mitigations</div>
          {(d.risks || []).map((risk, i) => (
            <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < d.risks.length - 1 ? "0.5px solid #1e1e1e" : "none" }}>
              {editMode ? (
                <>
                  <input value={risk.risk} onChange={e => { const n = JSON.parse(JSON.stringify(draft)); n.risks[i].risk = e.target.value; setDraft(n); }} style={{ display: "block", width: "100%", background: "#0d0d0d", border: "1px solid #333", borderRadius: 6, color: "#ff6b6b", fontSize: 13, fontWeight: 500, padding: "5px 8px", marginBottom: 4, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  <input value={risk.mitigation} onChange={e => { const n = JSON.parse(JSON.stringify(draft)); n.risks[i].mitigation = e.target.value; setDraft(n); }} style={{ display: "block", width: "100%", background: "#0d0d0d", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 12, padding: "5px 8px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </>
              ) : (
                <><div style={{ fontSize: 13, fontWeight: 500, color: "#ff6b6b", marginBottom: 3 }}>{risk.risk}</div><div style={{ fontSize: 12, color: "#888" }}>{risk.mitigation}</div></>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="verdict-box">
        <div className="section-label" style={{ color: "#FFD600", marginBottom: 10 }}>Launch strategy</div>
        {editMode
          ? <textarea value={d.launch_strategy || ""} rows={3} onChange={e => setField("launch_strategy", e.target.value)} style={{ width: "100%", background: "#0d0d0d", border: "1px solid #FFD600", borderRadius: 8, color: "#ccc", fontSize: 14, padding: "10px 12px", resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }} />
          : <p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.8 }}>{d.launch_strategy}</p>
        }
      </div>
      <div style={{ marginTop: 16, padding: "22px 28px", background: "#111", border: "2px solid #FFD600", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 5 }}>Ready to move forward?</div>
          <div style={{ fontSize: 13, color: "#555" }}>{editMode ? "Save your edits first, then confirm." : "Confirm this GDD to unlock the Level Design generator"}</div>
        </div>
        <button className="btn btn-primary" style={{ padding: "13px 32px", fontSize: 15 }} onClick={() => onConfirm(draft || data)} disabled={editMode}>Confirm GDD &amp; Design Levels →</button>
      </div>
    </div>
  );
}

// ── LEVEL DESIGN ──────────────────────────────────────────────────────────────
function LevelDesign({ r, gddData, setAgent, pushLog, onConfirm, data, setData }) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [activeLevel, setActiveLevel] = useState(0);

  async function load() {
    setLoading(true); setError("");
    setAgent("level-design", { label: "Level design agent", status: "running", detail: "Generating level structure..." });
    pushLog("LevelDesignAgent → started", "#FFD600");
    try {
      const result = await generateLevelDesign(r, gddData);
      setData(result);
      setAgent("level-design", { status: "done", detail: `${result.levels?.length || 0} levels designed` });
      pushLog("LevelDesignAgent → done", "#4ade80");
    } catch (e) {
      setError(e.message);
      setAgent("level-design", { status: "error", detail: "Generation failed" });
      pushLog("LevelDesignAgent → error", "#ff6b6b");
    } finally { setLoading(false); }
  }

  async function handleExport() {
    setExporting(true);
    try { await exportLevelDesignPDF(data); }
    catch (e) { alert("PDF failed: " + e.message); }
    finally { setExporting(false); }
  }

  if (!data && !loading) return <div className="tab-content"><RunButton title="Generate level design" sub="10 fully designed levels · difficulty curve · churn flags · isometric maps" onClick={load} error={error} /></div>;
  if (loading) return <div className="tab-content"><Spinner /></div>;

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#FFD600" }}>Level Design Plan</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{data.levels?.length} levels · {data.worlds?.length} worlds</div>
        </div>
        <button className="btn btn-ghost" onClick={handleExport} disabled={exporting}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 9.5L3.5 6H6V1h2v5h2.5L7 9.5Z" fill="currentColor" /><path d="M2 11.5h10V13H2v-1.5Z" fill="currentColor" /></svg>
          {exporting ? "Generating..." : "Download PDF"}
        </button>
      </div>
      <div className="card">
        <div className="section-label">Level maps — isometric view</div>
        <LevelMap levels={data.levels || []} activeIdx={activeLevel} onSelect={setActiveLevel} gameTitle={r.game_title} genre={r.genre} />
      </div>
      <div className="card">
        <div className="section-label">World structure</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
          {(data.worlds || []).map((w, i) => (
            <div key={i} style={{ background: "#111", border: `0.5px solid ${i === 0 ? "#FFD600" : "#1e1e1e"}`, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? "#FFD600" : "#1a1a1a", color: i === 0 ? "#0a0a0a" : "#555", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{w.number}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? "#fff" : "#555" }}>{w.name}</span>
              </div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{w.theme}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#1a1a1a", color: "#555", border: "0.5px solid #2a2a2a" }}>{w.level_count} levels</span>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#0a2010", color: "#4ade80", border: "0.5px solid #4ade80" }}>{w.new_mechanic}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Difficulty curve</div>
          {(data.difficulty_curve || []).map((d, i) => {
            const lv = data.levels?.find(l => l.number === d.level);
            const col = d.score < 35 ? "#4ade80" : d.score < 65 ? "#FFD600" : "#ff6b6b";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "#555", width: 14, textAlign: "right", flexShrink: 0 }}>{d.level}</span>
                <div style={{ flex: 1, height: 16, background: "#111", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${d.score}%`, background: col, borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 5 }}>
                    {d.score > 15 && <span style={{ fontSize: 9, color: "#0a0a0a", fontWeight: 700 }}>{d.score}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: "#333", width: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{lv?.name || ""}</span>
              </div>
            );
          })}
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Mechanic introduction schedule</div>
          {(data.mechanic_schedule || []).map((m, i) => {
            const ic = { tutorial: "#4ade80", soft: "#FFD600", hard: "#ff6b6b" }[m.introduction_type] ?? "#888";
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: i < data.mechanic_schedule.length - 1 ? "0.5px solid #1a1a1a" : "none" }}>
                <div style={{ width: 28, height: 20, borderRadius: 4, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#FFD600", flexShrink: 0, border: "0.5px solid #2a2a2a" }}>L{m.level}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{m.mechanic}</span>
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: ic + "22", color: ic, fontWeight: 700 }}>{m.introduction_type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#555", lineHeight: 1.3 }}>{m.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="section-label">All levels at a glance</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
          {(data.levels || []).map((lv, i) => {
            const cc = CHURN_COLOR[lv.churn_risk] || "#333";
            return (
              <div key={i} onClick={() => setActiveLevel(i)} style={{ background: "#111", borderLeft: `3px solid ${cc}`, borderRadius: "0 8px 8px 0", padding: "8px 12px", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"}
                onMouseLeave={e => e.currentTarget.style.background = "#111"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <div><span style={{ fontSize: 10, color: "#FFD600", fontWeight: 700, marginRight: 5 }}>#{lv.number}</span><span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{lv.name}</span></div>
                  <div style={{ width: 30, height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${lv.difficulty}%`, background: lv.difficulty < 35 ? "#4ade80" : lv.difficulty < 65 ? "#FFD600" : "#ff6b6b", borderRadius: 2 }} /></div>
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>{lv.primary_mechanic}{lv.onboarding_note ? " · Tutorial" : ""}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Onboarding sequence</div>
          {[["Level 1", data.onboarding_sequence?.level1], ["Level 2", data.onboarding_sequence?.level2], ["Level 3", data.onboarding_sequence?.level3]].map(([label, val], i) => val && (
            <div key={i} style={{ padding: "8px 0", borderBottom: "0.5px solid #1a1a1a" }}>
              <div style={{ fontSize: 10, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>{val}</div>
            </div>
          ))}
          {data.onboarding_sequence?.philosophy && (
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Philosophy</div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{data.onboarding_sequence.philosophy}</div>
            </div>
          )}
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Churn risk flags</div>
          {(data.churn_flags || []).length === 0 && <div style={{ fontSize: 13, color: "#555" }}>No high-risk churn points detected</div>}
          {(data.churn_flags || []).map((f, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: i < data.churn_flags.length - 1 ? "0.5px solid #1a1a1a" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: (CHURN_COLOR[f.risk] || "#888") + "22", color: CHURN_COLOR[f.risk] || "#888", border: `0.5px solid ${CHURN_COLOR[f.risk] || "#888"}` }}>L{f.level} {f.risk?.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: "#ccc" }}>{f.reason}</span>
              </div>
              <div style={{ fontSize: 12, color: "#4ade80" }}>Fix: {f.fix}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="verdict-box">
        <div className="section-label" style={{ color: "#FFD600", marginBottom: 10 }}>Designer notes</div>
        <p style={{ fontSize: 14, color: "#FFD600", fontWeight: 500, lineHeight: 1.75 }}>{data.designer_notes}</p>
      </div>
      <div style={{ marginTop: 16, padding: "22px 28px", background: "#111", border: "2px solid #FFD600", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 5 }}>Ready to build?</div>
          <div style={{ fontSize: 13, color: "#555" }}>Confirm this level design to unlock the Game Code generator</div>
        </div>
        <button className="btn btn-primary" style={{ padding: "13px 32px", fontSize: 15 }} onClick={() => onConfirm(data)}>Confirm &amp; Generate Game →</button>
      </div>
    </div>
  );
}

// ── GAME CODE ─────────────────────────────────────────────────────────────────
function GameCode({ r, gddData, levelDesignData, setAgent, pushLog, data, setData }) {
  const [engine, setEngine] = useState("html");
  const [htmlData, setHtmlData] = useState(data?.html ? data : null);
  const [unityData, setUnityData] = useState(data?.unity || null);
  const [godotData, setGodotData] = useState(data?.godot || null);
  const [loading, setLoading] = useState({ html: false, unity: false, godot: false });
  const [errors, setErrors] = useState({ html: "", unity: "", godot: "" });
  const [view, setView] = useState("preview");
  const [editorCode, setEditorCode] = useState(data?.html?.html || "");
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activeScript, setActiveScript] = useState(0);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: "assistant", text: "Hi! Describe the bug and I'll fix the game code." }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (data?.html && !editorCode) { setEditorCode(data.html.html); setView("preview"); }
    if (data?.html) setHtmlData(data.html);
    if (data?.unity) setUnityData(data.unity);
    if (data?.godot) setGodotData(data.godot);
  }, [data]);

  function persist(key, val) { setData(prev => ({ ...(prev || {}), [key]: val })); }

  async function generateHtml() {
    setLoading(p => ({ ...p, html: true })); setErrors(p => ({ ...p, html: "" }));
    setAgent("game-code", { label: "HTML5 game agent", status: "running", detail: "Generating HTML5 prototype..." });
    pushLog("HTML5Agent → started", "#FFD600");
    try {
      const result = await generateGameCode(r, gddData, levelDesignData);
      setHtmlData(result); setEditorCode(result.html); setView("preview");
      persist("html", result);
      setAgent("game-code", { status: "done", detail: "HTML5 prototype ready" });
      pushLog("HTML5Agent → done", "#4ade80");
    } catch (e) {
      setErrors(p => ({ ...p, html: e.message }));
      setAgent("game-code", { status: "error", detail: "Generation failed" });
    } finally { setLoading(p => ({ ...p, html: false })); }
  }

  async function generateUnity() {
    setLoading(p => ({ ...p, unity: true })); setErrors(p => ({ ...p, unity: "" }));
    setAgent("unity-code", { label: "Unity code agent", status: "running", detail: "Writing C# scripts..." });
    pushLog("UnityAgent → started", "#FFD600");
    try {
      const result = await generateUnityCode(r, gddData, levelDesignData);
      setUnityData(result); setActiveScript(0);
      persist("unity", result);
      setAgent("unity-code", { status: "done", detail: `${result.scripts.length} scripts generated` });
      pushLog("UnityAgent → done", "#4ade80");
    } catch (e) {
      setErrors(p => ({ ...p, unity: e.message }));
      setAgent("unity-code", { status: "error", detail: "Generation failed" });
    } finally { setLoading(p => ({ ...p, unity: false })); }
  }

  async function generateGodot() {
    setLoading(p => ({ ...p, godot: true })); setErrors(p => ({ ...p, godot: "" }));
    setAgent("godot-code", { label: "Godot code agent", status: "running", detail: "Writing GDScript files..." });
    pushLog("GodotAgent → started", "#FFD600");
    try {
      const result = await generateGodotCode(r, gddData, levelDesignData);
      setGodotData(result); setActiveScript(0);
      persist("godot", result);
      setAgent("godot-code", { status: "done", detail: `${result.scripts.length} scripts generated` });
      pushLog("GodotAgent → done", "#4ade80");
    } catch (e) {
      setErrors(p => ({ ...p, godot: e.message }));
      setAgent("godot-code", { status: "error", detail: "Generation failed" });
    } finally { setLoading(p => ({ ...p, godot: false })); }
  }

  function handleHtmlDownload() {
    const blob = new Blob([editorCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(htmlData?.game_title || "game").replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click(); URL.revokeObjectURL(url);
  }

  function handleHtmlCopy() {
    navigator.clipboard.writeText(editorCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function handleScriptCopy(content) {
    navigator.clipboard.writeText(content).then(() => { setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2000); });
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim(); setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch("http://localhost:8000/ai-fix-game", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: editorCode, message: userMsg }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ detail: "Server error" })); throw new Error(e.detail); }
      const json = await res.json();
      const raw = json.result || "";
      const split = raw.split("---EXPLANATION---");
      const fixedHtml = split[0].trim();
      const explanation = split[1]?.trim() || "Code updated.";
      if (fixedHtml.startsWith("<!DOCTYPE") || fixedHtml.startsWith("<html")) {
        setEditorCode(fixedHtml); setPreviewKey(k => k + 1);
        setChatMessages(prev => [...prev,
        { role: "assistant", text: `✅ Fixed! ${explanation}` },
        { role: "assistant", text: "Preview updated. Switch to Preview to test.", action: "preview" }
        ]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", text: raw }]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", text: `Error: ${e.message}` }]);
    } finally { setChatLoading(false); }
  }

  const EngineBtn = ({ id, label, color }) => (
    <button onClick={() => setEngine(id)} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `2px solid ${engine === id ? color : "#2a2a2a"}`, background: engine === id ? color + "22" : "#111", color: engine === id ? color : "#555", transition: "all 0.15s" }}>{label}</button>
  );

  const ScriptViewer = ({ scripts, engineColor, onDownload }) => {
    const active = scripts[activeScript] || scripts[0];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12, height: 560 }}>
        <div style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 12px", borderBottom: "0.5px solid #1e1e1e", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Files ({scripts.length})</div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {scripts.map((s, i) => (
              <div key={i} onClick={() => setActiveScript(i)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, background: i === activeScript ? engineColor + "22" : "transparent", borderLeft: `2px solid ${i === activeScript ? engineColor : "transparent"}`, color: i === activeScript ? "#fff" : "#555", display: "flex", alignItems: "center", gap: 6 }}
                onMouseEnter={e => { if (i !== activeScript) e.currentTarget.style.background = "#1a1a1a"; }}
                onMouseLeave={e => { if (i !== activeScript) e.currentTarget.style.background = "transparent"; }}>
                <span>{s.filename.endsWith(".cs") ? "🔷" : "🟦"}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.filename}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 10, borderTop: "0.5px solid #1e1e1e" }}>
            <button onClick={onDownload} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>⬇ Download .zip</button>
          </div>
        </div>
        <div style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {["#ff6b6b", "#FFD600", "#4ade80"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
              <span style={{ fontSize: 12, color: "#555", marginLeft: 4 }}>{active?.path}</span>
            </div>
            <button onClick={() => handleScriptCopy(active?.content || "")} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>{scriptCopied ? "✓ Copied" : "Copy"}</button>
          </div>
          <pre style={{ flex: 1, overflowY: "auto", margin: 0, padding: "14px 16px", fontSize: 12, lineHeight: 1.65, color: "#e0e0e0", fontFamily: "'Courier New', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {active?.content || ""}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="tab-content">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>Choose output format:</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <EngineBtn id="html" label="🎮 HTML5 Prototype" color="#FFD600" />
          <EngineBtn id="unity" label="🔷 Unity 2021 LTS C#" color="#4fc3f7" />
          <EngineBtn id="godot" label="🟦 Godot 4 GDScript" color="#7c4dff" />
        </div>
      </div>

      {/* ════ HTML5 ════ */}
      {engine === "html" && (
        <>
          {!htmlData && !loading.html
            ? <RunButton title="Generate HTML5 prototype" sub="Instant playable game in browser — great for quick playtesting" onClick={generateHtml} error={errors.html} />
            : loading.html ? <Spinner /> : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#FFD600" }}>{htmlData.game_title}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>HTML5 · Canvas · 5 levels</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["preview", "editor", "chat"].map(v => (
                      <button key={v} onClick={() => setView(v)} className={view === v ? "btn btn-primary" : "btn btn-ghost"} style={{ fontSize: 12, padding: "7px 14px" }}>
                        {{ preview: "▶ Preview", editor: "✏️ Edit", chat: "🤖 AI Fix" }[v]}
                      </button>
                    ))}
                    <div style={{ width: 1, background: "#2a2a2a" }} />
                    <button className="btn btn-ghost" onClick={handleHtmlCopy} style={{ fontSize: 12 }}>{copied ? "✓" : "Copy"}</button>
                    <button className="btn btn-primary" onClick={handleHtmlDownload} style={{ fontSize: 12 }}>⬇ .html</button>
                  </div>
                </div>
                {view === "preview" && (
                  <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
                    <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
                      {["#ff6b6b", "#FFD600", "#4ade80"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
                      <span style={{ fontSize: 11, color: "#555", marginLeft: 8 }}>Live preview</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#333" }}>Bug? Use ✏️ Edit or 🤖 AI Fix</span>
                    </div>
                    <iframe key={previewKey} srcDoc={editorCode} style={{ width: "100%", height: 560, border: "none", display: "block", background: "#0a0a0a" }} title="Game preview" sandbox="allow-scripts allow-same-origin" />
                  </div>
                )}
                {view === "editor" && (
                  <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
                    <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#555" }}>game.html</span>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => { setPreviewKey(k => k + 1); setView("preview"); }}>▶ Apply & Preview</button>
                    </div>
                    <textarea value={editorCode} onChange={e => setEditorCode(e.target.value)} spellCheck={false}
                      style={{ width: "100%", height: 540, display: "block", background: "#0d0d0d", color: "#e0e0e0", fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.6, border: "none", outline: "none", padding: 16, resize: "none", boxSizing: "border-box" }} />
                  </div>
                )}
                {view === "chat" && (
                  <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14, display: "flex", flexDirection: "column", height: 520 }}>
                    <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #1e1e1e", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: "#FFD600", display: "flex", alignItems: "center", justifyContent: "center" }}>🤖</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>AI Game Debugger</div>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {chatMessages.map((m, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "78%", padding: "8px 12px", fontSize: 13, lineHeight: 1.5, borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.role === "user" ? "#FFD600" : "#1a1a1a", color: m.role === "user" ? "#0a0a0a" : "#ccc", border: m.role === "assistant" ? "0.5px solid #2a2a2a" : "none" }}>
                            {m.text}
                            {m.action === "preview" && <button onClick={() => setView("preview")} style={{ display: "block", marginTop: 6, background: "#FFD600", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Switch to Preview →</button>}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div style={{ display: "flex", gap: 5 }}>
                          {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFD600", animation: `bounce 0.9s ${i * 0.15}s infinite` }} />)}
                          <style>{"@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}"}</style>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div style={{ padding: "8px 12px", borderTop: "0.5px solid #1e1e1e", display: "flex", gap: 8, flexShrink: 0 }}>
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChatMessage()} placeholder="Describe the bug…"
                        style={{ flex: 1, background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 13, padding: "8px 12px", outline: "none" }} />
                      <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()} className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px" }}>Send</button>
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="card" style={{ marginBottom: 0 }}><div className="section-label">How to play</div><p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{htmlData.controls}</p></div>
                  <div className="card" style={{ marginBottom: 0 }}><div className="section-label">What was built</div><p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{htmlData.tech_notes}</p></div>
                </div>
              </>
            )
          }
        </>
      )}

      {/* ════ UNITY ════ */}
      {engine === "unity" && (
        <>
          {!unityData && !loading.unity
            ? <RunButton title="Generate Unity 2021 LTS C# scripts" sub="Production-ready C# scripts · object pooling · state machines · downloadable .zip" onClick={generateUnity} error={errors.unity} />
            : loading.unity ? <Spinner /> : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#4fc3f7" }}>{unityData.game_title}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{unityData.engine} · {unityData.scripts.length} scripts</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(unityData.packages || []).map(p => (
                      <span key={p} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#0a1828", color: "#4fc3f7", border: "0.5px solid #4fc3f7" }}>{p}</span>
                    ))}
                  </div>
                </div>

                <ScriptViewer scripts={unityData.scripts} engineColor="#4fc3f7" onDownload={() => downloadUnityZip(unityData)} />

                {/* ── Unity MCP Panel — live build in Unity Editor ── */}
                {/* <UnityMCPPanel
                  report={r}
                  gdd={gddData}
                  levelDesign={levelDesignData}
                /> */}

                <div className="card" style={{ marginTop: 12 }}>
                  <div className="section-label">Architecture</div>
                  <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{unityData.architecture_notes}</p>
                </div>
                <div className="card" style={{ marginTop: 12, borderColor: "#4fc3f7" }}>
                  <div className="section-label" style={{ color: "#4fc3f7" }}>Setup guide (SETUP.md)</div>
                  <pre style={{ fontSize: 12, color: "#888", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", maxHeight: 300, overflowY: "auto" }}>{unityData.setup_md}</pre>
                </div>
              </>
            )
          }
        </>
      )}

      {/* ════ GODOT ════ */}
      {engine === "godot" && (
        <>
          {!godotData && !loading.godot
            ? <RunButton title="Generate Godot 4 GDScript files" sub="Production-ready GDScript · typed variables · signals · downloadable .zip" onClick={generateGodot} error={errors.godot} />
            : loading.godot ? <Spinner /> : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#7c4dff" }}>{godotData.game_title}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{godotData.engine} · {godotData.scripts.length} scripts</div>
                  </div>
                </div>
                <ScriptViewer scripts={godotData.scripts} engineColor="#7c4dff" onDownload={() => downloadGodotZip(godotData)} />
                <div className="card" style={{ marginTop: 12 }}><div className="section-label">Architecture</div><p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{godotData.architecture_notes}</p></div>
                <div className="card" style={{ marginTop: 12, borderColor: "#7c4dff" }}>
                  <div className="section-label" style={{ color: "#7c4dff" }}>Setup guide (SETUP.md)</div>
                  <pre style={{ fontSize: 12, color: "#888", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", maxHeight: 300, overflowY: "auto" }}>{godotData.setup_md}</pre>
                </div>
              </>
            )
          }
        </>
      )}

      <div className="verdict-box" style={{ marginTop: 16 }}>
        <div className="section-label" style={{ color: "#FFD600", marginBottom: 10 }}>Next steps</div>
        <p style={{ fontSize: 14, color: "#FFD600", fontWeight: 500, lineHeight: 1.75 }}>
          {engine === "html" && "Download the .html file and open it in any browser to playtest instantly."}
          {engine === "unity" && "Scripts generated above. Use 🔮 Build in Unity to push them directly into your open Unity Editor."}
          {engine === "godot" && "Download the .zip, open Godot 4, copy the scripts folder in, configure autoloads, and follow SETUP.md."}
        </p>
      </div>
    </div>
  );
}

// ── SOCIAL TRENDS ─────────────────────────────────────────────────────────────
function Social({ r, setAgent, pushLog, data, setData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState("all");

  async function load() {
    setLoading(true); setError("");
    setAgent("social", { label: "Social trends agent", status: "running", detail: "Scraping TikTok, YouTube, Facebook..." });
    pushLog("SocialAgent → started", "#FFD600");
    try {
      const result = await fetchSocialTrends(r.game_title, r.genre, r.game_title);
      setData(result);
      setAgent("social", { status: "done", detail: `${result.total_videos} creatives found` });
      pushLog("SocialAgent → done", "#4ade80");
    } catch (e) {
      setError(e.message);
      setAgent("social", { status: "error", detail: "Scraping failed" });
      pushLog("SocialAgent → error", "#ff6b6b");
    } finally { setLoading(false); }
  }

  if (!data && !loading) return <div className="tab-content"><RunButton title="Scrape social media trends" sub="Live TikTok videos · YouTube trailers · Facebook game ads — powered by Apify" onClick={load} error={error} /></div>;

  if (loading) return (
    <div className="tab-content">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #222", borderTopColor: "#FFD600", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 13, color: "#555" }}>Scraping TikTok, YouTube & Facebook Ads...</div>
        <div style={{ fontSize: 11, color: "#333" }}>This may take 20–40 seconds</div>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    </div>
  );

  const ins = data.insights || {};
  const buzzColor = { Low: "#555", Medium: "#FFD600", High: "#4ade80", Viral: "#ff6b6b" }[ins.overall_buzz] ?? "#555";
  const platformColor = { TikTok: "#ff2d55", YouTube: "#ff4444", "Facebook Ads": "#1877f2" };
  const platformIcon = { TikTok: "🎵", YouTube: "▶️", "Facebook Ads": "📘" };
  const allVideos = [...data.tiktok, ...data.youtube, ...data.facebook_ads];
  const filtered = platform === "all" ? allVideos : platform === "tiktok" ? data.tiktok : platform === "youtube" ? data.youtube : data.facebook_ads;

  function formatViews(n) {
    if (!n) return "—";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  return (
    <div className="tab-content">
      <div className="metric-grid" style={{ marginBottom: 16 }}>
        <div className="metric"><div className="metric-label">Total creatives</div><div className="metric-value">{data.total_videos}</div></div>
        <div className="metric"><div className="metric-label">Social buzz</div><div className="metric-value" style={{ color: buzzColor, fontSize: 20 }}>{ins.overall_buzz}</div></div>
        <div className="metric"><div className="metric-label">Best platform</div><div className="metric-value" style={{ fontSize: 16 }}>{platformIcon[ins.best_platform]} {ins.best_platform}</div></div>
        <div className="metric"><div className="metric-label">TikTok / YT / FB</div><div className="metric-value" style={{ fontSize: 18 }}>{data.tiktok.length} / {data.youtube.length} / {data.facebook_ads.length}</div></div>
      </div>
      <div className="verdict-box" style={{ marginBottom: 16 }}>
        <div className="section-label" style={{ color: buzzColor, marginBottom: 8 }}>{ins.overall_buzz} buzz · {ins.best_platform} is your best channel</div>
        <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7, marginBottom: 8 }}>{ins.buzz_summary}</p>
        <p style={{ fontSize: 13, color: "#888" }}>{ins.best_platform_reason}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Trending themes</div>
          {(ins.top_themes || []).map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < ins.top_themes.length - 1 ? "0.5px solid #1e1e1e" : "none" }}>
              <span style={{ fontSize: 14 }}>🔥</span><span style={{ fontSize: 13, color: "#ccc" }}>{t}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Ad hook ideas</div>
          {(ins.hook_ideas || []).map((h, i) => (
            <div key={i} style={{ padding: "7px 10px", marginBottom: 6, background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderLeft: "2px solid #FFD600", borderRadius: "0 6px 6px 0", fontSize: 13, color: "#FFD600", fontStyle: "italic", lineHeight: 1.4 }}>"{h}"</div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-label">Recommended hashtags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(ins.recommended_hashtags || []).map((h, i) => (
              <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#1f1500", color: "#FFD600", border: "0.5px solid #FFD600", fontWeight: 600 }}>#{h.replace(/^#/, "")}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Creative directions for your game</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {(ins.creative_directions || []).map((cd, i) => (
            <div key={i} style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, fontWeight: 700, marginBottom: 8, display: "inline-block", background: (platformColor[cd.platform] || "#555") + "22", color: platformColor[cd.platform] || "#555", border: `0.5px solid ${platformColor[cd.platform] || "#555"}` }}>{platformIcon[cd.platform]} {cd.platform}</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{cd.direction}</div>
              <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5, marginBottom: 6 }}>{cd.description}</p>
              <div style={{ fontSize: 11, color: "#555" }}>Inspired by: {cd.inspiration}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { id: "all", label: `All (${allVideos.length})`, color: "#FFD600" },
          { id: "tiktok", label: `🎵 TikTok (${data.tiktok.length})`, color: "#ff2d55" },
          { id: "youtube", label: `▶️ YouTube (${data.youtube.length})`, color: "#ff4444" },
          { id: "facebook", label: `📘 FB Ads (${data.facebook_ads.length})`, color: "#1877f2" },
        ].map(btn => (
          <button key={btn.id} onClick={() => setPlatform(btn.id)} style={{ padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, border: `1.5px solid ${platform === btn.id ? btn.color : "#2a2a2a"}`, background: platform === btn.id ? btn.color + "22" : "#111", color: platform === btn.id ? btn.color : "#555" }}>{btn.label}</button>
        ))}
      </div>
      {filtered.length === 0
        ? <div style={{ textAlign: "center", padding: "40px 0", color: "#333", fontSize: 14 }}>No results found.</div>
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {filtered.map((v, i) => {
              const col = platformColor[v.platform] || "#555";
              return (
                <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
                  <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = col}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e1e"}>
                    <div style={{ width: "100%", height: 160, background: "#0d0d0d", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {v.thumbnail ? <img src={v.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} /> : <span style={{ fontSize: 32 }}>{platformIcon[v.platform]}</span>}
                      <div style={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: col + "dd", color: "#fff" }}>{v.platform}</div>
                      {v.duration && <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "rgba(0,0,0,0.7)", color: "#fff" }}>{v.duration}</div>}
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{v.title || "Untitled"}</div>
                      <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>@{v.author}</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "#4ade80" }}>👁 {formatViews(v.views)}</span>
                        {v.likes > 0 && <span style={{ fontSize: 12, color: "#FFD600" }}>♥ {formatViews(v.likes)}</span>}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function ResultPage({ report: r, onReset, agents, setAgent, pushLog, logs, currentSessionId, setCurrentSessionId }) {
  const [tab, setTab] = useState("dashboard");
  const [exporting, setExporting] = useState(false);
  const [ipData, setIpData] = useState(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [competitorData, setCompetitorData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [socialData, setSocialData] = useState(null);
  const [gddData, setGddData] = useState(null);
  const [levelDesignData, setLevelDesignData] = useState(null);
  const [gameCodeData, setGameCodeData] = useState(null);
  const [levelUnlocked, setLevelUnlocked] = useState(false);
  const [gameUnlocked, setGameUnlocked] = useState(false);

  useEffect(() => {
    if (!r || ipData || ipLoading) return;
    setIpLoading(true);
    setAgent("ip-check", { label: "IP safety agent", status: "running", detail: "Checking trademarks & store policies..." });
    pushLog("IPSafetyAgent → started", "#FFD600");
    checkIpSafety(r)
      .then(result => {
        setIpData(result);
        const risk = result.overall_risk;
        const color = { Low: "#4ade80", Medium: "#FFD600", High: "#ff6b6b", Critical: "#ff2d55" }[risk] ?? "#4ade80";
        setAgent("ip-check", { status: "done", detail: `${risk} risk — ${result.title_risks?.length || 0} title issues` });
        pushLog(`IPSafetyAgent → ${risk} risk`, color);
      })
      .catch(err => {
        setAgent("ip-check", { status: "error", detail: "Check failed" });
        pushLog("IPSafetyAgent → error", "#ff6b6b");
        console.error("IP check failed:", err);
      })
      .finally(() => setIpLoading(false));
  }, [r]);

  useEffect(() => {
    if (!r) return;
    const id = saveSession(
      { report: r, competitorData, trendsData, socialData, gddData, levelDesignData, gameCodeData },
      currentSessionId
    );
    setCurrentSessionId(id);
  }, [r, competitorData, trendsData, gddData, levelDesignData, gameCodeData]);

  async function handlePDF() {
    setExporting(true);
    try { await exportPDF(r); }
    catch (e) { alert("PDF failed: " + e.message); }
    finally { setExporting(false); }
  }

  function handleGddConfirm(gdd) { setGddData(gdd); setLevelUnlocked(true); setTab("leveldesign"); }
  function handleLevelDesignConfirm(ld) { setLevelDesignData(ld); setGameUnlocked(true); setTab("gamecode"); }

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "report", label: "Full report" },
    { id: "competitors", label: "Competitors" },
    { id: "trends", label: "Trends" },
    { id: "social", label: "🔥 Social" },
    { id: "gdd", label: "GDD" },
    ...(levelUnlocked ? [{ id: "leveldesign", label: "⚡ Level Design" }] : []),
    ...(gameUnlocked ? [{ id: "gamecode", label: "🎮 Game Code" }] : []),
  ];

  return (
    <div className="page">
      <ResultNav r={r} onReset={onReset} sessionData={{ report: r, competitorData, trendsData, gddData, levelDesignData, gameCodeData }} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 58px)" }}>
        <AgentSidebar agents={agents} logs={logs} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div className="tab-bar">
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}
                style={t.id === "leveldesign" || t.id === "gamecode" ? { color: "#FFD600", opacity: tab === t.id ? 1 : 0.5 } : {}}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === "dashboard" && <Dashboard r={r} onPDF={handlePDF} exporting={exporting} ipData={ipData} ipLoading={ipLoading} />}
          {tab === "report" && <Report r={r} />}
          {tab === "competitors" && <Competitors r={r} setAgent={setAgent} pushLog={pushLog} data={competitorData} setData={setCompetitorData} />}
          {tab === "trends" && <Trends r={r} setAgent={setAgent} pushLog={pushLog} data={trendsData} setData={setTrendsData} />}
          {tab === "social" && <Social r={r} setAgent={setAgent} pushLog={pushLog} data={socialData} setData={setSocialData} />}
          {tab === "gdd" && <GDD r={r} setAgent={setAgent} pushLog={pushLog} onConfirm={handleGddConfirm} data={gddData} setData={setGddData} />}
          {tab === "leveldesign" && <LevelDesign r={r} gddData={gddData} setAgent={setAgent} pushLog={pushLog} onConfirm={handleLevelDesignConfirm} data={levelDesignData} setData={setLevelDesignData} />}
          {tab === "gamecode" && <GameCode r={r} gddData={gddData} levelDesignData={levelDesignData} setAgent={setAgent} pushLog={pushLog} data={gameCodeData} setData={setGameCodeData} />}
        </div>
      </div>
    </div>
  );
}