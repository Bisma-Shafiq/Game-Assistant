from pydantic import BaseModel
from typing import List, Optional


# ── Core analysis ─────────────────────────────────────────────────────────────

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
    store_url: Optional[str] = None


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


# ── Competitor deep dive ──────────────────────────────────────────────────────

class CompetitorDeepDiveRequest(BaseModel):
    game_idea: str
    genre: str


class CompetitorDetail(BaseModel):
    title: str
    developer: str
    genre: str
    rating: str
    downloads: str
    last_update: str
    revenue_tier: str
    platform: str
    similarity: str
    weakness: str


class CompetitorDeepDiveResponse(BaseModel):
    competitors: List[CompetitorDetail]
    market_summary: str


# ── Trend analysis ────────────────────────────────────────────────────────────

class TrendRequest(BaseModel):
    game_idea: str
    genre: str


class KeyTrend(BaseModel):
    trend: str
    impact: str
    description: str


class TrendResponse(BaseModel):
    genre: str
    trend_direction: str
    trend_summary: str
    peak_year: str
    current_market_size: str
    top_regions: List[str]
    player_demographics: str
    monetization_trend: str
    key_trends: List[KeyTrend]
    recommendation: str


# ── GDD ───────────────────────────────────────────────────────────────────────

class GDDRequest(BaseModel):
    report: AnalyzeResponse


class GDDOverview(BaseModel):
    concept: str
    vision: str
    target_audience: str
    platform: str
    genre: str
    art_style: str


class GDDGameplay(BaseModel):
    core_loop: str
    session_structure: str
    controls: str
    progression: str
    difficulty_curve: str


class GDDMechanic(BaseModel):
    name: str
    description: str
    player_benefit: str
    implementation_notes: str


class GDDMonetization(BaseModel):
    model: str
    iap_items: List[str]
    ads_strategy: str
    battle_pass: str
    anti_whale_measures: str


class GDDRetention(BaseModel):
    day1: str
    day7: str
    day30: str
    social_features: str


class GDDTechnical(BaseModel):
    engine: str
    team_size: str
    development_time: str
    mvp_scope: str


class GDDRisk(BaseModel):
    risk: str
    mitigation: str


class GDDResponse(BaseModel):
    title: str
    version: str
    date: str
    overview: GDDOverview
    gameplay: GDDGameplay
    mechanics: List[GDDMechanic]
    monetization: GDDMonetization
    retention: GDDRetention
    technical: GDDTechnical
    risks: List[GDDRisk]
    launch_strategy: str


# ── Level Design ──────────────────────────────────────────────────────────────

class LevelDesignRequest(BaseModel):
    report: AnalyzeResponse
    gdd: GDDResponse


class World(BaseModel):
    number: int
    name: str
    theme: str
    level_count: int
    unlock_requirement: str
    new_mechanic: str


class MechanicScheduleItem(BaseModel):
    level: int
    mechanic: str
    introduction_type: str
    description: str


class Level(BaseModel):
    number: int
    name: str
    world: int
    difficulty: int
    primary_mechanic: str
    secondary_mechanic: Optional[str] = None
    objective: str
    obstacles: List[str]
    churn_risk: str
    churn_reason: Optional[str] = None
    onboarding_note: Optional[str] = None
    estimated_attempts: int


class DifficultyPoint(BaseModel):
    level: int
    score: int


class ChurnFlag(BaseModel):
    level: int
    risk: str
    reason: str
    fix: str


class OnboardingSequence(BaseModel):
    level1: str
    level2: str
    level3: str
    philosophy: str


class LevelDesignResponse(BaseModel):
    worlds: List[World]
    mechanic_schedule: List[MechanicScheduleItem]
    levels: List[Level]
    difficulty_curve: List[DifficultyPoint]
    churn_flags: List[ChurnFlag]
    onboarding_sequence: OnboardingSequence
    designer_notes: str


# ── Social Trends ─────────────────────────────────────────────────────────────

class SocialTrendsRequest(BaseModel):
    game_idea: str
    genre: str
    game_title: str


# UPDATED: Improved Social Trends Schema
class SocialVideo(BaseModel):
    platform: str
    title: str
    author: str
    views: int
    likes: int
    url: str
    thumbnail: str
    duration: Optional[str] = None


class CreativeDirection(BaseModel):
    direction: str
    description: str
    platform: str
    inspiration: str


class SocialInsights(BaseModel):
    overall_buzz: str  # Low, Medium, High, Viral
    buzz_summary: str
    top_themes: List[str]
    best_platform: str  # TikTok, YouTube, Facebook Ads
    best_platform_reason: str
    creative_directions: List[CreativeDirection]
    hook_ideas: List[str]
    recommended_hashtags: List[str]


class SocialTrendsResponse(BaseModel):
    game_title: str
    genre: str
    tiktok: List[SocialVideo]
    youtube: List[SocialVideo]
    facebook_ads: List[SocialVideo]
    insights: SocialInsights
    total_videos: int


# ── Game Code ─────────────────────────────────────────────────────────────────

class GameCodeRequest(BaseModel):
    report: AnalyzeResponse
    gdd: GDDResponse
    level_design: LevelDesignResponse


class GameCodeResponse(BaseModel):
    game_title: str
    html: str  # CRITICAL: Complete, playable HTML5 game
    controls: str  # 2-3 sentences on keyboard + touch controls
    tech_notes: str  # 2-3 sentences on mechanics and technical approach
    report: Optional[AnalyzeResponse] = None
    gdd: Optional[GDDResponse] = None


# ── Unity Code ────────────────────────────────────────────────────────────────

class UnityScript(BaseModel):
    filename: str
    path: str
    content: str


class UnityCodeRequest(BaseModel):
    report: AnalyzeResponse
    gdd: GDDResponse
    level_design: LevelDesignResponse


class UnityCodeResponse(BaseModel):
    game_title: str
    engine: str
    scripts: List[UnityScript]
    project_version: str
    packages: List[str]
    setup_md: str
    architecture_notes: str


# ── Godot Code ────────────────────────────────────────────────────────────────

class GodotScript(BaseModel):
    filename: str
    path: str
    content: str


class GodotCodeRequest(BaseModel):
    report: AnalyzeResponse
    gdd: GDDResponse
    level_design: LevelDesignResponse


class GodotCodeResponse(BaseModel):
    game_title: str
    engine: str
    scripts: List[GodotScript]
    project_godot: str
    setup_md: str
    architecture_notes: str


# ── IP Safety Check ───────────────────────────────────────────────────────────

class TitleRisk(BaseModel):
    issue: str
    severity: str  # High, Medium, Low
    example: str
    fix: str


class StorePolicyRisk(BaseModel):
    platform: str  # App Store, Google Play, Steam, etc.
    policy: str
    reason: str
    fix: str


class ClearanceItem(BaseModel):
    item: str


class IpSafetyResponse(BaseModel):
    overall_risk: str  # Low, Medium, High, Critical
    risk_summary: str
    title_risks: List[TitleRisk]
    store_policy_risks: List[StorePolicyRisk]
    safe_title_suggestions: List[str]
    clearance_checklist: List[ClearanceItem]
    legal_disclaimer: Optional[str] = None