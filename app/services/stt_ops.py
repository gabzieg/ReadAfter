"""Transcrição local com faster-whisper — o áudio nunca sai da máquina."""
import os
from pathlib import Path
from functools import lru_cache

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "large-v3")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "auto")
WHISPER_COMPUTE = os.getenv("WHISPER_COMPUTE_TYPE", "")

def _register_cuda_dlls():
    """No Windows as DLLs de cuDNN/cuBLAS vêm nos wheels da NVIDIA e não entram no PATH sozinhas."""
    if not hasattr(os, "add_dll_directory"):
        return

    try:
        import nvidia
    except ImportError:
        return

    # `nvidia` é namespace package: sem __file__, os diretórios vêm em __path__
    bin_dirs = [
        str(bin_dir)
        for root in nvidia.__path__
        for bin_dir in Path(root).glob("*/bin")
    ]
    if not bin_dirs:
        return

    for bin_dir in bin_dirs:
        try:
            os.add_dll_directory(bin_dir)
        except OSError:
            pass

    # O CTranslate2 carrega o cuBLAS com LoadLibrary simples, que ignora
    # add_dll_directory e procura no PATH — daí precisar dos dois.
    os.environ["PATH"] = os.pathsep.join(bin_dirs) + os.pathsep + os.environ.get("PATH", "")

@lru_cache(maxsize=1)
def _get_model():
    """Carrega o modelo uma vez só; cai para CPU se a GPU não estiver disponível."""
    _register_cuda_dlls()
    from faster_whisper import WhisperModel

    attempts = []
    if WHISPER_DEVICE in ("auto", "cuda"):
        attempts.append(("cuda", WHISPER_COMPUTE or "float16"))
    attempts.append(("cpu", WHISPER_COMPUTE or "int8"))

    last_error = None
    for device, compute_type in attempts:
        try:
            model = WhisperModel(WHISPER_MODEL, device=device, compute_type=compute_type)
            print(f"[stt_ops] Whisper '{WHISPER_MODEL}' carregado em {device}/{compute_type}")
            return model
        except Exception as exc:
            last_error = exc
            print(f"[stt_ops] Falha ao carregar em {device}/{compute_type}: {exc}")

    raise RuntimeError(f"Não foi possível carregar o Whisper: {last_error}")

def transcribe_local(audio_path: Path) -> dict:
    """Devolve {'text', 'segments': [{'start','end','text'}], 'language'}."""
    if not audio_path or not audio_path.exists():
        return {"text": "", "segments": [], "language": ""}

    segments, info = _get_model().transcribe(
        str(audio_path),
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    items = [
        {"start": seg.start, "end": seg.end, "text": seg.text.strip()}
        for seg in segments
        if seg.text.strip()
    ]

    return {
        "text": " ".join(item["text"] for item in items),
        "segments": items,
        "language": info.language,
    }

def format_timestamp(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m:02d}:{s:02d}"
