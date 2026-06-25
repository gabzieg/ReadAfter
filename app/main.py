"""
ReelSnap Backend — Instapaper para Reels do Instagram (Refatorado)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import STORAGE_PATH
from app.db.database import init_db
from app.routers import reels, folders

# 1. Inicializa o banco de dados e migrações
init_db()

# 2. Configura a Aplicação Central
app = FastAPI(
    title="Kortexa API",
    description="Backend para salvar, transcrever e resumir Reels do Instagram com Gemini",
    version="2.1.0",
)

# 3. Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Arquivos Estáticos (Thumbnails/Frames)
app.mount("/storage", StaticFiles(directory=STORAGE_PATH), name="storage")

# 5. Roteadores modulares (APIRouter)
app.include_router(reels.router, tags=["Reels"])
app.include_router(folders.router, tags=["Folders"])

@app.get("/")
def root():
    return {
        "service": "Kortexa API", 
        "version": "2.1.0", 
        "status": "ok", 
        "ia": "Gemini"
    }
