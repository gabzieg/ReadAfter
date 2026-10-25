import sqlite3
import json
import os
from pathlib import Path
from app.core.config import STORAGE_PATH

def get_db():
    conn = sqlite3.connect(STORAGE_PATH / "reels.sqlite")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reels (
                id TEXT PRIMARY KEY,
                url TEXT UNIQUE,
                author TEXT,
                author_id TEXT,
                title TEXT,
                summary TEXT,
                tags TEXT,
                ingredients TEXT,
                duration TEXT,
                thumbnail TEXT,
                transcript TEXT,
                visual TEXT,
                saved_at TEXT,
                central_theme TEXT,
                links TEXT,
                action_items TEXT,
                products TEXT,
                complexity TEXT,
                quote TEXT,
                is_liked INTEGER DEFAULT 0,
                is_archived INTEGER DEFAULT 0,
                folder_id TEXT DEFAULT NULL,
                full_transcript TEXT,
                transcript_file TEXT,
                transcript_segments TEXT,
                detected_language TEXT
            )
        """)
        
        # Migrations for existing DBs
        try:
            conn.execute("ALTER TABLE reels ADD COLUMN central_theme TEXT")
            conn.execute("ALTER TABLE reels ADD COLUMN links TEXT")
            conn.execute("ALTER TABLE reels ADD COLUMN action_items TEXT")
            conn.execute("ALTER TABLE reels ADD COLUMN products TEXT")
            conn.execute("ALTER TABLE reels ADD COLUMN complexity TEXT")
            conn.execute("ALTER TABLE reels ADD COLUMN quote TEXT")
        except sqlite3.OperationalError:
            pass
            
        try:
            conn.execute("ALTER TABLE reels ADD COLUMN is_liked INTEGER DEFAULT 0")
            conn.execute("ALTER TABLE reels ADD COLUMN is_archived INTEGER DEFAULT 0")
            conn.execute("ALTER TABLE reels ADD COLUMN folder_id TEXT DEFAULT NULL")
        except sqlite3.OperationalError:
            pass

        # Transcrição integral em .txt (independente do resumo/artigo)
        for column in ("full_transcript TEXT", "transcript_file TEXT",
                       "transcript_segments TEXT", "detected_language TEXT"):
            try:
                conn.execute(f"ALTER TABLE reels ADD COLUMN {column}")
            except sqlite3.OperationalError:
                pass

        conn.execute("""
            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT,
                is_pinned INTEGER DEFAULT 0,
                updated_at TEXT
            )
        """)

def _migrate_json():
    json_path = STORAGE_PATH / "reels.json"
    if json_path.exists():
        try:
            old_reels = json.loads(json_path.read_text())
            with get_db() as conn:
                for r in old_reels:
                    try:
                        conn.execute("""
                            INSERT INTO reels (id, url, author, author_id, title, summary, tags, ingredients, duration, thumbnail, transcript, visual, saved_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            r["id"], r.get("url", ""), r.get("author", ""), r.get("author_id", ""),
                            r.get("title", ""), r.get("summary", ""), json.dumps(r.get("tags", [])),
                            json.dumps(r.get("ingredients")) if r.get("ingredients") else None,
                            r.get("duration", ""), r.get("thumbnail", ""), r.get("transcript", ""),
                            r.get("visual", ""), r.get("saved_at", "")
                        ))
                    except sqlite3.IntegrityError:
                        pass
            os.rename(json_path, str(json_path) + ".bak")
        except Exception:
            pass
