const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function post(endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function download(endpoint, body, filename) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const analyzeIdea = (gameIdea) => post("/analyze", { game_idea: gameIdea });
export const checkIpSafety = (report) => post("/check-ip-safety", { report });   // ← new
export const competitorDeepDive = (gameIdea, genre) => post("/competitor-deep-dive", { game_idea: gameIdea, genre });
export const trendAnalysis = (gameIdea, genre) => post("/trend-analysis", { game_idea: gameIdea, genre });
export const generateGDD = (report) => post("/generate-gdd", { report });
export const generateLevelDesign = (report, gdd) => post("/generate-level-design", { report, gdd });
export const generateGameCode = (report, gdd, level_design) => post("/generate-game-code", { report, gdd, level_design });
export const generateUnityCode = (report, gdd, level_design) => post("/generate-unity-code", { report, gdd, level_design });
export const generateGodotCode = (report, gdd, level_design) => post("/generate-godot-code", { report, gdd, level_design });
export const fetchSocialTrends = (game_idea, genre, game_title) => post("/social-trends", { game_idea, genre, game_title });

// ── Sharing ───────────────────────────────────────────────────────────────────
export const createShare = (data) => post("/share", { data });
export const loadShare = (shareId) => fetch(`${BASE}/share/${shareId}`).then(r => r.ok ? r.json() : Promise.reject("Not found"));

// ── Exports ───────────────────────────────────────────────────────────────────
export const exportPDF = (report) => download("/export-pdf", report, `level-zero-${(report.game_title || "report").replace(/\s+/g, "-").toLowerCase()}.pdf`);
export const exportGDDPDF = (gdd) => download("/export-gdd-pdf", gdd, `gdd-${(gdd.title || "gdd").replace(/\s+/g, "-").toLowerCase()}.pdf`);
export const exportLevelDesignPDF = (ld) => download("/export-level-design-pdf", ld, "level-design.pdf");
export const downloadUnityZip = (data) => download("/download-unity-zip", data, `${(data.game_title || "game").replace(/\s+/g, "_")}_Unity.zip`);
export const downloadGodotZip = (data) => download("/download-godot-zip", data, `${(data.game_title || "game").replace(/\s+/g, "_")}_Godot.zip`);
