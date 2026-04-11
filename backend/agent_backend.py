import os
import json
import asyncio
import httpx
from urllib.parse import urlencode
from dotenv import load_dotenv

import google.genai as genai

from prompts import (
    MECHANICS_PROMPT, BALANCE_PROMPT, COMPETITOR_PROMPT, SYNTHESIS_PROMPT,
    COMPETITOR_DEEP_DIVE_PROMPT, TREND_ANALYSIS_PROMPT, GDD_PROMPT,
    LEVEL_DESIGN_PROMPT, GAME_CODE_PROMPT,
    UNITY_CODE_PROMPT, GODOT_CODE_PROMPT,
    SOCIAL_TRENDS_PROMPT, IP_SAFETY_PROMPT,
)

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
TAVILY_KEY = os.getenv("TAVILY_API_KEY", "")
APIFY_KEY  = os.getenv("APIFY_API_KEY", "")
genai.configure(api_key=GEMINI_KEY)

APIFY_BASE = "https://api.apify.com/v2"
MODEL      = "gemini-3.1-flash-lite-preview"   # ← fixed: was invalid gemini-3.1-flash-lite-preview
MODEL_FAST = "gemini-3.1-flash-lite-preview"

# ── Tavily search ─────────────────────────────────────────────────────────────
def _tavily_search(query: str, max_results: int = 5) -> list[dict]:
    if not TAVILY_KEY:
        return []
    try:
        resp = httpx.post(
            "https://api.tavily.com/search",
            json={
                "api_key":      TAVILY_KEY,
                "query":        query,
                "max_results":  max_results,
                "search_depth": "basic",
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("results", [])
    except Exception as e:
        print(f"[Tavily error] {e}")
        return []


def _format_results(results: list) -> str:
    lines = []
    for r in results:
        lines.append(
            f"- {r.get('title', '')}\n"
            f"  {r.get('url', '')}\n"
            f"  {r.get('content', '')[:300]}"
        )
    return "\n".join(lines) if lines else "No results found."

# ── Gemini helpers ────────────────────────────────────────────────────────────

def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return raw


def _extract_json_obj(raw: str) -> str:
    start = raw.find("{")
    end   = raw.rfind("}") + 1
    if start != -1 and end > start:
        return raw[start:end]
    return raw

# ── Gemini callers (all synchronous — called via asyncio.to_thread) ───────────

def _call_gemini_sync(system_prompt: str, user_message: str) -> dict:
    m = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.7,
            response_mime_type="application/json",
            max_output_tokens=2048,
        ),
    )
    response = m.generate_content(user_message)
    return json.loads(_strip_fences(response.text))


def _call_gemini_fast(system_prompt: str, user_message: str) -> dict:
    m = genai.GenerativeModel(
        model_name=MODEL_FAST,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.5,
            response_mime_type="application/json",
            max_output_tokens=4096,
        ),
    )
    response = m.generate_content(user_message)
    return json.loads(_strip_fences(response.text))


def _call_gemini_game(user_message: str) -> dict:
    m = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=GAME_CODE_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.8,
            max_output_tokens=8192,
        ),
    )
    response = m.generate_content(user_message)
    raw = _extract_json_obj(_strip_fences(response.text))
    return json.loads(raw)


def _call_gemini_engine(user_message: str, system_prompt: str) -> dict:
    m = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.4,
            max_output_tokens=8192,
        ),
    )
    response = m.generate_content(user_message)
    raw = _extract_json_obj(_strip_fences(response.text))

    # attempt 1: direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # attempt 2: escape bare newlines inside string values
    try:
        import re
        fixed = re.sub(
            r'("(?:[^"\\]|\\.)*")',
            lambda m: m.group(0).replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t'),
            raw,
            flags=re.DOTALL,
        )
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # attempt 3: ask Gemini to repair
    fix_model = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=(
            "You are a JSON repair tool. Fix the invalid JSON so it parses correctly. "
            "Return ONLY the fixed JSON, no explanation."
        ),
        generation_config=genai.GenerationConfig(temperature=0.1, max_output_tokens=8192),
    )
    fix_resp  = fix_model.generate_content(f"Fix this invalid JSON:\n\n{raw}")
    fixed_raw = _extract_json_obj(_strip_fences(fix_resp.text))
    return json.loads(fixed_raw)


def _fix_output(data: dict) -> dict:
    for item in data.get("mechanics", []):
        if not isinstance(item, dict):
            data["mechanics"] = [
                {"name": str(m), "description": "", "player_action": ""}
                for m in data["mechanics"]
            ]
            break
    for item in data.get("balance_flags", []):
        if not isinstance(item, dict):
            data["balance_flags"] = [
                {"risk": str(f), "severity": "medium", "recommendation": ""}
                for f in data["balance_flags"]
            ]
            break
    for item in data.get("competitors", []):
        if not isinstance(item, dict):
            data["competitors"] = [
                {"title": str(c), "similarity": "", "differentiator": "", "store_url": ""}
                for c in data["competitors"]
            ]
            break
    return data

# ── Competitor helpers ────────────────────────────────────────────────────────

def _search_play_store(game_idea: str) -> str:
    keywords = " ".join(game_idea.split()[:7])
    r1 = _tavily_search(f"mobile game {keywords} Google Play Store")
    r2 = _tavily_search(f"top games similar to {keywords} App Store 2024")
    return _format_results((r1 + r2)[:8])


def _call_competitor_agent_sync(game_idea: str) -> dict:
    live = _search_play_store(game_idea)
    msg  = (
        f"Game idea: {game_idea}\n\n"
        f"Live search results:\n{live}\n\n"
        "Use these results to identify REAL competitor games."
    )
    return _call_gemini_sync(COMPETITOR_PROMPT, msg)

# ── Core analysis ─────────────────────────────────────────────────────────────

async def analyze_game_idea(game_idea: str) -> dict:
    mechanics, balance, competitors = await asyncio.gather(
        asyncio.to_thread(_call_gemini_sync, MECHANICS_PROMPT, f"Game idea: {game_idea}"),
        asyncio.to_thread(_call_gemini_sync, BALANCE_PROMPT,   f"Game idea: {game_idea}"),
        asyncio.to_thread(_call_competitor_agent_sync, game_idea),
    )

    competitors_slim = {
        "competitors": [
            {
                "title":          c.get("title", ""),
                "similarity":     c.get("similarity", ""),
                "differentiator": c.get("differentiator", ""),
                "store_url":      c.get("store_url", ""),
            }
            for c in competitors.get("competitors", [])
        ],
        "verdict": competitors.get("verdict", ""),
    }

    synthesis_input = json.dumps(
        {
            "mechanics_agent_output":  mechanics,
            "balance_agent_output":    balance,
            "competitor_agent_output": competitors_slim,
        },
        indent=2,
    )

    final = await asyncio.to_thread(_call_gemini_sync, SYNTHESIS_PROMPT, synthesis_input)
    return _fix_output(final)

# ── Competitor deep dive ──────────────────────────────────────────────────────

async def competitor_deep_dive(game_idea: str, genre: str) -> dict:
    r1, r2 = await asyncio.gather(
        asyncio.to_thread(
            _tavily_search,
            f"{genre} mobile game ratings downloads revenue Play Store App Store", 6,
        ),
        asyncio.to_thread(
            _tavily_search,
            f"top {genre} games 2024 download numbers player reviews", 5,
        ),
    )
    live = _format_results((r1 + r2)[:10])
    msg  = f"Game idea: {game_idea}\nGenre: {genre}\n\nLive market data:\n{live}"
    return await asyncio.to_thread(_call_gemini_sync, COMPETITOR_DEEP_DIVE_PROMPT, msg)

# ── Trend analysis ────────────────────────────────────────────────────────────

async def trend_analysis(game_idea: str, genre: str) -> dict:
    r1, r2, r3 = await asyncio.gather(
        asyncio.to_thread(_tavily_search, f"{genre} mobile game market trend growth 2024 2025", 5),
        asyncio.to_thread(_tavily_search, f"{genre} game genre popularity revenue statistics", 5),
        asyncio.to_thread(_tavily_search, f"mobile gaming {genre} player demographics regions", 4),
    )
    live = _format_results((r1 + r2 + r3)[:12])
    msg  = f"Game idea: {game_idea}\nGenre: {genre}\n\nLive trend data:\n{live}"
    return await asyncio.to_thread(_call_gemini_sync, TREND_ANALYSIS_PROMPT, msg)

# ── IP safety check ───────────────────────────────────────────────────────────

async def check_ip_safety(report: dict) -> dict:
    """
    Analyse the game report for IP risks before building.
    Checks title trademarks, mechanic similarity, asset risks,
    and Play Store / App Store policy violations.
    Run this immediately after analyze_game_idea() and show results
    to the user BEFORE generating code or GDD.
    """
    msg = (
        f"Analyse this game for IP risks and App Store compliance issues:\n\n"
        f"{json.dumps(report, indent=2)}"
    )
    return await asyncio.to_thread(_call_gemini_sync, IP_SAFETY_PROMPT, msg)

# ── GDD ───────────────────────────────────────────────────────────────────────

async def generate_gdd(report: dict) -> dict:
    msg = f"Generate a full GDD based on this game analysis:\n\n{json.dumps(report, indent=2)}"
    return await asyncio.to_thread(_call_gemini_sync, GDD_PROMPT, msg)

# ── Level design ──────────────────────────────────────────────────────────────

async def generate_level_design(report: dict, gdd: dict) -> dict:
    msg = (
        f"Generate a complete level design plan based on this game:\n\n"
        f"ANALYSIS REPORT:\n{json.dumps(report, indent=2)}\n\n"
        f"GDD SUMMARY (key fields only):\n"
        f"genre: {gdd.get('overview', {}).get('genre', report.get('genre', ''))}\n"
        f"mechanics: {json.dumps([m.get('name') for m in gdd.get('mechanics', [])])}\n"
        f"core_loop: {gdd.get('gameplay', {}).get('core_loop', report.get('core_loop', ''))}\n"
    )
    return await asyncio.to_thread(_call_gemini_fast, LEVEL_DESIGN_PROMPT, msg)

# ── HTML5 game code ───────────────────────────────────────────────────────────

async def generate_game_code(report: dict, gdd: dict, level_design: dict) -> dict:
    levels_1_5 = level_design.get("levels", [])[:5]
    msg = (
        f"Generate a complete HTML5 game based on this data:\n\n"
        f"GAME TITLE: {report.get('game_title', '')}\n"
        f"GENRE: {report.get('genre', '')}\n"
        f"CORE LOOP: {report.get('core_loop', '')}\n\n"
        f"MECHANICS:\n"
        f"{json.dumps([{'name': m.get('name'), 'description': m.get('description'), 'player_action': m.get('player_action')} for m in report.get('mechanics', [])], indent=2)}\n\n"
        f"CONTROLS: {gdd.get('gameplay', {}).get('controls', '')}\n"
        f"ART STYLE: {gdd.get('overview', {}).get('art_style', '')}\n"
        f"COLOR SCHEME: Yellow #FFD600 and black #0a0a0a\n\n"
        f"LEVELS 1-5:\n"
        f"{json.dumps([{'number': l.get('number'), 'name': l.get('name'), 'objective': l.get('objective'), 'primary_mechanic': l.get('primary_mechanic'), 'obstacles': l.get('obstacles', []), 'difficulty': l.get('difficulty')} for l in levels_1_5], indent=2)}\n"
    )
    return await asyncio.to_thread(_call_gemini_game, msg)

# ── Unity code ────────────────────────────────────────────────────────────────

async def generate_unity_code(report: dict, gdd: dict, level_design: dict) -> dict:
    levels_1_5 = level_design.get("levels", [])[:5]
    msg = (
        f"Generate complete Unity 2021 LTS C# scripts for this game:\n\n"
        f"GAME TITLE: {report.get('game_title', '')}\n"
        f"GENRE: {report.get('genre', '')}\n"
        f"CORE LOOP: {report.get('core_loop', '')}\n\n"
        f"MECHANICS:\n"
        f"{json.dumps([{'name': m.get('name'), 'description': m.get('description'), 'player_action': m.get('player_action')} for m in report.get('mechanics', [])], indent=2)}\n\n"
        f"CONTROLS: {gdd.get('gameplay', {}).get('controls', '')}\n"
        f"ART STYLE: {gdd.get('overview', {}).get('art_style', '')}\n"
        f"TARGET PLATFORM: {gdd.get('overview', {}).get('platform', 'Both')}\n\n"
        f"LEVELS 1-5:\n"
        f"{json.dumps([{'number': l.get('number'), 'name': l.get('name'), 'objective': l.get('objective'), 'primary_mechanic': l.get('primary_mechanic'), 'obstacles': l.get('obstacles', []), 'difficulty': l.get('difficulty')} for l in levels_1_5], indent=2)}\n"
    )
    return await asyncio.to_thread(_call_gemini_engine, msg, UNITY_CODE_PROMPT)

# ── Godot code ────────────────────────────────────────────────────────────────

async def generate_godot_code(report: dict, gdd: dict, level_design: dict) -> dict:
    levels_1_5 = level_design.get("levels", [])[:5]
    msg = (
        f"Generate complete Godot 4 GDScript files for this game:\n\n"
        f"GAME TITLE: {report.get('game_title', '')}\n"
        f"GENRE: {report.get('genre', '')}\n"
        f"CORE LOOP: {report.get('core_loop', '')}\n\n"
        f"MECHANICS:\n"
        f"{json.dumps([{'name': m.get('name'), 'description': m.get('description'), 'player_action': m.get('player_action')} for m in report.get('mechanics', [])], indent=2)}\n\n"
        f"CONTROLS: {gdd.get('gameplay', {}).get('controls', '')}\n"
        f"ART STYLE: {gdd.get('overview', {}).get('art_style', '')}\n"
        f"TARGET PLATFORM: {gdd.get('overview', {}).get('platform', 'Both')}\n\n"
        f"LEVELS 1-5:\n"
        f"{json.dumps([{'number': l.get('number'), 'name': l.get('name'), 'objective': l.get('objective'), 'primary_mechanic': l.get('primary_mechanic'), 'obstacles': l.get('obstacles', []), 'difficulty': l.get('difficulty')} for l in levels_1_5], indent=2)}\n"
    )
    return await asyncio.to_thread(_call_gemini_engine, msg, GODOT_CODE_PROMPT)

# ── Apify core runner ─────────────────────────────────────────────────────────

def _run_apify_actor(actor_id: str, input_data: dict, max_items: int = 10) -> list[dict]:
    """
    Run an Apify actor synchronously and return dataset items.

    Apify REST API rules:
      • Actor IDs in URL paths use '~' not '/':
            clockworks/tiktok-scraper  →  clockworks~tiktok-scraper
      • Correct endpoint: run-sync-get-dataset-items  (no trailing 's')
      • Confirmed actor slugs from apify.com/store:
            TikTok  : clockworks~tiktok-scraper
            YouTube : streamers~youtube-scraper
            FB Ads  : apify~facebook-ads-scraper
    """
    if not APIFY_KEY:
        print("[Apify] No API key — set APIFY_API_KEY in .env")
        return []

    api_id = actor_id.replace("/", "~")
    url    = f"{APIFY_BASE}/acts/{api_id}/run-sync-get-dataset-items"

    try:
        resp = httpx.post(
            url,
            params={"token": APIFY_KEY, "maxItems": max_items},
            json=input_data,
            timeout=120,
        )
        if resp.status_code == 404:
            print(f"[Apify 404] '{api_id}' not found — verify slug at apify.com/store")
            return []
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[Apify error] {actor_id}: {e}")
        return []

# ── Platform scrapers (sync — called via asyncio.to_thread) ──────────────────

def _scrape_tiktok(keywords: str) -> list[dict]:
    """
    Actor : clockworks/tiktok-scraper  (apify.com/clockworks/tiktok-scraper)
    Input : searchQueries (list[str]) for keyword search
            hashtags (list[str]) for hashtag search — returns far more results
    We run BOTH and merge, deduplicated by video id.
    """
    hashtag_list = [w.lower() for w in keywords.split() if len(w) > 3][:5]

    r_search = _run_apify_actor(
        "clockworks/tiktok-scraper",
        {
            "searchQueries":           [keywords],
            "maxSearchResults":        8,
            "shouldDownloadVideos":    False,
            "shouldDownloadCovers":    False,
            "shouldDownloadSubtitles": False,
        },
        max_items=8,
    )

    r_hash = _run_apify_actor(
        "clockworks/tiktok-scraper",
        {
            "hashtags":                hashtag_list,
            "resultsPerPage":          5,
            "shouldDownloadVideos":    False,
            "shouldDownloadCovers":    False,
            "shouldDownloadSubtitles": False,
        },
        max_items=8,
    )

    seen, merged = set(), []
    for item in (r_search + r_hash):
        vid_id = item.get("id", "")
        if vid_id and vid_id not in seen:
            seen.add(vid_id)
            merged.append(item)

    parsed = []
    for item in merged[:10]:
        parsed.append({
            "platform":  "TikTok",
            "title":     (item.get("text") or item.get("desc") or "")[:120],
            "author":    (
                item.get("authorMeta", {}).get("name")
                or item.get("author", {}).get("uniqueId", "")
            ),
            "views":     (
                item.get("playCount")
                or item.get("statsV2", {}).get("playCount")
                or 0
            ),
            "likes":     (
                item.get("diggCount")
                or item.get("statsV2", {}).get("diggCount")
                or 0
            ),
            "url":       (
                item.get("webVideoUrl")
                or f"https://tiktok.com/@{item.get('authorMeta', {}).get('name', '')}"
                   f"/video/{item.get('id', '')}"
            ),
            "thumbnail": (
                item.get("covers", {}).get("default")
                or item.get("video", {}).get("cover")
                or ""
            ),
            "duration":  str(
                item.get("videoMeta", {}).get("duration")
                or item.get("video", {}).get("duration")
                or ""
            ),
        })
    return parsed


def _scrape_youtube(keywords: str) -> list[dict]:
    """
    Actor : streamers/youtube-scraper  (apify.com/streamers/youtube-scraper)
    Input : searchKeywords (str), maxResults (int)
    """
    results = _run_apify_actor(
        "streamers/youtube-scraper",
        {
            "searchKeywords": keywords,
            "maxResults":     10,
        },
        max_items=10,
    )
    parsed = []
    for item in results[:10]:
        parsed.append({
            "platform":  "YouTube",
            "title":     item.get("title") or "",
            "author":    (
                item.get("channelName")
                or item.get("channel", {}).get("name")
                or ""
            ),
            "views":     item.get("viewCount") or item.get("views") or 0,
            "likes":     item.get("likes") or 0,
            "url":       (
                item.get("url")
                or f"https://youtube.com/watch?v={item.get('id', '')}"
            ),
            "thumbnail": item.get("thumbnailUrl") or item.get("thumbnail") or "",
            "duration":  str(item.get("duration") or ""),
        })
    return parsed


def _build_fb_ads_url(keyword: str, country: str = "US") -> str:
    """Build a Meta Ad Library keyword-search URL for apify/facebook-ads-scraper."""
    params = urlencode({
        "active_status": "active",
        "ad_type":       "all",
        "country":       country,
        "q":             keyword,
        "search_type":   "keyword_unordered",
        "media_type":    "all",
    })
    return f"https://www.facebook.com/ads/library/?{params}"


def _scrape_facebook_ads(keywords: str) -> list[dict]:
    """
    Actor : apify/facebook-ads-scraper  (apify.com/apify/facebook-ads-scraper)
    Input : startUrls (list[{url}]) — must be Meta Ad Library URLs
            resultsLimit (int), activeStatus (str)
    We try multiple keyword variations to maximise result count.
    """
    urls = [
        {"url": _build_fb_ads_url(keywords)},
        {"url": _build_fb_ads_url(keywords.split()[0])},
    ]
    results = _run_apify_actor(
        "apify/facebook-ads-scraper",
        {
            "startUrls":    urls,
            "resultsLimit": 10,
            "activeStatus": "active",
        },
        max_items=10,
    )

    seen, deduped = set(), []
    for item in results:
        ad_id = item.get("adArchiveID") or item.get("id") or ""
        if ad_id not in seen:
            seen.add(ad_id)
            deduped.append(item)

    parsed = []
    for item in deduped[:10]:
        snapshot  = item.get("snapshot") or {}
        images    = snapshot.get("images") or []
        body_text = (
            snapshot.get("body", {}).get("text")
            or (item.get("adCreativeBodies") or [""])[0]
            or item.get("title")
            or "Ad creative"
        )
        parsed.append({
            "platform":  "Facebook Ads",
            "title":     body_text[:120],
            "author":    item.get("pageName") or item.get("page_name") or "",
            "views":     (
                (item.get("impressionsWithIndex") or {}).get("lowerBoundCount")
                or (item.get("spend") or {}).get("lower_bound")
                or 0
            ),
            "likes":     item.get("adReactionCount") or 0,
            "url":       (
                f"https://www.facebook.com/ads/library/?id={item.get('adArchiveID')}"
                if item.get("adArchiveID")
                else "https://www.facebook.com/ads/library/"
            ),
            "thumbnail": (images[0].get("original_image_url") if images else "") or "",
            "duration":  "",
        })
    return parsed

# ── Social Gemini synthesis ───────────────────────────────────────────────────

def _analyze_social_with_gemini(
    game_title: str,
    genre: str,
    tiktok: list,
    youtube: list,
    facebook: list,
) -> dict:
    summary_data = {
        "tiktok_top":   tiktok[:10],
        "youtube_top":  youtube[:10],
        "facebook_top": facebook[:10],
    }
    prompt = (
        SOCIAL_TRENDS_PROMPT
        .replace("{genre}",      genre)
        .replace("{game_title}", game_title)
        .replace("{data}",       json.dumps(summary_data, indent=2))
    )
    m = genai.GenerativeModel(
        model_name=MODEL,
        generation_config=genai.GenerationConfig(
            temperature=0.7,
            response_mime_type="application/json",
            max_output_tokens=2048,
        ),
    )
    response = m.generate_content(prompt)
    return json.loads(_strip_fences(response.text))

# ── Social trends ─────────────────────────────────────────────────────────────

async def social_trends(game_idea: str, genre: str, game_title: str) -> dict:
    """Scrape TikTok, YouTube, Facebook Ads in parallel and synthesize insights."""
    keywords    = f"{genre} mobile game {game_title}"
    ad_keywords = f"{genre} game app"

    tiktok, youtube, facebook = await asyncio.gather(
        asyncio.to_thread(_scrape_tiktok,       keywords),
        asyncio.to_thread(_scrape_youtube,      keywords),
        asyncio.to_thread(_scrape_facebook_ads, ad_keywords),
    )

    insights = await asyncio.to_thread(
        _analyze_social_with_gemini,
        game_title, genre, tiktok, youtube, facebook,
    )

    return {
        "game_title":   game_title,
        "genre":        genre,
        "tiktok":       tiktok,
        "youtube":      youtube,
        "facebook_ads": facebook,
        "insights":     insights,
        "total_videos": len(tiktok) + len(youtube) + len(facebook),
    }
