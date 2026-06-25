import json
from pathlib import Path
from google import genai
from google.genai import types
from app.core.config import GOOGLE_API_KEY, GEMINI_MODEL

client = genai.Client(api_key=GOOGLE_API_KEY)

def analyze_reel_multimodal(meta: dict, audio_path: Path, frames: list[Path]) -> dict:
    """Envia Áudio + Frames de uma vez só para o Gemini gerar o Artigo Ilustrado e Meta-dados."""
    parts = []
    
    if audio_path and audio_path.exists():
        parts.append(types.Part.from_bytes(data=audio_path.read_bytes(), mime_type="audio/mp3"))
        
    for idx, frame in enumerate(frames[:4]):
        parts.append(f"--- IMAGEM {idx+1} ---")
        parts.append(types.Part.from_bytes(data=frame.read_bytes(), mime_type="image/jpeg"))

    prompt = f"""Você é um assistente especialista em analisar vídeos.
Sua tarefa é criar um Artigo Ilustrado e um resumo estruturado baseado neste Reel do Instagram.

Título Original: {meta.get('title', '')}
Descrição Original: {meta.get('description', '')}

Regras para o 'article' (Artigo Ilustrado):
- Escreva um artigo fluido e embasado, contando o que foi ensinado no vídeo de forma clara e intuitiva.
- SEMPRE que você estiver explicando algo que faz sentido ser ilustrado pelas imagens enviadas, insira a tag exata `[IMAGEM_X]` no meio do texto, onde X é o número da imagem (1, 2, 3 ou 4).
- Por exemplo: "O criador mostra como configurar a tela [IMAGEM_2]. Em seguida..."

Retorne APENAS um JSON válido seguindo EXATAMENTE esta estrutura:
```json
{{
  "central_theme": "Assunto principal em uma frase de impacto",
  "article": "O texto do artigo ilustrado contendo as tags [IMAGEM_1], etc...",
  "action_items": ["Passo 1 prático...", "Passo 2 prático..."],
  "links": ["https://google.com/search?q=Termo1"]
}}
```
"""
    parts.append(prompt)
    
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=parts,
    )
    
    raw = response.text.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(raw)
