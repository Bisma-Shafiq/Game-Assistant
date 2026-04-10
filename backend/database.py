import sqlite3
import json
import uuid
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "gddai.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS shares (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                genre       TEXT,
                created_at  TEXT NOT NULL,
                data        TEXT NOT NULL
            )
        """)
        conn.commit()

# ── call init on import ───────────────────────────────────────────────────────
init_db()

# ── CRUD ──────────────────────────────────────────────────────────────────────

def create_share(data: dict) -> str:
    """Persist a session and return the share id."""
    share_id   = uuid.uuid4().hex[:10]          # e.g. "a3f8c12e90"
    title      = data.get("report", {}).get("game_title", "Untitled")
    genre      = data.get("report", {}).get("genre", "")
    created_at = datetime.utcnow().isoformat()

    with get_conn() as conn:
        conn.execute(
            "INSERT INTO shares (id, title, genre, created_at, data) VALUES (?,?,?,?,?)",
            (share_id, title, genre, created_at, json.dumps(data))
        )
        conn.commit()
    return share_id

def get_share(share_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM shares WHERE id = ?", (share_id,)).fetchone()
    if not row:
        return None
    return {
        "id":         row["id"],
        "title":      row["title"],
        "genre":      row["genre"],
        "created_at": row["created_at"],
        "data":       json.loads(row["data"]),
    }

def list_shares() -> list[dict]:
    """Return all shares (metadata only — no data blob)."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, title, genre, created_at FROM shares ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]

def delete_share(share_id: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM shares WHERE id = ?", (share_id,))
        conn.commit()
    return cur.rowcount > 0