from typing import Dict, Any

# Armazena o status dos jobs de processamento de vídeos.
# Na Fase 2 isso será movido para Redis / Celery.
jobs: Dict[str, Dict[str, Any]] = {}
