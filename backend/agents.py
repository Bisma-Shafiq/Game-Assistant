import os
import json
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv
from prompts import MECHANICS_PROMPT, BALANCE_PROMPT, COMPETITOR_PROMPT, SYNTHESIS_PROMPT

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-3-flash-preview"

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
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
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
