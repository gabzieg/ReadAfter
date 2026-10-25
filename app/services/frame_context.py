"""Monta o contexto de cada frame: quando foi capturado, o que aparece escrito e o que estava sendo dito.

É esse cruzamento (imagem x fala no mesmo instante) que permite ao modelo colocar
cada [IMAGEM_X] no parágrafo que realmente fala sobre aquilo.
"""
import re

from app.services.stt_ops import format_timestamp

URL_PATTERN = re.compile(r"(?:https?://|www\.)[^\s<>\"')\]]+", re.IGNORECASE)
BARE_DOMAIN_PATTERN = re.compile(
    r"\b(?:[a-z0-9][a-z0-9-]*\.)+(?:com|org|net|io|dev|ai|app|co|gg|me|br)(?:/[^\s<>\"')\]]*)?",
    re.IGNORECASE,
)

def build_frame_contexts(frames: list[tuple], frame_texts: list[str], segments: list[dict]) -> list[dict]:
    """Une frame + timestamp + OCR + fala do momento."""
    contexts = []
    for idx, (path, timestamp) in enumerate(frames):
        contexts.append({
            "number": idx + 1,
            "timestamp": timestamp,
            "time_label": format_timestamp(timestamp),
            "screen_text": (frame_texts[idx] if idx < len(frame_texts) else "").strip(),
            "spoken": _spoken_around(segments, timestamp),
        })
    return contexts

def _spoken_around(segments: list[dict], timestamp: float, window: float = 4.0) -> str:
    """Texto falado no instante do frame (com uma folga antes/depois)."""
    if not segments:
        return ""

    hits = [
        s["text"] for s in segments
        if s["start"] - window <= timestamp <= s["end"] + window
    ]
    if not hits:
        # Nenhum segmento cobre esse instante: usa o mais próximo.
        nearest = min(segments, key=lambda s: abs(s["start"] - timestamp))
        hits = [nearest["text"]]

    return " ".join(hits).strip()

def collect_links(description: str, transcript: str) -> list[str]:
    """Extrai URLs reais da descrição e da fala.

    Deliberadamente NÃO usa o OCR: o texto lido da tela mutila URLs (perde o ponto
    do domínio, troca caracteres) e gera links quebrados. URLs de recursos que só
    aparecem na tela ficam por conta do modelo, que resolve o nome do recurso.
    """
    haystack = "\n".join([description or "", transcript or ""])

    found = []
    for match in URL_PATTERN.findall(haystack):
        found.append(match.rstrip(".,;:"))
    for match in BARE_DOMAIN_PATTERN.findall(haystack):
        cleaned = match.rstrip(".,;:")
        if not any(cleaned.lower() in f.lower() for f in found):
            found.append(cleaned)

    # Normaliza e remove duplicatas preservando a ordem
    seen = set()
    unique = []
    for link in found:
        url = link if link.lower().startswith("http") else f"https://{link}"
        key = url.lower().rstrip("/")
        if key not in seen:
            seen.add(key)
            unique.append(url)

    return unique[:15]
