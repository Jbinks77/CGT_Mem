"""
Service d'annotation automatique du code par IA (Groq - gratuit).
Détecte les blocs de code dans le contenu wiki (TipTap JSON) ou les scripts
bruts, appelle Groq pour ajouter des commentaires en français, et retourne
le contenu mis à jour.
"""
import json
import logging
from typing import Optional
from app.config import get_settings

log = logging.getLogger("cmdmem.ai")

# ── Status in-memory (doc_id → "processing" | "done" | "error") ──────────────
_wiki_status: dict[int, str] = {}
_script_status: dict[int, str] = {}


def get_wiki_status(doc_id: int) -> str:
    return _wiki_status.get(doc_id, "none")


def get_script_status(doc_id: int) -> str:
    return _script_status.get(doc_id, "none")


# ── Groq client (lazy init) ───────────────────────────────────────────────────
_groq_client = None


def _get_groq():
    global _groq_client
    if _groq_client is None:
        try:
            from groq import Groq
            settings = get_settings()
            if not settings.groq_api_key:
                raise ValueError("GROQ_API_KEY non configuré dans .env")
            _groq_client = Groq(api_key=settings.groq_api_key)
        except ImportError:
            raise RuntimeError("La librairie 'groq' n'est pas installée. Relancez : pip install groq")
    return _groq_client


# ── Prompt ────────────────────────────────────────────────────────────────────
PROMPT_TEMPLATE = """Tu es un expert en {language}. Analyse ce code et ajoute des commentaires en français pour expliquer les parties importantes.

Règles strictes :
- Commentaires en français uniquement
- Place les commentaires AU-DESSUS de la ligne concernée (jamais en fin de ligne)
- Commente seulement les parties importantes : fonctions, blocs logiques, opérations non triviales
- Ne commente PAS chaque ligne (trop verbeux)
- Garde le code original INTACT, ajoute seulement des commentaires
- Si le code a déjà des commentaires en français, améliore-les ou garde-les
- Réponds UNIQUEMENT avec le code commenté, sans explication, sans balises markdown

Code à commenter :
{code}"""


def _call_groq(code: str, language: str) -> str:
    """Appelle Groq pour commenter le code. Retourne le code commenté."""
    client = _get_groq()
    prompt = PROMPT_TEMPLATE.format(language=language or "bash", code=code)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=4096,
    )
    result = response.choices[0].message.content.strip()

    # Retirer d'éventuelles balises markdown que le modèle pourrait ajouter
    if result.startswith("```"):
        lines = result.split("\n")
        result = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    return result


# ── TipTap JSON processing ────────────────────────────────────────────────────
def _process_tiptap_node(node: dict) -> tuple[dict, bool]:
    """
    Parcourt récursivement le JSON TipTap.
    Retourne (nœud modifié, was_modified).
    """
    modified = False

    if node.get("type") == "codeBlock":
        # Extraire le texte du bloc de code
        content_nodes = node.get("content", [])
        code = "".join(n.get("text", "") for n in content_nodes if n.get("type") == "text")
        language = node.get("attrs", {}).get("language") or "text"

        if code.strip():
            try:
                commented = _call_groq(code, language)
                if commented and commented != code:
                    node = {
                        **node,
                        "content": [{"type": "text", "text": commented}],
                    }
                    modified = True
                    log.info("Bloc %s commenté (%d → %d chars)", language, len(code), len(commented))
            except Exception as e:
                log.error("Erreur commentaire bloc %s: %s", language, e)

        return node, modified

    # Récursion sur les enfants
    if "content" in node and isinstance(node["content"], list):
        new_children = []
        for child in node["content"]:
            new_child, child_modified = _process_tiptap_node(child)
            new_children.append(new_child)
            modified = modified or child_modified
        if modified:
            node = {**node, "content": new_children}

    return node, modified


def comment_wiki_content(doc_id: int, content: str, db_update_fn) -> None:
    """
    Tâche de fond : parse le JSON TipTap, commente les blocs de code,
    appelle db_update_fn(new_content) si modifié.
    """
    _wiki_status[doc_id] = "processing"
    try:
        if not content or not content.strip():
            _wiki_status[doc_id] = "none"
            return

        try:
            tiptap = json.loads(content)
        except json.JSONDecodeError:
            # Contenu en texte brut → pas de bloc de code à traiter
            _wiki_status[doc_id] = "none"
            return

        new_tiptap, was_modified = _process_tiptap_node(tiptap)

        if was_modified:
            db_update_fn(json.dumps(new_tiptap, ensure_ascii=False))
            log.info("Wiki #%d mis à jour avec commentaires IA", doc_id)

        _wiki_status[doc_id] = "done"

    except Exception as e:
        log.error("comment_wiki_content #%d: %s", doc_id, e, exc_info=True)
        _wiki_status[doc_id] = "error"


def comment_script(doc_id: int, script: str, language: str, db_update_fn) -> None:
    """
    Tâche de fond : commente un script brut et appelle db_update_fn(new_script).
    """
    _script_status[doc_id] = "processing"
    try:
        if not script or not script.strip():
            _script_status[doc_id] = "none"
            return

        commented = _call_groq(script, language)
        if commented and commented != script:
            db_update_fn(commented)
            log.info("Script #%d commenté", doc_id)

        _script_status[doc_id] = "done"

    except Exception as e:
        log.error("comment_script #%d: %s", doc_id, e, exc_info=True)
        _script_status[doc_id] = "error"
