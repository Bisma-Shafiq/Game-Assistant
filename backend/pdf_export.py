from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, PageBreak,
)

PURPLE = colors.HexColor("#534AB7")
TEAL   = colors.HexColor("#0F6E56")
CORAL  = colors.HexColor("#993C1D")
AMBER  = colors.HexColor("#BA7517")
YELLOW = colors.HexColor("#FFD600")
LIGHT  = colors.HexColor("#F1EFE8")
RED    = colors.HexColor("#A32D2D")
GRAY   = colors.HexColor("#5F5E5A")
BLACK  = colors.HexColor("#0a0a0a")
DGRAY  = colors.HexColor("#1a1a1a")

def _base_styles():
    base = getSampleStyleSheet()
    return {
        "title":    ParagraphStyle("title",    parent=base["Title"],   fontSize=26, textColor=YELLOW,  spaceAfter=4),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"],  fontSize=13, textColor=GRAY,    spaceAfter=16),
        "h2":       ParagraphStyle("h2",       parent=base["Heading2"],fontSize=14, textColor=YELLOW,  spaceBefore=18, spaceAfter=6),
        "h3":       ParagraphStyle("h3",       parent=base["Heading3"],fontSize=12, textColor=GRAY,    spaceBefore=12, spaceAfter=4),
        "body":     ParagraphStyle("body",     parent=base["Normal"],  fontSize=10, leading=15,        spaceAfter=6),
        "verdict":  ParagraphStyle("verdict",  parent=base["Normal"],  fontSize=11, leading=16, textColor=TEAL, spaceAfter=8),
        "label":    ParagraphStyle("label",    parent=base["Normal"],  fontSize=9,  textColor=GRAY),
    }

def _sev_color(s: str):
    return {"high": RED, "medium": AMBER, "low": TEAL}.get(s.lower(), GRAY)

# ── Core report PDF ───────────────────────────────────────────────────────────

def generate_pdf(data: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    s   = _base_styles()
    story = []

    story.append(Paragraph(data.get("game_title", "Level Zero Report"), s["title"]))
    story.append(Paragraph(f'{data.get("genre","")} &nbsp;·&nbsp; {data.get("session_length","")} &nbsp;·&nbsp; {data.get("monetization_model","")}', s["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceAfter=12))

    story.append(Paragraph("Core loop", s["h2"]))
    story.append(Paragraph(data.get("core_loop", ""), s["body"]))

    story.append(Paragraph("Core mechanics", s["h2"]))
    for m in data.get("mechanics", []):
        if not isinstance(m, dict): continue
        tbl = Table([[Paragraph(f'<b>{m.get("name","")}</b>', s["body"]),
                      Paragraph(m.get("description",""), s["body"]),
                      Paragraph(f'<i>Player does:</i> {m.get("player_action","")}', s["label"])]],
                    colWidths=["22%","45%","33%"])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(0,0),LIGHT),("BOX",(0,0),(-1,-1),0.5,GRAY),
            ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#D3D1C7")),
            ("VALIGN",(0,0),(-1,-1),"TOP"),("TOPPADDING",(0,0),(-1,-1),6),
            ("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(tbl); story.append(Spacer(1,4))

    story.append(Paragraph("Balance scorecard", s["h2"]))
    score = data.get("balance_score", 0)
    story.append(Paragraph(f'<b>Score: {score}/100</b> — {data.get("balance_summary","")}', s["body"]))
    story.append(Spacer(1,6))
    for f in data.get("balance_flags", []):
        if not isinstance(f, dict): continue
        sc = _sev_color(f.get("severity",""))
        tbl = Table([[Paragraph(f'<b>{f.get("risk","")}</b>', s["body"]),
                      Paragraph(f.get("severity","").upper(), s["label"]),
                      Paragraph(f.get("recommendation",""), s["body"])]],
                    colWidths=["28%","12%","60%"])
        tbl.setStyle(TableStyle([
            ("TEXTCOLOR",(1,0),(1,0),sc),("BOX",(0,0),(-1,-1),0.5,sc),
            ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#D3D1C7")),
            ("VALIGN",(0,0),(-1,-1),"TOP"),("TOPPADDING",(0,0),(-1,-1),6),
            ("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(tbl); story.append(Spacer(1,4))

    story.append(Paragraph("Competitors", s["h2"]))
    for c in data.get("competitors", []):
        if not isinstance(c, dict): continue
        tbl = Table([[Paragraph(f'<b>{c.get("title","")}</b>', s["body"]),
                      Paragraph(f'<i>Similar:</i> {c.get("similarity","")}', s["body"]),
                      Paragraph(f'<i>Edge:</i> {c.get("differentiator","")}', s["body"])]],
                    colWidths=["22%","39%","39%"])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(0,0),colors.HexColor("#1f1500")),
            ("BOX",(0,0),(-1,-1),0.5,YELLOW),
            ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#D3D1C7")),
            ("VALIGN",(0,0),(-1,-1),"TOP"),("TOPPADDING",(0,0),(-1,-1),6),
            ("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(tbl); story.append(Spacer(1,4))

    story.append(Paragraph("Our take", s["h2"]))
    story.append(Paragraph(data.get("verdict",""), s["verdict"]))

    doc.build(story)
    return buf.getvalue()

# ── Level Design PDF ──────────────────────────────────────────────────────────

def generate_level_design_pdf(data: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    s   = _base_styles()
    story = []

    story.append(Paragraph("Level Design Plan", s["title"]))
    story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceAfter=12))

    # World structure
    story.append(Paragraph("World structure", s["h2"]))
    for w in data.get("worlds", []):
        tbl = Table([[
            Paragraph(f'<b>World {w.get("number")}: {w.get("name","")}</b>', s["body"]),
            Paragraph(f'Theme: {w.get("theme","")}', s["body"]),
            Paragraph(f'Levels: {w.get("level_count","")}', s["label"]),
            Paragraph(f'New: {w.get("new_mechanic","")}', s["label"]),
        ]], colWidths=["28%","30%","14%","28%"])
        tbl.setStyle(TableStyle([
            ("BOX",(0,0),(-1,-1),0.5,YELLOW),
            ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#2e2e2e")),
            ("BACKGROUND",(0,0),(0,0),colors.HexColor("#1f1500")),
            ("VALIGN",(0,0),(-1,-1),"TOP"),
            ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
            ("LEFTPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(tbl); story.append(Spacer(1,4))

    # Mechanic schedule
    story.append(Paragraph("Mechanic introduction schedule", s["h2"]))
    for m in data.get("mechanic_schedule", []):
        tbl = Table([[
            Paragraph(f'<b>Level {m.get("level","")}</b>', s["body"]),
            Paragraph(m.get("mechanic",""), s["body"]),
            Paragraph(m.get("introduction_type","").upper(), s["label"]),
            Paragraph(m.get("description",""), s["body"]),
        ]], colWidths=["12%","22%","14%","52%"])
        tbl.setStyle(TableStyle([
            ("BOX",(0,0),(-1,-1),0.5,GRAY),
            ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#2e2e2e")),
            ("VALIGN",(0,0),(-1,-1),"TOP"),
            ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
            ("LEFTPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(tbl); story.append(Spacer(1,3))

    # Levels 1-10
    story.append(Paragraph("Levels 1–10", s["h2"]))
    for lv in data.get("levels", []):
        risk_col = _sev_color(lv.get("churn_risk","low"))
        tbl = Table([[
            Paragraph(f'<b>#{lv.get("number","")} {lv.get("name","")}</b>', s["body"]),
            Paragraph(f'Difficulty: {lv.get("difficulty","")}', s["label"]),
            Paragraph(lv.get("primary_mechanic",""), s["body"]),
            Paragraph(lv.get("objective",""), s["body"]),
            Paragraph(f'Churn: {lv.get("churn_risk","").upper()}', s["label"]),
        ]], colWidths=["24%","13%","18%","30%","15%"])
        tbl.setStyle(TableStyle([
            ("BOX",(0,0),(-1,-1),0.5,risk_col),
            ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#2e2e2e")),
            ("TEXTCOLOR",(4,0),(4,0),risk_col),
            ("VALIGN",(0,0),(-1,-1),"TOP"),
            ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
            ("LEFTPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(tbl); story.append(Spacer(1,3))

    # Onboarding
    story.append(Paragraph("Onboarding sequence", s["h2"]))
    onb = data.get("onboarding_sequence", {})
    for key, label in [("level1","Level 1"),("level2","Level 2"),("level3","Level 3"),("philosophy","Philosophy")]:
        val = onb.get(key,"")
        if val: story.append(Paragraph(f'<b>{label}:</b> {val}', s["body"]))

    # Churn flags
    if data.get("churn_flags"):
        story.append(Paragraph("Churn risk flags", s["h2"]))
        for f in data.get("churn_flags", []):
            sc = _sev_color(f.get("risk","medium"))
            tbl = Table([[
                Paragraph(f'<b>Level {f.get("level","")}</b>', s["body"]),
                Paragraph(f.get("risk","").upper(), s["label"]),
                Paragraph(f.get("reason",""), s["body"]),
                Paragraph(f'Fix: {f.get("fix","")}', s["body"]),
            ]], colWidths=["13%","12%","37%","38%"])
            tbl.setStyle(TableStyle([
                ("BOX",(0,0),(-1,-1),0.5,sc),
                ("TEXTCOLOR",(1,0),(1,0),sc),
                ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#2e2e2e")),
                ("VALIGN",(0,0),(-1,-1),"TOP"),
                ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
                ("LEFTPADDING",(0,0),(-1,-1),8),
            ]))
            story.append(tbl); story.append(Spacer(1,3))

    # Designer notes
    story.append(Paragraph("Designer notes", s["h2"]))
    story.append(Paragraph(data.get("designer_notes",""), s["verdict"]))

    doc.build(story)
    return buf.getvalue()

def generate_gdd_pdf(data: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    s   = _base_styles()
    story = []

    # Cover
    story.append(Paragraph(data.get("title","Game Design Document"), s["title"]))
    story.append(Paragraph(f'{data.get("version","")} &nbsp;·&nbsp; {data.get("date","")}', s["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceAfter=12))

    def section(title, content_dict, fields):
        story.append(Paragraph(title, s["h2"]))
        for key, label in fields:
            val = content_dict.get(key, "")
            if val:
                story.append(Paragraph(f'<b>{label}:</b> {val}', s["body"]))
        story.append(Spacer(1, 8))

    # Overview
    ov = data.get("overview", {})
    section("Overview", ov, [
        ("concept","Concept"),("vision","Vision"),("target_audience","Target audience"),
        ("platform","Platform"),("genre","Genre"),("art_style","Art style"),
    ])

    # Gameplay
    gp = data.get("gameplay", {})
    section("Gameplay", gp, [
        ("core_loop","Core loop"),("session_structure","Session structure"),
        ("controls","Controls"),("progression","Progression"),("difficulty_curve","Difficulty curve"),
    ])

    # Mechanics
    story.append(Paragraph("Mechanics", s["h2"]))
    for m in data.get("mechanics", []):
        if not isinstance(m, dict): continue
        story.append(Paragraph(f'<b>{m.get("name","")}</b>', s["h3"]))
        story.append(Paragraph(m.get("description",""), s["body"]))
        story.append(Paragraph(f'<i>Why it\'s fun:</i> {m.get("player_benefit","")}', s["label"]))
        story.append(Paragraph(f'<i>Technical:</i> {m.get("implementation_notes","")}', s["label"]))
        story.append(Spacer(1,6))

    # Monetization
    mon = data.get("monetization", {})
    story.append(Paragraph("Monetization", s["h2"]))
    story.append(Paragraph(f'<b>Model:</b> {mon.get("model","")}', s["body"]))
    story.append(Paragraph(f'<b>Ads:</b> {mon.get("ads_strategy","")}', s["body"]))
    story.append(Paragraph(f'<b>Battle pass:</b> {mon.get("battle_pass","")}', s["body"]))
    story.append(Paragraph(f'<b>F2P protection:</b> {mon.get("anti_whale_measures","")}', s["body"]))
    iap = mon.get("iap_items", [])
    if iap:
        story.append(Paragraph("<b>IAP items:</b>", s["body"]))
        for item in iap:
            story.append(Paragraph(f"• {item}", s["body"]))
    story.append(Spacer(1,8))

    # Retention
    ret = data.get("retention", {})
    section("Retention strategy", ret, [
        ("day1","Day 1 hook"),("day7","Day 7 hook"),
        ("day30","Day 30 hook"),("social_features","Social features"),
    ])

    # Technical
    tech = data.get("technical", {})
    section("Technical plan", tech, [
        ("engine","Engine"),("team_size","Team size"),
        ("development_time","Timeline"),("mvp_scope","MVP scope"),
    ])

    # Risks
    story.append(Paragraph("Risks & mitigations", s["h2"]))
    for r in data.get("risks", []):
        if not isinstance(r, dict): continue
        tbl = Table([[Paragraph(f'<b>{r.get("risk","")}</b>', s["body"]),
                      Paragraph(r.get("mitigation",""), s["body"])]],
                    colWidths=["40%","60%"])
        tbl.setStyle(TableStyle([
            ("BOX",(0,0),(-1,-1),0.5,AMBER),
            ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#D3D1C7")),
            ("BACKGROUND",(0,0),(0,0),colors.HexColor("#1f1500")),
            ("VALIGN",(0,0),(-1,-1),"TOP"),("TOPPADDING",(0,0),(-1,-1),6),
            ("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(tbl); story.append(Spacer(1,4))

    # Launch
    story.append(Paragraph("Launch strategy", s["h2"]))
    story.append(Paragraph(data.get("launch_strategy",""), s["verdict"]))

    doc.build(story)
    return buf.getvalue()