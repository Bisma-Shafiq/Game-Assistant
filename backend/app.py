from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Any

from schemas import (
    AnalyzeRequest, AnalyzeResponse,
    CompetitorDeepDiveRequest, CompetitorDeepDiveResponse,
    TrendRequest, TrendResponse,
    GDDRequest, GDDResponse,
    LevelDesignRequest, LevelDesignResponse,
    GameCodeRequest, GameCodeResponse,
    UnityCodeRequest, UnityCodeResponse,
    GodotCodeRequest, GodotCodeResponse,
    SocialTrendsRequest, SocialTrendsResponse,
)
from agent_backend import (
    analyze_game_idea,
    competitor_deep_dive,
    trend_analysis,
    generate_gdd,
    generate_level_design,
    generate_game_code,
    generate_unity_code,
    generate_godot_code,
    social_trends,
    check_ip_safety,           # ← added
)
from pdf_export import generate_pdf, generate_gdd_pdf, generate_level_design_pdf
from database import create_share, get_share, list_shares, delete_share

app = FastAPI(title="Prompt2Play API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
        "https://gameassistant.vercel.app/",  # ← your actual Vercel URL
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Share request model ───────────────────────────────────────────────────────

class ShareCreateRequest(BaseModel):
    data: Any


# ── IP safety request model ───────────────────────────────────────────────────

class IPSafetyRequest(BaseModel):
    report: Any   # AnalyzeResponse dict


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Core analysis ─────────────────────────────────────────────────────────────

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    if not req.game_idea.strip():
        raise HTTPException(status_code=422, detail="game_idea cannot be empty")
    try:
        return await analyze_game_idea(req.game_idea)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export-pdf")
async def export_pdf(data: AnalyzeResponse):
    try:
        pdf_bytes = generate_pdf(data.model_dump())
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="gddai-{data.game_title.replace(" ", "-").lower()}.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── IP Safety check ───────────────────────────────────────────────────────────

@app.post("/check-ip-safety")
async def ip_safety(req: IPSafetyRequest):
    """
    Check a game report for IP risks and App Store compliance issues.
    Call this after /analyze and BEFORE /generate-gdd or any code generation.
    Returns overall_risk: Low | Medium | High | Critical
    """
    try:
        return await check_ip_safety(req.report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Competitor deep dive ──────────────────────────────────────────────────────

@app.post("/competitor-deep-dive", response_model=CompetitorDeepDiveResponse)
async def deep_dive(req: CompetitorDeepDiveRequest):
    try:
        return await competitor_deep_dive(req.game_idea, req.genre)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Trend analysis ────────────────────────────────────────────────────────────

@app.post("/trend-analysis", response_model=TrendResponse)
async def trends(req: TrendRequest):
    try:
        return await trend_analysis(req.game_idea, req.genre)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GDD ───────────────────────────────────────────────────────────────────────

@app.post("/generate-gdd", response_model=GDDResponse)
async def gdd(req: GDDRequest):
    try:
        return await generate_gdd(req.report.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export-gdd-pdf")
async def export_gdd_pdf(data: GDDResponse):
    try:
        pdf_bytes = generate_gdd_pdf(data.model_dump())
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="gdd-{data.title.replace(" ", "-").lower()}.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Level Design ──────────────────────────────────────────────────────────────

@app.post("/generate-level-design", response_model=LevelDesignResponse)
async def level_design(req: LevelDesignRequest):
    try:
        return await generate_level_design(req.report.model_dump(), req.gdd.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export-level-design-pdf")
async def export_level_design_pdf(data: LevelDesignResponse):
    try:
        pdf_bytes = generate_level_design_pdf(data.model_dump())
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="level-design.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Game Code ─────────────────────────────────────────────────────────────────

@app.post("/generate-game-code", response_model=GameCodeResponse)
async def game_code(req: GameCodeRequest):
    try:
        result = await generate_game_code(
            req.report.model_dump(),
            req.gdd.model_dump(),
            req.level_design.model_dump(),
        )
        return {**result, "report": req.report, "gdd": req.gdd}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Unity Code ────────────────────────────────────────────────────────────────

@app.post("/generate-unity-code", response_model=UnityCodeResponse)
async def unity_code(req: UnityCodeRequest):
    try:
        return await generate_unity_code(
            req.report.model_dump(),
            req.gdd.model_dump(),
            req.level_design.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/download-unity-zip")
async def download_unity_zip(data: UnityCodeResponse):
    """Package all Unity scripts into a downloadable zip."""
    import io, zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for script in data.scripts:
            zf.writestr(f"{data.game_title}_Unity/{script.path}", script.content)
        zf.writestr(
            f"{data.game_title}_Unity/ProjectSettings/ProjectVersion.txt",
            f"m_EditorVersion: {data.project_version}\n"
            f"m_EditorVersionWithRevision: {data.project_version} (Unity 2021 LTS)"
        )
        zf.writestr(f"{data.game_title}_Unity/SETUP.md", data.setup_md)
    buf.seek(0)
    filename = f"{data.game_title.replace(' ', '_')}_Unity.zip"
    return Response(
        content=buf.read(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Godot Code ────────────────────────────────────────────────────────────────

@app.post("/generate-godot-code", response_model=GodotCodeResponse)
async def godot_code(req: GodotCodeRequest):
    try:
        return await generate_godot_code(
            req.report.model_dump(),
            req.gdd.model_dump(),
            req.level_design.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/download-godot-zip")
async def download_godot_zip(data: GodotCodeResponse):
    """Package all Godot scripts into a downloadable zip."""
    import io, zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for script in data.scripts:
            zf.writestr(f"{data.game_title}_Godot/{script.path}", script.content)
        zf.writestr(f"{data.game_title}_Godot/project.godot", data.project_godot)
        zf.writestr(f"{data.game_title}_Godot/SETUP.md", data.setup_md)
    buf.seek(0)
    filename = f"{data.game_title.replace(' ', '_')}_Godot.zip"
    return Response(
        content=buf.read(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── AI Game Debugger chat proxy ───────────────────────────────────────────────

@app.post("/ai-fix-game")
async def ai_fix_game(req: Request):
    body = await req.json()
    html_code: str    = body.get("html", "")
    user_message: str = body.get("message", "")
    if not user_message.strip():
        raise HTTPException(status_code=422, detail="message cannot be empty")

    import google.generativeai as genai_lib
    system = (
        "You are an expert HTML5 game debugger.\n"
        "The user has a bug in this game code:\n\n"
        f"{html_code}\n\n"
        "When the user describes a bug, return the COMPLETE fixed HTML file — "
        "no truncation, no markdown fences, just raw HTML starting with <!DOCTYPE html>. "
        "After the HTML, on a new line write: ---EXPLANATION--- "
        "followed by a short plain-text explanation of what you fixed."
    )
    try:
        m = genai_lib.GenerativeModel(
            model_name="gemini-3-flash-preview",   # ← fixed: was invalid "gemini-3-flash-preview"
            system_instruction=system,
            generation_config=genai_lib.GenerationConfig(
                temperature=0.3,
                max_output_tokens=8192,
            ),
        )
        response = m.generate_content(user_message)
        return {"result": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Social Trends (Apify) ─────────────────────────────────────────────────────

@app.post("/social-trends")
async def social_trends_endpoint(req: SocialTrendsRequest):
    try:
        return await social_trends(req.game_idea, req.genre, req.game_title)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Sharing ───────────────────────────────────────────────────────────────────

@app.post("/share")
async def share_create(req: ShareCreateRequest):
    """Save a session and return a shareable id."""
    try:
        share_id = create_share(req.data)
        return {"share_id": share_id, "url": f"/share/{share_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/share/{share_id}")
async def share_get(share_id: str):
    """Load a shared session by id."""
    session = get_share(share_id)
    if not session:
        raise HTTPException(status_code=404, detail="Share not found")
    return session


@app.get("/shares")
async def share_list():
    """List all shares."""
    return list_shares()


@app.delete("/share/{share_id}")
async def share_delete(share_id: str):
    if not delete_share(share_id):
        raise HTTPException(status_code=404, detail="Share not found")
    return {"deleted": share_id}
