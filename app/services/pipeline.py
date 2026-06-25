import uuid
import os
import json
import asyncio
import sqlite3
from datetime import datetime
from pathlib import Path

from app.core.config import STORAGE_PATH
from app.core.state import jobs
from app.db.database import get_db
from app.services.video_ops import extract_metadata, download_audio, extract_frames, format_duration
from app.services.ai_ops import analyze_reel_multimodal

async def process_reel(job_id: str, url: str):
    reel_id  = str(uuid.uuid4())
    work_dir = STORAGE_PATH / reel_id
    work_dir.mkdir(exist_ok=True)

    def update(step: str):
        jobs[job_id] = {"status": "processing", "step": step, "error": None, "reel_id": None}

    try:
        update("Acessando o Reel e extraindo metadados")
        meta = await asyncio.to_thread(extract_metadata, url, work_dir)

        update("Baixando áudio para transcrição")
        audio_path = await asyncio.to_thread(download_audio, url, work_dir)

        update("Extraindo frames do vídeo")
        frames = await asyncio.to_thread(extract_frames, url, work_dir)

        update("Gerando Artigo Ilustrado com Gemini Multimodal")
        analysis = await asyncio.to_thread(analyze_reel_multimodal, meta, audio_path, frames)

        update("Salvando no banco de dados")
        
        frame_urls = [f"{os.getenv('EXPO_PUBLIC_API_URL', 'http://10.0.2.2:8000')}/storage/{reel_id}/{f.name}" for f in frames]
        
        reel = {
            "id":          reel_id,
            "url":         url,
            "author":      meta.get("uploader", "Desconhecido"),
            "author_id":   meta.get("uploader_id", ""),
            "title":       meta.get("title", ""),
            "summary":     analysis.get("central_theme", ""),
            "tags":        [],
            "ingredients": [],
            "duration":    format_duration(meta.get("duration", 0)),
            "thumbnail":   meta.get("thumbnail", ""),
            "transcript":  analysis.get("article", ""),
            "visual":      json.dumps(frame_urls),
            "saved_at":    datetime.utcnow().isoformat(),
            "central_theme": analysis.get("central_theme", ""),
            "links":       analysis.get("links", []),
            "action_items": analysis.get("action_items", []),
            "products":    [],
            "complexity":  "",
            "quote":       ""
        }

        with get_db() as conn:
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO reels
                    (id, url, author, author_id, title, summary, tags, ingredients, duration, thumbnail, transcript, visual, saved_at, central_theme, links, action_items, products, complexity, quote)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    reel["id"], reel["url"], reel["author"], reel["author_id"],
                    reel["title"], reel["summary"], json.dumps(reel["tags"]),
                    json.dumps(reel["ingredients"]), str(reel["duration"]), 
                    reel["thumbnail"], reel["transcript"], reel["visual"], reel["saved_at"],
                    reel["central_theme"], json.dumps(reel["links"]), json.dumps(reel["action_items"]),
                    json.dumps(reel["products"]), reel["complexity"], reel["quote"]
                ))
            except sqlite3.IntegrityError:
                pass

        jobs[job_id] = {
            "status":  "done",
            "step":    "Concluído",
            "error":   None,
            "reel_id": reel_id,
            "reel":    reel,
        }

    except Exception as exc:
        import traceback
        jobs[job_id] = {
            "status":  "error",
            "step":    "Erro no processamento",
            "error":   f"{type(exc).__name__}: {str(exc)}\n{traceback.format_exc()}",
            "reel_id": None,
        }
    finally:
        if 'audio_path' in locals() and audio_path and audio_path.exists():
            try:
                audio_path.unlink()
            except:
                pass
