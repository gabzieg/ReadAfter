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
from app.services.video_ops import extract_metadata, download_audio, extract_frames, format_duration, probe_duration
from app.services.ai_ops import analyze_reel
from app.services.stt_ops import transcribe_local
from app.services.ocr_ops import read_frames
from app.services.frame_context import build_frame_contexts, collect_links
from app.services.export_ops import write_transcript_file

# Processa um Reel por vez: o free tier do Gemini limita as requisições por minuto.
_queue_lock = asyncio.Lock()

async def process_reel(job_id: str, url: str):
    if _queue_lock.locked():
        jobs[job_id] = {"status": "queued", "step": "Na fila", "error": None, "reel_id": None}

    async with _queue_lock:
        await _process_reel(job_id, url)

async def _process_reel(job_id: str, url: str):
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

        # A duração precisa ser conhecida ANTES dos frames, para distribuí-los pelo vídeo todo.
        duration_seconds = meta.get("duration") or probe_duration(audio_path)

        update("Extraindo frames ao longo do vídeo")
        frames = await asyncio.to_thread(extract_frames, url, work_dir, duration_seconds)

        update("Transcrevendo localmente com Whisper")
        stt = await asyncio.to_thread(transcribe_local, audio_path)
        full_text = stt["text"]

        update("Lendo os textos da tela (OCR local)")
        frame_paths = [path for path, _ in frames]
        frame_texts = await asyncio.to_thread(read_frames, frame_paths)

        update("Gerando Artigo Ilustrado com Gemini")
        frame_contexts = build_frame_contexts(frames, frame_texts, stt["segments"])
        link_candidates = collect_links(meta.get("description", ""), full_text)
        analysis = await asyncio.to_thread(
            analyze_reel, meta, full_text, frame_contexts, link_candidates
        )

        update("Salvando no banco de dados")

        base_url = os.getenv('EXPO_PUBLIC_API_URL', 'http://10.0.2.2:8000')
        frame_urls = [f"{base_url}/storage/{reel_id}/{f.name}" for f in frame_paths]

        duration = format_duration(duration_seconds)
        transcript_path = write_transcript_file(
            work_dir, meta, url, duration, stt, frame_texts
        )
        transcript_url = f"{base_url}/storage/{reel_id}/{transcript_path.name}"

        reel = {
            "id":          reel_id,
            "url":         url,
            "author":      meta.get("uploader", "Desconhecido"),
            "author_id":   meta.get("uploader_id", ""),
            "title":       meta.get("title", ""),
            "summary":     analysis.get("central_theme", ""),
            "tags":        [],
            "ingredients": [],
            "duration":    duration,
            "thumbnail":   meta.get("thumbnail", ""),
            "transcript":  analysis.get("article", ""),
            "visual":      json.dumps(frame_urls),
            "saved_at":    datetime.utcnow().isoformat(),
            "central_theme": analysis.get("central_theme", ""),
            "links":       analysis.get("links", []),
            "action_items": analysis.get("action_items", []),
            "products":    [],
            "complexity":  "",
            "quote":       "",
            "full_transcript": full_text,
            "transcript_file": transcript_url,
            "transcript_segments": json.dumps(stt["segments"]),
            "detected_language": stt["language"]
        }

        with get_db() as conn:
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO reels
                    (id, url, author, author_id, title, summary, tags, ingredients, duration, thumbnail, transcript, visual, saved_at, central_theme, links, action_items, products, complexity, quote, full_transcript, transcript_file, transcript_segments, detected_language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    reel["id"], reel["url"], reel["author"], reel["author_id"],
                    reel["title"], reel["summary"], json.dumps(reel["tags"]),
                    json.dumps(reel["ingredients"]), str(reel["duration"]),
                    reel["thumbnail"], reel["transcript"], reel["visual"], reel["saved_at"],
                    reel["central_theme"], json.dumps(reel["links"]), json.dumps(reel["action_items"]),
                    json.dumps(reel["products"]), reel["complexity"], reel["quote"],
                    reel["full_transcript"], reel["transcript_file"],
                    reel["transcript_segments"], reel["detected_language"]
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
