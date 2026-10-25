"""OCR local dos frames — extrai os textos na tela sem enviar imagem para fora.

Usa o EasyOCR (PyTorch). Por padrão roda na CPU para não disputar a VRAM
com o Whisper; defina OCR_GPU=1 para usar a GPU.
"""
import os
from pathlib import Path
from functools import lru_cache

MIN_CONFIDENCE = 0.4
OCR_LANGS = [s.strip() for s in os.getenv("OCR_LANGS", "pt,en").split(",") if s.strip()]
OCR_GPU = os.getenv("OCR_GPU", "0") == "1"

@lru_cache(maxsize=1)
def _get_engine():
    import easyocr
    print(f"[ocr_ops] EasyOCR carregando (langs={OCR_LANGS}, gpu={OCR_GPU})")
    # verbose=False evita a barra de progresso com caracteres que quebram
    # consoles não-UTF8 (Windows cp1252) no primeiro download dos modelos.
    return easyocr.Reader(OCR_LANGS, gpu=OCR_GPU, verbose=False)

def read_frames(frames: list[Path]) -> list[str]:
    """Devolve um bloco de texto por frame, na mesma ordem recebida."""
    engine = _get_engine()
    results = []

    for frame in frames:
        try:
            detections = engine.readtext(str(frame), detail=1, paragraph=False)
        except Exception as exc:
            print(f"[ocr_ops] Falha no OCR de {frame.name}: {exc}")
            results.append("")
            continue

        lines = [
            text.strip()
            for _box, text, score in detections
            if text and text.strip() and float(score) >= MIN_CONFIDENCE
        ]
        results.append("\n".join(_dedupe(lines)))

    return results

def _dedupe(lines: list[str]) -> list[str]:
    """Remove repetições preservando a ordem (legendas queimadas repetem entre frames)."""
    seen = set()
    unique = []
    for line in lines:
        key = line.lower()
        if key not in seen:
            seen.add(key)
            unique.append(line)
    return unique
