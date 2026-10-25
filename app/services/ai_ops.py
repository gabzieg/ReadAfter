import json
import re
import time
from google import genai
from app.core.config import GOOGLE_API_KEY, GEMINI_MODEL

client = genai.Client(api_key=GOOGLE_API_KEY)

DEFAULT_RETRY_DELAY = 60

def _generate_with_retry(parts: list, max_attempts: int = 3):
    """Chama o Gemini respeitando o retryDelay devolvido em 429 (quota do free tier)."""
    for attempt in range(1, max_attempts + 1):
        try:
            return client.models.generate_content(model=GEMINI_MODEL, contents=parts)
        except Exception as exc:
            message = str(exc)
            if "RESOURCE_EXHAUSTED" not in message and "429" not in message:
                raise
            if attempt == max_attempts:
                raise

            match = re.search(r"'retryDelay':\s*'(\d+)s'", message)
            delay = int(match.group(1)) + 1 if match else DEFAULT_RETRY_DELAY
            print(f"[ai_ops] Quota excedida (tentativa {attempt}/{max_attempts}). Aguardando {delay}s...")
            time.sleep(delay)

LINK_RULES = """RECOMENDAÇÕES ('links') — seção "Explorar" para o leitor se aprofundar:
- Traga de 2 a 4 links REAIS e relevantes ao assunto do vídeo.
- Priorize as URLs que aparecem no próprio conteúdo (listadas acima).
- Além dessas, recomende fontes autoritativas sobre o tema: site OFICIAL do
  produto/pessoa/projeto citado, repositório no GitHub, documentação oficial,
  artigo da Wikipédia, ou a página na loja oficial (ex.: Steam, para jogos).
- Prefira URLs canônicas e estáveis (a home ou a página principal do recurso).
  NÃO invente caminhos internos profundos dos quais você não tem certeza.
- É PROIBIDO usar links de busca (google.com/search, bing, duckduckgo, etc.).
- Cada link tem um 'title' curto descrevendo o destino (não repita a URL crua).
- Só devolva a lista vazia se o tema for tão genérico que nenhuma fonte
  autoritativa se aplique — isso deve ser raro."""

def recommend_links(meta: dict, transcript: str, link_candidates: list[str]) -> list[dict]:
    """Gera só as recomendações da seção 'Explorar' (usado para regenerar reels já salvos)."""
    candidates_block = "\n".join(f"- {u}" for u in link_candidates) or "(nenhuma URL no conteúdo)"

    prompt = f"""Você recomenda links para quem quer se aprofundar no tema de um vídeo.

Título: {meta.get('title', '')}
Descrição: {meta.get('description', '')}

TRANSCRIÇÃO:
{transcript or '(vídeo sem fala)'}

URLS QUE APARECEM NO CONTEÚDO:
{candidates_block}

{LINK_RULES}

Retorne APENAS um JSON: {{"links": [{{"title": "...", "url": "https://..."}}]}}"""

    response = _generate_with_retry([prompt])
    return _clean_links(_loads_lenient(response.text).get("links", []))

def analyze_reel(meta: dict, transcript: str, frame_contexts: list[dict],
                 link_candidates: list[str]) -> dict:
    """Gera o Artigo Ilustrado a partir de TEXTO apenas — nenhuma mídia vai ao Gemini.

    Cada frame chega com o instante em que foi capturado, o texto lido na tela (OCR)
    e a fala daquele momento, para que as tags [IMAGEM_X] caiam no parágrafo certo.
    """
    frames_block = "\n\n".join(
        f"IMAGEM {c['number']} — capturada em {c['time_label']}\n"
        f"  Texto na tela: {c['screen_text'] or '(nada legível)'}\n"
        f"  Fala nesse momento: {c['spoken'] or '(sem fala)'}"
        for c in frame_contexts
    ) or "(nenhum frame disponível)"

    links_block = "\n".join(f"- {u}" for u in link_candidates) or "(nenhuma URL encontrada no conteúdo)"

    prompt = f"""Você é um editor que transforma vídeos em artigos curtos e bem estruturados.

Título Original: {meta.get('title', '')}
Descrição Original: {meta.get('description', '')}

TRANSCRIÇÃO COMPLETA DO ÁUDIO:
{transcript or '(vídeo sem fala)'}

IMAGENS DISPONÍVEIS (em ordem cronológica, com o que aparece na tela e o que era dito):
{frames_block}

URLS QUE APARECEM NO PRÓPRIO CONTEÚDO:
{links_block}

REGRAS DO ARTIGO ('article'):
1. Baseie-se EXCLUSIVAMENTE na transcrição e nos textos de tela. NÃO acrescente
   fatos, números, nomes ou contexto que não estejam no vídeo.
2. Seja sucinto: 3 a 5 parágrafos curtos. Organize em ordem lógica — abertura com
   o ponto central, desenvolvimento, e fecho com a conclusão do vídeo.
3. Separe os parágrafos com uma linha em branco.

REGRAS DAS IMAGENS (crítico):
4. A tag `[IMAGEM_X]` deve ficar SEMPRE sozinha em sua própria linha, ENTRE dois
   parágrafos. NUNCA no meio de uma frase ou de um parágrafo — isso quebra o texto.
5. Coloque cada imagem logo DEPOIS do parágrafo que fala sobre o que ela mostra.
   Use o campo "Fala nesse momento" para saber a que trecho ela corresponde.
6. Use cada imagem no máximo UMA vez. NÃO é obrigatório usar todas — se uma imagem
   não ajuda a entender nenhum parágrafo, simplesmente não a use.
7. Respeite a ordem cronológica: imagens de instantes iniciais vêm antes.

{LINK_RULES}

Retorne APENAS um JSON válido nesta estrutura:
```json
{{
  "central_theme": "Assunto principal em uma frase de impacto",
  "article": "Parágrafo um...\n\n[IMAGEM_1]\n\nParágrafo dois...",
  "action_items": ["Passo prático 1...", "Passo prático 2..."],
  "links": [{{"title": "Nome do recurso", "url": "https://..."}}]
}}
```
"""

    response = _generate_with_retry([prompt])

    data = _loads_lenient(response.text)
    data["article"] = _normalize_image_tags(data.get("article", ""))
    data["links"] = _clean_links(data.get("links", []))
    return data

def _loads_lenient(text: str) -> dict:
    """Extrai o JSON da resposta do Gemini, tolerando cercas de código e vírgulas sobrando."""
    raw = text.strip().replace("```json", "").replace("```", "").strip()
    # Recorta do primeiro { ao último } (descarta prosa fora do objeto)
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end + 1]
    # Remove vírgulas antes de } ou ] (erro comum do modelo)
    raw = re.sub(r",(\s*[}\]])", r"\1", raw)
    return json.loads(raw)

SEARCH_ENGINES = ("google.com/search", "bing.com/search",
                  "duckduckgo.com/?q", "search.yahoo", "google.com/url")

def _clean_links(links: list) -> list[dict]:
    """Normaliza {title, url}, remove buscas/duplicatas e descarta links comprovadamente mortos."""
    cleaned = []
    seen = set()
    for item in links:
        if isinstance(item, str):
            title, url = "", item
        elif isinstance(item, dict):
            title, url = item.get("title", ""), item.get("url", "")
        else:
            continue

        url = (url or "").strip()
        if not url or any(engine in url.lower() for engine in SEARCH_ENGINES):
            continue
        key = url.lower().rstrip("/")
        if key in seen or not _url_is_alive(url):
            continue
        seen.add(key)
        cleaned.append({"title": (title or url).strip(), "url": url})
    return cleaned

def _url_is_alive(url: str) -> bool:
    """Best-effort: só descarta o que é comprovadamente morto (DNS/404/410). Na dúvida, mantém."""
    import urllib.request
    import urllib.error

    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            return resp.status < 400
    except urllib.error.HTTPError as exc:
        if exc.code in (405, 403, 400):  # servidor rejeita HEAD/bot, mas a página existe
            return True
        return exc.code not in (404, 410)
    except Exception:
        return True  # timeout, TLS, etc.: não punir por falha de rede

def _normalize_image_tags(article: str) -> str:
    """Garante que toda tag [IMAGEM_X] fique isolada entre parágrafos, mesmo se o modelo errar."""
    if not article:
        return ""

    # Tira a tag de dentro da frase e a coloca sozinha, com linha em branco em volta.
    article = re.sub(r"[ \t]*\[IMAGEM_(\d+)\][ \t]*", r"\n\n[IMAGEM_\1]\n\n", article)
    # Se a tag partiu uma frase no meio, junta o que sobrou antes dela.
    article = re.sub(r"\n{3,}", "\n\n", article)
    return article.strip()
