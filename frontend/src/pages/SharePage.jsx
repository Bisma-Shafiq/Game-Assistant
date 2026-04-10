import { useEffect, useState } from "react";
import { loadShare } from "../api/analyze";

// ── reusable card + field ─────────────────────────────────────────────────────
function Card({ label, children }) {
    return (
        <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: 16 }}>
            {label && <div style={{
                fontSize: 11, color: "#555", textTransform: "uppercase",
                letterSpacing: "0.05em", marginBottom: 10, fontWeight: 700
            }}>{label}</div>}
            {children}
        </div>
    );
}

function Field({ label, value }) {
    if (!value) return null;
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{
                fontSize: 11, color: "#555", textTransform: "uppercase",
                letterSpacing: "0.05em", marginBottom: 3
            }}>{label}</div>
            <div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.6 }}>{value}</div>
        </div>
    );
}

const SCORE_COLOR = n => n >= 70 ? "#4ade80" : n >= 40 ? "#FFD600" : "#ff6b6b";
const CHURN_COLOR = { low: "#4ade80", medium: "#FFD600", high: "#ff6b6b" };

// ── shared report view ────────────────────────────────────────────────────────
function SharedReport({ data }) {
    const r = data.report || {};
    const gdd = data.gddData || null;
    const ld = data.levelDesignData || null;
    const gc = data.gameCodeData || null;
    const [tab, setTab] = useState("report");

    const TABS = [
        { id: "report", label: "📊 Report" },
        ...(gdd ? [{ id: "gdd", label: "📄 GDD" }] : []),
        ...(ld ? [{ id: "leveldesign", label: "⚡ Level Design" }] : []),
        ...(gc ? [{ id: "gamecode", label: "🎮 Game Code" }] : []),
    ];

    return (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>

            {/* header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
                    📎 Shared via GDD.ai — read only
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#FFD600", marginBottom: 6 }}>
                    {r.game_title}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                        fontSize: 12, padding: "3px 10px", borderRadius: 20,
                        background: "#1f1500", color: "#FFD600", border: "0.5px solid #FFD600"
                    }}>{r.genre}</span>
                    <span style={{
                        fontSize: 12, padding: "3px 10px", borderRadius: 20,
                        background: "#1a1a1a", color: "#888", border: "0.5px solid #2a2a2a"
                    }}>{r.session_length}</span>
                    <span style={{
                        fontSize: 12, padding: "3px 10px", borderRadius: 20,
                        background: "#1a1a1a", color: "#888", border: "0.5px solid #2a2a2a"
                    }}>{r.monetization_model}</span>
                    {/* completion badges */}
                    {gdd && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#0a2010", color: "#4ade80", border: "0.5px solid #4ade80" }}>✓ GDD</span>}
                    {ld && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#0a2010", color: "#4ade80", border: "0.5px solid #4ade80" }}>✓ Level Design</span>}
                    {gc && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#0a2010", color: "#4ade80", border: "0.5px solid #4ade80" }}>✓ Game Code</span>}
                </div>
            </div>

            {/* tabs */}
            <div style={{ display: "flex", gap: 4, borderBottom: "0.5px solid #1e1e1e", marginBottom: 24 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
                            fontSize: 13, fontWeight: 500, color: tab === t.id ? "#FFD600" : "#555",
                            borderBottom: tab === t.id ? "2px solid #FFD600" : "2px solid transparent"
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── REPORT TAB ── */}
            {tab === "report" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                        {[
                            ["Balance", r.balance_score, SCORE_COLOR(r.balance_score)],
                            ["Mechanics", r.mechanics?.length, "#fff"],
                            ["Risk flags", r.balance_flags?.length, "#FFD600"],
                            ["Competitors", r.competitors?.length, "#fff"],
                        ].map(([label, val, color]) => (
                            <div key={label} style={{
                                background: "#111", border: "0.5px solid #1e1e1e",
                                borderRadius: 10, padding: "14px 16px", textAlign: "center"
                            }}>
                                <div style={{
                                    fontSize: 11, color: "#555", textTransform: "uppercase",
                                    letterSpacing: "0.05em", marginBottom: 6
                                }}>{label}</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color }}>{val}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Core loop</div>
                        <p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.75 }}>{r.core_loop}</p>
                    </div>

                    <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Mechanics</div>
                        {(r.mechanics || []).map((m, i) => (
                            <div key={i} style={{
                                paddingBottom: 12, marginBottom: 12,
                                borderBottom: i < r.mechanics.length - 1 ? "0.5px solid #1e1e1e" : "none"
                            }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#FFD600", marginBottom: 4 }}>{m.name}</div>
                                <p style={{ fontSize: 13, color: "#bbb", marginBottom: 3 }}>{m.description}</p>
                                <p style={{ fontSize: 12, color: "#555", fontStyle: "italic" }}>Player does: {m.player_action}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Balance flags</div>
                        {(r.balance_flags || []).map((f, i) => (
                            <div key={i} style={{
                                display: "flex", gap: 10, alignItems: "flex-start",
                                padding: "8px 0", borderBottom: i < r.balance_flags.length - 1 ? "0.5px solid #1e1e1e" : "none"
                            }}>
                                <span style={{
                                    fontSize: 11, padding: "2px 8px", borderRadius: 10, flexShrink: 0, fontWeight: 700,
                                    background: (f.severity === "high" ? "#ff6b6b" : f.severity === "medium" ? "#FFD600" : "#4ade80") + "22",
                                    color: f.severity === "high" ? "#ff6b6b" : f.severity === "medium" ? "#FFD600" : "#4ade80",
                                    border: `0.5px solid ${f.severity === "high" ? "#ff6b6b" : f.severity === "medium" ? "#FFD600" : "#4ade80"}`,
                                }}>{f.severity}</span>
                                <div>
                                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{f.risk}</div>
                                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{f.recommendation}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: "#111", border: "1px solid #FFD600", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 11, color: "#FFD600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Our take</div>
                        <p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.8 }}>{r.verdict}</p>
                    </div>
                </div>
            )}

            {/* ── GDD TAB ── */}
            {tab === "gdd" && gdd && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "#FFD600", marginBottom: 4 }}>{gdd.title}</div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>{gdd.version} · {gdd.date}</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Card label="Overview">
                            <Field label="Concept" value={gdd.overview?.concept} />
                            <Field label="Vision" value={gdd.overview?.vision} />
                            <Field label="Target audience" value={gdd.overview?.target_audience} />
                            <Field label="Platform" value={gdd.overview?.platform} />
                            <Field label="Art style" value={gdd.overview?.art_style} />
                        </Card>
                        <Card label="Gameplay">
                            <Field label="Core loop" value={gdd.gameplay?.core_loop} />
                            <Field label="Session structure" value={gdd.gameplay?.session_structure} />
                            <Field label="Controls" value={gdd.gameplay?.controls} />
                            <Field label="Progression" value={gdd.gameplay?.progression} />
                            <Field label="Difficulty curve" value={gdd.gameplay?.difficulty_curve} />
                        </Card>
                    </div>

                    <Card label="Mechanics">
                        {(gdd.mechanics || []).map((m, i) => (
                            <div key={i} style={{
                                paddingBottom: 14, marginBottom: 14,
                                borderBottom: i < gdd.mechanics.length - 1 ? "0.5px solid #1e1e1e" : "none"
                            }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#FFD600", marginBottom: 4 }}>{m.name}</div>
                                <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6, marginBottom: 4 }}>{m.description}</p>
                                <p style={{ fontSize: 12, color: "#4ade80" }}>Why it's fun: {m.player_benefit}</p>
                                <p style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>Technical: {m.implementation_notes}</p>
                            </div>
                        ))}
                    </Card>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Card label="Monetization">
                            <Field label="Model" value={gdd.monetization?.model} />
                            <Field label="Ads strategy" value={gdd.monetization?.ads_strategy} />
                            <Field label="Battle pass" value={gdd.monetization?.battle_pass} />
                            <Field label="F2P protection" value={gdd.monetization?.anti_whale_measures} />
                            {(gdd.monetization?.iap_items || []).map((item, i) =>
                                <div key={i} style={{ fontSize: 13, color: "#ccc", padding: "2px 0" }}>• {item}</div>
                            )}
                        </Card>
                        <Card label="Retention">
                            <Field label="Day 1 hook" value={gdd.retention?.day1} />
                            <Field label="Day 7 hook" value={gdd.retention?.day7} />
                            <Field label="Day 30 hook" value={gdd.retention?.day30} />
                            <Field label="Social features" value={gdd.retention?.social_features} />
                        </Card>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Card label="Technical plan">
                            <Field label="Engine" value={gdd.technical?.engine} />
                            <Field label="Team size" value={gdd.technical?.team_size} />
                            <Field label="Timeline" value={gdd.technical?.development_time} />
                            <Field label="MVP scope" value={gdd.technical?.mvp_scope} />
                        </Card>
                        <Card label="Risks">
                            {(gdd.risks || []).map((risk, i) => (
                                <div key={i} style={{
                                    paddingBottom: 8, marginBottom: 8,
                                    borderBottom: i < gdd.risks.length - 1 ? "0.5px solid #1e1e1e" : "none"
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#ff6b6b" }}>{risk.risk}</div>
                                    <div style={{ fontSize: 12, color: "#888" }}>{risk.mitigation}</div>
                                </div>
                            ))}
                        </Card>
                    </div>

                    <Card label="Launch strategy">
                        <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{gdd.launch_strategy}</p>
                    </Card>
                </div>
            )}

            {/* ── LEVEL DESIGN TAB ── */}
            {tab === "leveldesign" && ld && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                        {[
                            ["Levels", ld.levels?.length, "#fff"],
                            ["Worlds", ld.worlds?.length, "#FFD600"],
                            ["Churn flags", ld.churn_flags?.length, "#ff6b6b"],
                        ].map(([label, val, color]) => (
                            <div key={label} style={{
                                background: "#111", border: "0.5px solid #1e1e1e",
                                borderRadius: 10, padding: "14px 16px", textAlign: "center"
                            }}>
                                <div style={{
                                    fontSize: 11, color: "#555", textTransform: "uppercase",
                                    letterSpacing: "0.05em", marginBottom: 6
                                }}>{label}</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color }}>{val}</div>
                            </div>
                        ))}
                    </div>

                    {/* worlds */}
                    <Card label="World structure">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                            {(ld.worlds || []).map((w, i) => (
                                <div key={i} style={{
                                    background: "#0d0d0d", border: `0.5px solid ${i === 0 ? "#FFD600" : "#1e1e1e"}`,
                                    borderRadius: 8, padding: "10px 12px"
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? "#FFD600" : "#555", marginBottom: 4 }}>
                                        World {w.number} — {w.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{w.theme}</div>
                                    <span style={{
                                        fontSize: 10, padding: "2px 7px", borderRadius: 10,
                                        background: "#0a2010", color: "#4ade80", border: "0.5px solid #4ade80"
                                    }}>{w.new_mechanic}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* levels list */}
                    <Card label="All levels">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
                            {(ld.levels || []).map((lv, i) => {
                                const cc = CHURN_COLOR[lv.churn_risk] || "#333";
                                const diffCol = lv.difficulty < 35 ? "#4ade80" : lv.difficulty < 65 ? "#FFD600" : "#ff6b6b";
                                return (
                                    <div key={i} style={{
                                        background: "#0d0d0d", borderLeft: `3px solid ${cc}`,
                                        borderRadius: "0 8px 8px 0", padding: "8px 12px"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                            <div>
                                                <span style={{ fontSize: 10, color: "#FFD600", fontWeight: 700, marginRight: 5 }}>#{lv.number}</span>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{lv.name}</span>
                                            </div>
                                            <span style={{ fontSize: 10, color: diffCol, fontWeight: 700 }}>{lv.difficulty}/100</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{lv.objective}</div>
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            <span style={{
                                                fontSize: 10, padding: "1px 6px", borderRadius: 8,
                                                background: "#1a1a1a", color: "#888"
                                            }}>{lv.primary_mechanic}</span>
                                            {lv.onboarding_note && <span style={{
                                                fontSize: 10, padding: "1px 6px", borderRadius: 8,
                                                background: "#0a2010", color: "#4ade80"
                                            }}>Tutorial</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* churn flags */}
                    {(ld.churn_flags || []).length > 0 && (
                        <Card label="Churn risk flags">
                            {ld.churn_flags.map((f, i) => (
                                <div key={i} style={{
                                    padding: "8px 0",
                                    borderBottom: i < ld.churn_flags.length - 1 ? "0.5px solid #1a1a1a" : "none"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                        <span style={{
                                            fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 8,
                                            background: (CHURN_COLOR[f.risk] || "#888") + "22",
                                            color: CHURN_COLOR[f.risk] || "#888",
                                            border: `0.5px solid ${CHURN_COLOR[f.risk] || "#888"}`
                                        }}>L{f.level} {f.risk?.toUpperCase()}</span>
                                        <span style={{ fontSize: 12, color: "#ccc" }}>{f.reason}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: "#4ade80" }}>Fix: {f.fix}</div>
                                </div>
                            ))}
                        </Card>
                    )}

                    <Card label="Designer notes">
                        <p style={{ fontSize: 14, color: "#FFD600", fontWeight: 500, lineHeight: 1.75 }}>{ld.designer_notes}</p>
                    </Card>
                </div>
            )}

            {/* ── GAME CODE TAB ── */}
            {tab === "gamecode" && gc && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#FFD600" }}>{gc.game_title}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>Playable HTML5 MVP · read-only preview</div>

                    <div style={{
                        background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10,
                        padding: 0, overflow: "hidden"
                    }}>
                        <div style={{
                            padding: "10px 16px", borderBottom: "0.5px solid #1e1e1e",
                            display: "flex", alignItems: "center", gap: 8
                        }}>
                            {["#ff6b6b", "#FFD600", "#4ade80"].map(c => (
                                <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                            ))}
                            <span style={{ fontSize: 11, color: "#555", marginLeft: 8 }}>Live preview</span>
                        </div>
                        <iframe srcDoc={gc.html}
                            style={{ width: "100%", height: 520, border: "none", display: "block", background: "#0a0a0a" }}
                            title="Game preview" sandbox="allow-scripts allow-same-origin" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Card label="How to play">
                            <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{gc.controls}</p>
                        </Card>
                        <Card label="What was built">
                            <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{gc.tech_notes}</p>
                        </Card>
                    </div>
                </div>
            )}

        </div>
    );
}

// ── page shell ────────────────────────────────────────────────────────────────
export default function SharePage({ shareId, onHome }) {
    const [state, setState] = useState("loading"); // loading | ready | error
    const [session, setSession] = useState(null);

    useEffect(() => {
        loadShare(shareId)
            .then(s => { setSession(s); setState("ready"); })
            .catch(() => setState("error"));
    }, [shareId]);

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff" }}>
            {/* nav */}
            <nav style={{
                height: 52, borderBottom: "0.5px solid #1a1a1a", display: "flex",
                alignItems: "center", justifyContent: "space-between", padding: "0 24px"
            }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#FFD600", letterSpacing: "-0.02em" }}>
                    GDD.ai
                </span>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onHome}>
                    ← Back to home
                </button>
            </nav>

            {state === "loading" && (
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "60vh", flexDirection: "column", gap: 16
                }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: "50%", border: "3px solid #222",
                        borderTopColor: "#FFD600", animation: "spin 0.8s linear infinite"
                    }} />
                    <div style={{ fontSize: 13, color: "#555" }}>Loading shared report...</div>
                    <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
                </div>
            )}

            {state === "error" && (
                <div style={{ textAlign: "center", paddingTop: 80, color: "#ff6b6b" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Link not found</div>
                    <div style={{ fontSize: 14, color: "#555", marginBottom: 24 }}>
                        This share link may have expired or been deleted.
                    </div>
                    <button className="btn btn-primary" onClick={onHome}>Go to GDD.ai</button>
                </div>
            )}

            {state === "ready" && session && <SharedReport data={session.data} />}
        </div>
    );
}