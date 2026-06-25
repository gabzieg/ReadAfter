import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=True)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
API_TOKEN = os.getenv("API_TOKEN", "dev-kortexa-secret-token")
STORAGE_PATH   = Path(os.getenv("STORAGE_PATH", "./storage"))
TEMP_PATH      = Path(os.getenv("TEMP_PATH", "./temp"))

STORAGE_PATH.mkdir(exist_ok=True)
TEMP_PATH.mkdir(exist_ok=True)

GEMINI_MODEL = "gemini-2.5-flash"
