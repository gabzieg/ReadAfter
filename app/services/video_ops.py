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

def extract_frames(url: str, work_dir: Path, n_frames: int = 4) -> list[Path]:
    """Extrai N frames via stream FFmpeg sem baixar o vídeo completo (Síncrono para threads)."""
    ffmpeg_exe  = FFMPEG_PATH

    proc1 = subprocess.run([
        sys.executable, "-m", "yt_dlp", "-g", "--format", "bestvideo[height<=480]/best[height<=480]/best",
        "--ffmpeg-location", str(Path(ffmpeg_exe).parent), url
    ], capture_output=True, text=True)
    
    stream_url = proc1.stdout.strip().split("\n")[0]
    if not stream_url:
        print("YT-DLP Error:", proc1.stderr)
        return []

    output_pattern = str(work_dir / "frame_%02d.jpg")
    subprocess.run([
        ffmpeg_exe, "-i", stream_url,
        "-vf", f"fps=1/{max(1, 30 // n_frames)},scale=640:-1",
        "-vframes", str(n_frames),
        "-q:v", "3",
        output_pattern,
        "-y", "-loglevel", "error"
    ])

    return sorted(work_dir.glob("frame_*.jpg"))

def format_duration(seconds: int) -> str:
    if not seconds:
        return "0:00"
    m, s = divmod(int(seconds), 60)
    return f"{m}:{s:02d}"
