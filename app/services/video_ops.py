import re
import subprocess
import sys
from pathlib import Path
import yt_dlp
import imageio_ffmpeg

FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()

def extract_metadata(url: str, work_dir: Path) -> dict:
    """Extrai metadados e thumbnail sem baixar o vídeo."""
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "outtmpl": str(work_dir / "thumb"),
        "writethumbnail": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
    return info or {}

def download_audio(url: str, work_dir: Path) -> Path:
    """Baixa somente o áudio em MP3 64kbps — arquivo temporário."""
    ydl_opts = {
        "quiet": True,
        "format": "bestaudio[ext=m4a]/bestaudio",
        "outtmpl": str(work_dir / "audio.%(ext)s"),
        "ffmpeg_location": FFMPEG_PATH,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "64",
        }],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    for ext in ["mp3", "m4a", "opus", "webm"]:
        p = work_dir / f"audio.{ext}"
        if p.exists():
            return p

    raise FileNotFoundError("Arquivo de áudio não encontrado após download")

def extract_frames(url: str, work_dir: Path, duration: int, n_frames: int = 4) -> list[tuple[Path, float]]:
    """Extrai N frames distribuídos ao longo de TODO o vídeo, devolvendo (arquivo, segundo).

    O timestamp é o que permite casar cada imagem com o trecho falado naquele
    momento — sem ele as imagens não têm como ser posicionadas no parágrafo certo.
    """
    ffmpeg_exe = FFMPEG_PATH

    proc1 = subprocess.run([
        sys.executable, "-m", "yt_dlp", "-g", "--format", "bestvideo[height<=480]/best[height<=480]/best",
        "--ffmpeg-location", str(Path(ffmpeg_exe).parent), url
    ], capture_output=True, text=True)

    stream_url = proc1.stdout.strip().split("\n")[0]
    if not stream_url:
        print("YT-DLP Error:", proc1.stderr)
        return []

    results = []
    for idx, position in enumerate(_frame_positions(n_frames), start=1):
        timestamp = round(max(0.0, duration * position), 2)
        output = work_dir / f"frame_{idx:02d}.jpg"

        subprocess.run([
            ffmpeg_exe,
            "-ss", str(timestamp),      # seek na entrada: rápido mesmo em stream
            "-i", stream_url,
            "-frames:v", "1",
            "-vf", "scale=640:-1",
            "-q:v", "3",
            str(output),
            "-y", "-loglevel", "error"
        ])

        if output.exists():
            results.append((output, timestamp))

    return results

def _frame_positions(n_frames: int) -> list[float]:
    """Frações da duração, evitando o primeiro e o último instante (costumam ser transições)."""
    return [(i + 0.5) / n_frames for i in range(n_frames)]

def probe_duration(media_path: Path) -> int:
    """Lê a duração em segundos de um arquivo de mídia via FFmpeg (fallback quando o yt-dlp não informa)."""
    if not media_path or not media_path.exists():
        return 0

    proc = subprocess.run([FFMPEG_PATH, "-i", str(media_path)], capture_output=True, text=True)
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+)", proc.stderr or "")
    if not match:
        return 0

    h, m, s = (int(g) for g in match.groups())
    return h * 3600 + m * 60 + s

def format_duration(seconds: int) -> str:
    if not seconds:
        return "0:00"
    m, s = divmod(int(seconds), 60)
    return f"{m}:{s:02d}"
