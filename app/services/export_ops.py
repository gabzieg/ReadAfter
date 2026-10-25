from pathlib import Path

from app.services.stt_ops import format_timestamp

TRANSCRIPT_FILENAME = "transcricao.txt"
RULE = "-" * 60

def write_transcript_file(work_dir: Path, meta: dict, url: str, duration: str,
                          stt: dict, frame_texts: list[str]) -> Path:
    """Grava o .txt com o conteúdo completo do Reel: texto corrido, versão com tempos e OCR."""
    full_text = (stt.get("text") or "").strip()
    segments = stt.get("segments") or []

    lines = [
        (meta.get("title") or "Reel sem título").strip(),
        "=" * 60,
        f"Autor: {meta.get('uploader', 'Desconhecido')}",
        f"Duração: {duration}",
        f"Idioma detectado: {stt.get('language') or '—'}",
        f"URL: {url}",
        "",
        "DESCRIÇÃO ORIGINAL",
        RULE,
        (meta.get("description") or "(sem descrição)").strip(),
        "",
        "TRANSCRIÇÃO COMPLETA",
        RULE,
        full_text or "(áudio sem fala detectada)",
    ]

    if segments:
        lines += ["", "TRANSCRIÇÃO COM TEMPOS", RULE]
        lines += [f"[{format_timestamp(s['start'])}] {s['text']}" for s in segments]

    if any(text.strip() for text in frame_texts):
        lines += ["", "TEXTOS NA TELA", RULE]
        for idx, text in enumerate(frame_texts):
            if text.strip():
                lines += [f"--- IMAGEM {idx + 1} ---", text.strip(), ""]

    path = work_dir / TRANSCRIPT_FILENAME
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return path
