import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent

BACKEND_DIR  = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"

def run(cmd, cwd=None):
    print(f"\n>>> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"\n[ERROR] Command failed: {cmd}")
        sys.exit(1)

def create_folders():
    print("\n[1/5] Creating folder structure...")
    folders = [
        BACKEND_DIR,
        FRONTEND_DIR / "src" / "api",
        FRONTEND_DIR / "src" / "pages",
        FRONTEND_DIR / "src" / "components",
    ]
    for f in folders:
        f.mkdir(parents=True, exist_ok=True)
        print(f"  created: {f.relative_to(ROOT)}")

def create_backend_files():
    print("\n[2/5] Creating backend files...")

    files = {}

    files["schemas.py"] = '''\
from pydantic import BaseModel
from typing import List

class AnalyzeRequest(BaseModel):
    game_idea: str

class Mechanic(BaseModel):
    name: str
    description: str
    player_action: str

class BalanceFlag(BaseModel):
    risk: str
    severity: str
    recommendation: str

class Competitor(BaseModel):
    title: str
    similarity: str
    differentiator: str

class AnalyzeResponse(BaseModel):
    game_title: str
    genre: str
    core_loop: str
    session_length: str
    monetization_model: str
    mechanics: List[Mechanic]
    balance_score: int
    balance_summary: str
    balance_flags: List[BalanceFlag]
    competitors: List[Competitor]
    verdict: str
'''

    files["prompts.py"] = '''\
MECHANICS_PROMPT = """
You are a senior mobile game designer at a top studio.
Given a game idea, extract the core design pillars.

Return ONLY valid JSON — no markdown fences, no preamble.

Schema:
{
  "game_title": "string — invent a punchy working title",
  "genre": "string — e.g. idle RPG, match-3 puzzle, battle royale",
  "core_loop": "string — one sentence describing the fundamental action loop",
  "session_length": "string — e.g. 3-5 minutes, 15-30 minutes",
  "monetization_model": "string — e.g. freemium IAP, battle pass, premium",
  "mechanics": [
    {
      "name": "string",
      "description": "string — what this mechanic does",
      "player_action": "string — what the player physically does"
    }
  ]
}

Rules:
- mechanics array must have 3 to 5 items
- Be specific and grounded in real mobile game conventions
- session_length should reflect mobile gaming norms
"""

BALANCE_PROMPT = """
You are a game economy designer specializing in mobile game balance and retention.
Given a game idea, assess its balance risks and monetization health.

Return ONLY valid JSON — no markdown fences, no preamble.

Schema:
{
  "balance_score": integer between 0 and 100 (100 = perfectly balanced),
  "balance_summary": "string — 2 sentences summarizing the balance outlook",
  "balance_flags": [
    {
      "risk": "string — name of the risk",
      "severity": "low" | "medium" | "high",
      "recommendation": "string — specific fix"
    }
  ]
}

Rules:
- balance_flags must have 2 to 4 items
- Be honest — flag pay-to-win risks, progression walls, churn cliffs
- Recommendations must be actionable design changes, not vague advice
"""

COMPETITOR_PROMPT = """
You are a mobile games market analyst with deep knowledge of the App Store and Google Play top charts.
Given a game idea, identify the most comparable shipped games.

Return ONLY valid JSON — no markdown fences, no preamble.

Schema:
{
  "competitors": [
    {
      "title": "string — real game title",
      "similarity": "string — what mechanic or loop they share",
      "differentiator": "string — what makes the new idea different or better"
    }
  ],
  "verdict": "string — one punchy paragraph (3-4 sentences) summarizing the opportunity, risks, and the single most important thing to nail at launch"
}

Rules:
- competitors must have exactly 3 items
- Use only real, well-known mobile games (e.g. Clash of Clans, Candy Crush, Among Us)
- verdict must be honest and energizing — like advice from a sharp investor
"""

SYNTHESIS_PROMPT = """
You are merging structured JSON outputs from three specialist agents into one unified report.
You will receive three JSON blobs. Merge them into a single JSON object matching this exact schema:

{
  "game_title": string,
  "genre": string,
  "core_loop": string,
  "session_length": string,
  "monetization_model": string,
  "mechanics": [...],
  "balance_score": integer,
  "balance_summary": string,
  "balance_flags": [...],
  "competitors": [...],
  "verdict": string
}

Return ONLY the merged JSON — no markdown, no explanation.
"""
'''

    files["agents.py"] = '''\
import os
import json
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv
from prompts import MECHANICS_PROMPT, BALANCE_PROMPT, COMPETITOR_PROMPT, SYNTHESIS_PROMPT

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-1.5-flash"

def _make_model(system_prompt: str):
    return genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.7,
            response_mime_type="application/json",
        ),
    )

async def _call_agent(system_prompt: str, user_message: str) -> dict:
    model = _make_model(system_prompt)
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: model.generate_content(user_message)
    )
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("\\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(raw)

async def run_mechanics_agent(game_idea: str) -> dict:
    return await _call_agent(MECHANICS_PROMPT, f"Game idea: {game_idea}")

async def run_balance_agent(game_idea: str) -> dict:
    return await _call_agent(BALANCE_PROMPT, f"Game idea: {game_idea}")

async def run_competitor_agent(game_idea: str) -> dict:
    return await _call_agent(COMPETITOR_PROMPT, f"Game idea: {game_idea}")

async def run_synthesis(mechanics: dict, balance: dict, competitors: dict) -> dict:
    combined = json.dumps({
        "mechanics_agent_output": mechanics,
        "balance_agent_output": balance,
        "competitor_agent_output": competitors,
    }, indent=2)
    return await _call_agent(SYNTHESIS_PROMPT, combined)

async def analyze_game_idea(game_idea: str) -> dict:
    mechanics, balance, competitors = await asyncio.gather(
        run_mechanics_agent(game_idea),
        run_balance_agent(game_idea),
        run_competitor_agent(game_idea),
    )
    final = await run_synthesis(mechanics, balance, competitors)
    return final
'''

    files["pdf_export.py"] = '''\
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

PURPLE = colors.HexColor("#534AB7")
TEAL   = colors.HexColor("#0F6E56")
CORAL  = colors.HexColor("#993C1D")
AMBER  = colors.HexColor("#BA7517")
LIGHT  = colors.HexColor("#F1EFE8")
RED    = colors.HexColor("#A32D2D")
GRAY   = colors.HexColor("#5F5E5A")

def _styles():
    base = getSampleStyleSheet()
    return {
        "title":    ParagraphStyle("title",    parent=base["Title"],   fontSize=26, textColor=PURPLE,  spaceAfter=4),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"],  fontSize=13, textColor=GRAY,    spaceAfter=16),
        "h2":       ParagraphStyle("h2",       parent=base["Heading2"],fontSize=14, textColor=PURPLE,  spaceBefore=18, spaceAfter=6),
        "body":     ParagraphStyle("body",     parent=base["Normal"],  fontSize=10, leading=15,        spaceAfter=6),
        "verdict":  ParagraphStyle("verdict",  parent=base["Normal"],  fontSize=11, leading=16, textColor=TEAL, spaceAfter=8, leftIndent=12, borderPad=8),
        "label":    ParagraphStyle("label",    parent=base["Normal"],  fontSize=9,  textColor=GRAY),
    }

def _severity_color(s: str) -> colors.Color:
    return {"high": RED, "medium": AMBER, "low": TEAL}.get(s.lower(), GRAY)

def generate_pdf(data: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                             leftMargin=2*cm, rightMargin=2*cm,
                             topMargin=2*cm,  bottomMargin=2*cm)
    s = _styles()
    story = []

    story.append(Paragraph(data.get("game_title", "Level Zero Report"), s["title"]))
    story.append(Paragraph(
        f\'{data.get("genre", "")} &nbsp;·&nbsp; {data.get("session_length", "")} sessions &nbsp;·&nbsp; {data.get("monetization_model", "")}\',
        s["subtitle"]
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=PURPLE, spaceAfter=10))

    story.append(Paragraph("Core loop", s["h2"]))
    story.append(Paragraph(data.get("core_loop", ""), s["body"]))

    story.append(Paragraph("Core mechanics", s["h2"]))
    for m in data.get("mechanics", []):
        tbl = Table(
            [[Paragraph(f\'<b>{m["name"]}</b>\', s["body"]),
              Paragraph(m["description"], s["body"]),
              Paragraph(f\'<i>Player does:</i> {m["player_action"]}\', s["label"])]],
            colWidths=["22%", "45%", "33%"]
        )
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (0,0), LIGHT),
            ("BOX",  (0,0), (-1,-1), 0.5, GRAY),
            ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#D3D1C7")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",  (0,0), (-1,-1), 6),
            ("BOTTOMPADDING",(0,0),(-1,-1), 6),
            ("LEFTPADDING", (0,0), (-1,-1), 8),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 4))

    story.append(Paragraph("Balance scorecard", s["h2"]))
    score = data.get("balance_score", 0)
    story.append(Paragraph(f\'<b>Score: {score}/100</b> — {data.get("balance_summary", "")}\', s["body"]))
    story.append(Spacer(1, 6))
    for f in data.get("balance_flags", []):
        sev_col = _severity_color(f["severity"])
        tbl = Table(
            [[Paragraph(f\'<b>{f["risk"]}</b>\', s["body"]),
              Paragraph(f["severity"].upper(), s["label"]),
              Paragraph(f["recommendation"], s["body"])]],
            colWidths=["28%", "12%", "60%"]
        )
        tbl.setStyle(TableStyle([
            ("TEXTCOLOR", (1,0), (1,0), sev_col),
            ("BOX",  (0,0), (-1,-1), 0.5, sev_col),
            ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#D3D1C7")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",  (0,0), (-1,-1), 6),
            ("BOTTOMPADDING",(0,0),(-1,-1), 6),
            ("LEFTPADDING", (0,0), (-1,-1), 8),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 4))

    story.append(Paragraph("Competitor landscape", s["h2"]))
    for c in data.get("competitors", []):
        tbl = Table(
            [[Paragraph(f\'<b>{c["title"]}</b>\', s["body"]),
              Paragraph(f\'<i>Similar:</i> {c["similarity"]}\', s["body"]),
              Paragraph(f\'<i>Your edge:</i> {c["differentiator"]}\', s["body"])]],
            colWidths=["22%", "39%", "39%"]
        )
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (0,0), colors.HexColor("#EEEDFE")),
            ("BOX",  (0,0), (-1,-1), 0.5, PURPLE),
            ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#D3D1C7")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",  (0,0), (-1,-1), 6),
            ("BOTTOMPADDING",(0,0),(-1,-1), 6),
            ("LEFTPADDING", (0,0), (-1,-1), 8),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 4))

    story.append(Paragraph("Verdict", s["h2"]))
    story.append(Paragraph(data.get("verdict", ""), s["verdict"]))

    doc.build(story)
    return buf.getvalue()
'''

    files["main.py"] = '''\
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from schemas import AnalyzeRequest, AnalyzeResponse
from agents import analyze_game_idea
from pdf_export import generate_pdf

app = FastAPI(title="Level Zero API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    if not req.game_idea.strip():
        raise HTTPException(status_code=422, detail="game_idea cannot be empty")
    try:
        result = await analyze_game_idea(req.game_idea)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/export-pdf")
async def export_pdf(data: AnalyzeResponse):
    try:
        pdf_bytes = generate_pdf(data.model_dump())
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f\'attachment; filename="level-zero-{data.game_title.replace(" ", "-").lower()}.pdf"\'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
'''

    for filename, content in files.items():
        path = BACKEND_DIR / filename
        if path.exists():
            print(f"  exists (skipping): backend/{filename}")
        else:
            path.write_text(content, encoding="utf-8")
            print(f"  created: backend/{filename}")

def create_requirements():
    print("\n[2/5] Creating requirements.txt...")
    req_path = ROOT / "requirements.txt"
    if req_path.exists():
        print("  requirements.txt already exists — skipping")
        return
    req_path.write_text(
        "fastapi==0.111.0\n"
        "uvicorn[standard]==0.29.0\n"
        "python-dotenv==1.0.1\n"
        "google-generativeai==0.7.2\n"
        "pydantic==2.7.1\n"
        "reportlab==4.1.0\n"
        "python-multipart==0.0.9\n"
        "httpx==0.27.0\n"
    )
    print("  created: requirements.txt")

def create_env():
    print("\n[3/5] Creating .env file...")
    env_path = ROOT / ".env"
    if env_path.exists():
        print("  .env already exists — skipping (your key is safe)")
        return
    env_path.write_text("GEMINI_API_KEY=your_gemini_api_key_here\n")
    print("  created: .env")
    print("  !! Open .env and replace 'your_gemini_api_key_here' with your real key")
    print("  !! Get a free key at: https://aistudio.google.com/app/apikey")

def setup_backend():
    print("\n[4/5] Setting up Python backend...")

    venv_dir = ROOT / "venv"
    if venv_dir.exists():
        print("  venv already exists — skipping creation")
    else:
        run(f"{sys.executable} -m venv venv", cwd=ROOT)
        print("  virtual environment created")

    pip = str(venv_dir / ("Scripts/pip" if sys.platform == "win32" else "bin/pip"))
    run(f'"{pip}" install -r requirements.txt', cwd=ROOT)
    print("  Python dependencies installed")

def create_frontend_files():
    print("\n[5/6] Creating frontend files...")

    pkg = FRONTEND_DIR / "package.json"
    if not pkg.exists():
        pkg.write_text('''{
  "name": "level-zero",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.2.0"
  }
}
''', encoding="utf-8")
        print("  created: frontend/package.json")
    else:
        print("  exists (skipping): frontend/package.json")

    vite_config = FRONTEND_DIR / "vite.config.js"
    if not vite_config.exists():
        vite_config.write_text('''\
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
''', encoding="utf-8")
        print("  created: frontend/vite.config.js")

    index_html = FRONTEND_DIR / "index.html"
    if not index_html.exists():
        index_html.write_text('''\
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Level Zero</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
''', encoding="utf-8")
        print("  created: frontend/index.html")

    src = FRONTEND_DIR / "src"

    main_jsx = src / "main.jsx"
    if not main_jsx.exists():
        main_jsx.write_text('''\
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
''', encoding="utf-8")
        print("  created: frontend/src/main.jsx")

    css = src / "index.css"
    if not css.exists():
        css.write_text('''\
:root {
  --purple:       #534AB7;
  --purple-light: #EEEDFE;
  --teal:         #0F6E56;
  --teal-light:   #E1F5EE;
  --coral:        #993C1D;
  --coral-light:  #FAECE7;
  --amber:        #BA7517;
  --amber-light:  #FAEEDA;
  --red:          #A32D2D;
  --red-light:    #FCEBEB;
  --gray:         #5F5E5A;
  --gray-light:   #F1EFE8;
  --text:         #2C2C2A;
  --text-muted:   #888780;
  --border:       #D3D1C7;
  --bg:           #ffffff;
  --bg-surface:   #F1EFE8;
  --radius:       10px;
  --radius-lg:    16px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg-surface); color: var(--text); line-height: 1.6; min-height: 100vh; }
h1 { font-size: 2rem; font-weight: 600; }
h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 12px; }
h3 { font-size: 1rem; font-weight: 600; }
.container { max-width: 860px; margin: 0 auto; padding: 0 20px; }
.card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 20px; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.badge-high   { background: var(--red-light);   color: var(--red); }
.badge-medium { background: var(--amber-light); color: var(--amber); }
.badge-low    { background: var(--teal-light);  color: var(--teal); }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: var(--radius); border: none; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: opacity 0.15s, transform 0.1s; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: var(--purple); color: #fff; }
.btn-primary:hover { opacity: 0.9; }
.btn-outline { background: transparent; border: 1.5px solid var(--purple); color: var(--purple); }
.btn-outline:hover { background: var(--purple-light); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.score-bar-track { height: 10px; background: var(--gray-light); border-radius: 6px; overflow: hidden; margin: 8px 0 4px; }
.score-bar-fill { height: 100%; border-radius: 6px; transition: width 0.8s ease; }
textarea { width: 100%; border: 1.5px solid var(--border); border-radius: var(--radius); padding: 14px; font-size: 1rem; font-family: inherit; resize: vertical; background: var(--bg); color: var(--text); transition: border-color 0.15s; }
textarea:focus { outline: none; border-color: var(--purple); }
.divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
''', encoding="utf-8")
        print("  created: frontend/src/index.css")

    app_jsx = src / "App.jsx"
    if not app_jsx.exists():
        app_jsx.write_text('''\
import { useState } from "react";
import "./index.css";
import HomePage from "./pages/HomePage";
import ResultPage from "./pages/ResultPage";

export default function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  return report
    ? <ResultPage report={report} onReset={() => setReport(null)} />
    : <HomePage onResult={setReport} loading={loading} setLoading={setLoading} />;
}
''', encoding="utf-8")
        print("  created: frontend/src/App.jsx")

    analyze_js = src / "api" / "analyze.js"
    if not analyze_js.exists():
        analyze_js.write_text('''\
const BASE = "http://localhost:8000";

export async function analyzeIdea(gameIdea) {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_idea: gameIdea }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(err.detail || "Analysis failed");
  }
  return res.json();
}

export async function exportPDF(reportData) {
  const res = await fetch(`${BASE}/export-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reportData),
  });
  if (!res.ok) throw new Error("PDF export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `level-zero-${(reportData.game_title ?? "report").replace(/\\s+/g, "-").toLowerCase()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
''', encoding="utf-8")
        print("  created: frontend/src/api/analyze.js")

    loader_jsx = src / "components" / "Loader.jsx"
    if not loader_jsx.exists():
        loader_jsx.write_text('''\
import { useEffect, useState } from "react";

const STEPS = [
  { label: "Mechanics agent",  sub: "Extracting core loops & mechanics..." },
  { label: "Balance agent",    sub: "Scanning for pay-to-win risks..." },
  { label: "Competitor agent", sub: "Matching against shipped games..." },
  { label: "Synthesis",        sub: "Merging agent outputs into report..." },
];

export default function Loader() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timings = [2500, 5000, 8000];
    const timers = timings.map((t, i) => setTimeout(() => setStep(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="container" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 500 }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
        <h2 style={{ color: "var(--purple)" }}>Analyzing your idea...</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Three agents working in parallel</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {STEPS.map((s, i) => {
          const done = i < step, active = i === step, pending = i > step;
          return (
            <div key={i} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, opacity: pending ? 0.4 : 1, transition: "opacity 0.4s", borderColor: active ? "var(--purple)" : "var(--border)", borderWidth: active ? 2 : 1 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "var(--teal)" : active ? "var(--purple)" : "var(--gray-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, color: "#fff", transition: "background 0.3s" }}>
                {done ? "✓" : active ? <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.7s linear infinite", display: "block" }} /> : ""}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{s.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{done ? "Complete" : active ? s.sub : "Waiting..."}</div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
''', encoding="utf-8")
        print("  created: frontend/src/components/Loader.jsx")

    home_jsx = src / "pages" / "HomePage.jsx"
    if not home_jsx.exists():
        home_jsx.write_text('''\
import { useState } from "react";
import { analyzeIdea } from "../api/analyze";
import Loader from "../components/Loader";

const SEEDS = [
  "A mobile game where you play as a tax collector chasing citizens across a city",
  "An idle RPG where your hero levels up while you sleep, based on real sleep data",
  "A multiplayer trivia game where wrong answers shrink your character on screen",
];

export default function HomePage({ onResult, loading, setLoading }) {
  const [idea, setIdea] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!idea.trim()) { setError("Please describe your game idea."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await analyzeIdea(idea);
      onResult(result);
    } catch (e) {
      setError(e.message || "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 60 }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>🎮</span>
          <h1 style={{ color: "var(--purple)" }}>Level Zero</h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", maxWidth: 560 }}>
          Describe your game idea in plain English. Three AI agents will analyze your mechanics,
          balance risks, and competitor landscape — then generate a full report in seconds.
        </p>
      </div>
      <div className="card">
        <h2>Your game idea</h2>
        <textarea rows={5} placeholder="e.g. A battle royale where players shrink every 30 seconds..." value={idea} onChange={e => setIdea(e.target.value)} />
        {error && <p style={{ color: "var(--red)", fontSize: "0.875rem", marginTop: 8 }}>{error}</p>}
        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>Analyze with AI →</button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>~15 seconds</span>
        </div>
      </div>
      <div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 12 }}>Try a seed idea:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SEEDS.map((s, i) => (
            <button key={i} className="btn btn-outline" style={{ justifyContent: "flex-start", textAlign: "left", fontSize: "0.875rem", padding: "10px 16px" }} onClick={() => setIdea(s)}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
''', encoding="utf-8")
        print("  created: frontend/src/pages/HomePage.jsx")

    result_jsx = src / "pages" / "ResultPage.jsx"
    if not result_jsx.exists():
        result_jsx.write_text('''\
import { useState } from "react";
import { exportPDF } from "../api/analyze";

const SEV_COLOR = { high: "var(--red)", medium: "var(--amber)", low: "var(--teal)" };
const SCORE_COLOR = n => n >= 70 ? "var(--teal)" : n >= 40 ? "var(--amber)" : "var(--red)";

function MetaPill({ label, value }) {
  return (
    <div style={{ background: "var(--purple-light)", color: "var(--purple)", borderRadius: 20, padding: "4px 14px", fontSize: "0.82rem", fontWeight: 500 }}>
      <span style={{ opacity: 0.7 }}>{label}: </span>{value}
    </div>
  );
}

function Section({ title, children, accent = "var(--purple)" }) {
  return (
    <div className="card">
      <h2 style={{ color: accent, marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  );
}

export default function ResultPage({ report: r, onReset }) {
  const [exporting, setExporting] = useState(false);

  async function handlePDF() {
    setExporting(true);
    try { await exportPDF(r); }
    catch (e) { alert("PDF export failed: " + e.message); }
    finally { setExporting(false); }
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 24 }}>🎮</span>
            <h1 style={{ color: "var(--purple)", fontSize: "1.7rem" }}>{r.game_title}</h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <MetaPill label="Genre" value={r.genre} />
            <MetaPill label="Sessions" value={r.session_length} />
            <MetaPill label="Model" value={r.monetization_model} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" onClick={handlePDF} disabled={exporting}>{exporting ? "Generating..." : "Download PDF"}</button>
          <button className="btn btn-primary" onClick={onReset}>+ New idea</button>
        </div>
      </div>

      <Section title="Core loop">
        <p style={{ fontSize: "1rem", lineHeight: 1.7 }}>{r.core_loop}</p>
      </Section>

      <Section title="Core mechanics">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {r.mechanics.map((m, i) => (
            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", background: "var(--bg-surface)" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.name}</div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 6 }}>{m.description}</p>
              <div style={{ fontSize: "0.82rem", color: "var(--purple)", fontStyle: "italic" }}>Player does: {m.player_action}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Balance scorecard" accent="var(--teal)">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, color: SCORE_COLOR(r.balance_score) }}>{r.balance_score}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>out of 100</div>
            <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${r.balance_score}%`, background: SCORE_COLOR(r.balance_score) }} /></div>
          </div>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 16 }}>{r.balance_summary}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {r.balance_flags.map((f, i) => (
            <div key={i} style={{ border: `1px solid ${SEV_COLOR[f.severity.toLowerCase()] ?? "var(--border)"}`, borderRadius: "var(--radius)", padding: "12px 16px", borderLeftWidth: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{f.risk}</span>
                <span className={`badge badge-${f.severity.toLowerCase()}`}>{f.severity}</span>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{f.recommendation}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Competitor landscape" accent="var(--coral)">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {r.competitors.map((c, i) => (
            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--coral)" }}>{c.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2 }}>SIMILAR</div><p style={{ fontSize: "0.875rem" }}>{c.similarity}</p></div>
                <div><div style={{ fontSize: "0.75rem", color: "var(--teal)", marginBottom: 2 }}>YOUR EDGE</div><p style={{ fontSize: "0.875rem" }}>{c.differentiator}</p></div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Verdict" accent="var(--amber)">
        <p style={{ fontSize: "1rem", lineHeight: 1.75, borderLeft: "3px solid var(--amber)", paddingLeft: 16 }}>{r.verdict}</p>
      </Section>
    </div>
  );
}
''', encoding="utf-8")
        print("  created: frontend/src/pages/ResultPage.jsx")


def setup_frontend():
    print("\n[6/6] Installing frontend npm packages...")
    node_modules = FRONTEND_DIR / "node_modules"
    if node_modules.exists():
        print("  node_modules already exists — skipping npm install")
    else:
        run("npm install", cwd=str(FRONTEND_DIR))
    print("  Frontend ready")

def print_next_steps():
    is_win = sys.platform == "win32"
    activate = r"venv\Scripts\activate" if is_win else "source venv/bin/activate"

    print("\n" + "=" * 58)
    print("  SETUP COMPLETE — here is how to run the app")
    print("=" * 58)
    print(f"""
STEP 1 — Add your Gemini API key:
  Open .env and set GEMINI_API_KEY=your_real_key
  Free key: https://aistudio.google.com/app/apikey

STEP 2 — Start the backend (Terminal 1):
  {activate}
  cd backend
  uvicorn main:app --reload --port 8000

  API docs: http://localhost:8000/docs

STEP 3 — Start the frontend (Terminal 2):
  cd frontend
  npm run dev

  App: http://localhost:5173
""")
    print("=" * 58)

def main():
    print("=" * 58)
    print("  Level Zero — Project Setup")
    print("=" * 58)

    create_folders()
    create_backend_files()
    create_requirements()
    create_env()
    create_frontend_files()
    setup_frontend()
    print_next_steps()

if __name__ == "__main__":
    main()