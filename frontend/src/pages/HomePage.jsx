import { useState } from "react";

const SEEDS = [
  "A mobile game where you play as a tax collector chasing citizens across a city",
  "An idle RPG where your hero levels up while you sleep, based on real sleep data",
  "A multiplayer trivia game where wrong answers shrink your character on screen",
];

export default function HomePage({ onSubmit, error }) {
  const [idea, setIdea] = useState("");
  const [model, setModel] = useState("gemini-3-flash-preview");

  const MODELS = [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", badge: "Fast", badgeColor: "#4ade80", desc: "Best speed, low token use" },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", badge: "Lightest", badgeColor: "#4ade80", desc: "Fastest, minimal tokens" },
    { id: "gemini-2.5-flash-preview-04-17", label: "Gemini 2.5 Flash", badge: "Balanced", badgeColor: "#FFD600", desc: "Smart + affordable" },
    { id: "gemini-2.5-flash-lite-preview", label: "Gemini 2.5 Flash Lite", badge: "Lite", badgeColor: "#FFD600", desc: "2.5 quality, lower cost" },
    { id: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro", badge: "Best", badgeColor: "#ff6b6b", desc: "Highest quality, more tokens" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", badge: "Stable", badgeColor: "#888", desc: "Proven, widely available" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", badge: "Pro", badgeColor: "#888", desc: "1.5 generation top tier" },
  ];

  function handleKey(e) {
    if (e.key === "Enter" && e.ctrlKey) submit();
  }

  function submit() {
    if (idea.trim()) onSubmit(idea.trim());
  }

  return (
    <div className="page">

      {/* Nav */}
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

      {/* Hero */}
      <div className="home-wrap">
        <h1 className="home-title">
          Turn your game idea into a<br />
          <span>full design report</span>
        </h1>
        <p className="home-sub">
          Three AI agents analyze your mechanics, balance risks, competitor and IP check
          landscape in parallel — full dashboard report in ~30 seconds.
        </p>

        <div className="home-card">
          <label>Your game idea</label>
          <textarea
            rows={5}
            placeholder="e.g. A battle royale where players shrink every 30 seconds and must collect power-ups to survive..."
            value={idea}
            onChange={e => setIdea(e.target.value)}
            onKeyDown={handleKey}
          />
          {error && (
            <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 10 }}>{error}</p>
          )}

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <button className="btn btn-primary" onClick={submit} style={{ padding: "11px 28px", fontSize: 15 }}>
              Analyze with AI →
            </button>
            <span style={{ fontSize: 13, color: "#444" }}>~30 sec · Ctrl+Enter</span>
          </div>
        </div>

        <div className="seeds-label">Try a seed idea</div>
        {SEEDS.map((s, i) => (
          <button key={i} className="seed-btn" onClick={() => setIdea(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}
