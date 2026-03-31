"""
Service d'annotation automatique du code par IA (Groq - gratuit).
Détecte les blocs de code dans le contenu wiki (TipTap JSON),
insère un paragraphe de commentaire jaune AU-DESSUS de chaque bloc,
sans jamais modifier le code lui-même.
"""
import json
import logging
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
            raise RuntimeError("La librairie 'groq' n'est pas installée.")
    return _groq_client


# ── Prompt : résumé court, ne touche PAS au code ─────────────────────────────
PROMPT_COMMENT_ONLY = """Tu es un expert en {language}.
Génère un commentaire court (2-4 lignes MAX) en français qui résume ce que fait ce code.
Chaque ligne DOIT commencer par "# ".
Ne répète PAS le code. Ne l'explique PAS ligne par ligne.
Réponds UNIQUEMENT avec les lignes de commentaire, rien d'autre.

Code :
{code}"""


def _call_groq_comment(code: str, language: str) -> str:
    """Appelle Groq pour obtenir un commentaire résumé. Ne retourne que le commentaire."""
    client = _get_groq()
    prompt = PROMPT_COMMENT_ONLY.format(language=language or "bash", code=code)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=512,
    )
    result = response.choices[0].message.content.strip()

    # Nettoyer d'éventuelles balises markdown
    if result.startswith("```"):
        lines = result.split("\n")
        result = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    return result


# ── TipTap helpers ────────────────────────────────────────────────────────────

def _make_ai_comment_paragraph(text: str) -> dict:
    """Crée un nœud TipTap paragraphe avec texte jaune (commentaire IA)."""
    return {
        "type": "paragraph",
        "content": [
            {
                "type": "text",
                "marks": [
                    {"type": "textStyle", "attrs": {"color": "#fbbf24"}}
                ],
                "text": text,
            }
        ],
    }


def _is_ai_comment_paragraph(node: dict) -> bool:
    """
    Détecte si un nœud est un commentaire IA :
    paragraphe dont le premier texte est de couleur #fbbf24 et commence par '# '.
    """
    if node.get("type") != "paragraph":
        return False
    content = node.get("content", [])
    if not content:
        return False
    first = content[0]
    if first.get("type") != "text":
        return False
    for mark in first.get("marks", []):
        if mark.get("type") == "textStyle":
            if mark.get("attrs", {}).get("color") == "#fbbf24":
                if first.get("text", "").startswith("# "):
                    return True
    return False


def _process_doc_content(nodes: list) -> tuple[list, bool]:
    """
    Parcourt les nœuds de premier niveau du document TipTap.
    Pour chaque codeBlock non encore commenté, insère un paragraphe jaune au-dessus.
    Ne modifie JAMAIS le contenu du codeBlock lui-même.
    """
    new_nodes: list = []
    modified = False

    for node in nodes:
        if node.get("type") == "codeBlock":
            # Vérifie si le nœud précédent est déjà un commentaire IA
            already_commented = bool(new_nodes) and _is_ai_comment_paragraph(new_nodes[-1])

            if not already_commented:
                code_nodes = node.get("content", [])
                code = "".join(
                    n.get("text", "") for n in code_nodes if n.get("type") == "text"
                )
                language = node.get("attrs", {}).get("language") or "text"

                if code.strip():
                    try:
                        comment_text = _call_groq_comment(code, language)
                        if comment_text:
                            # Insérer une ligne jaune par ligne de commentaire
                            for line in comment_text.split("\n"):
                                line = line.strip()
                                if line:
                                    new_nodes.append(_make_ai_comment_paragraph(line))
                            modified = True
                            log.info("Wiki #codeBlock commenté (%s, %d chars)", language, len(code))
                    except Exception as e:
                        log.error("Erreur commentaire codeBlock (%s): %s", language, e)

        new_nodes.append(node)

    return new_nodes, modified


# ── API publique ──────────────────────────────────────────────────────────────

def comment_wiki_content(doc_id: int, content: str, db_update_fn) -> None:
    """
    Tâche de fond : insère des commentaires jaunes au-dessus des blocs de code
    non encore annotés. Ne modifie jamais le code lui-même.
    """
    _wiki_status[doc_id] = "processing"
    try:
        if not content or not content.strip():
            _wiki_status[doc_id] = "none"
            return

        try:
            tiptap = json.loads(content)
        except json.JSONDecodeError:
            _wiki_status[doc_id] = "none"
            return

        doc_content = tiptap.get("content", [])
        if not isinstance(doc_content, list):
            _wiki_status[doc_id] = "none"
            return

        new_content, was_modified = _process_doc_content(doc_content)

        if was_modified:
            new_tiptap = {**tiptap, "content": new_content}
            db_update_fn(json.dumps(new_tiptap, ensure_ascii=False))
            log.info("Wiki #%d mis à jour avec commentaires IA", doc_id)

        _wiki_status[doc_id] = "done"

    except Exception as e:
        log.error("comment_wiki_content #%d: %s", doc_id, e, exc_info=True)
        _wiki_status[doc_id] = "error"


def comment_script(doc_id: int, script: str, language: str, db_update_fn) -> None:
    """
    Tâche de fond : commente un script brut et appelle db_update_fn(new_script).
    Ajoute les commentaires AU-DESSUS des blocs logiques, sans modifier le code.
    """
    _script_status[doc_id] = "processing"
    try:
        if not script or not script.strip():
            _script_status[doc_id] = "none"
            return

        commented = _call_groq_comment(script, language)
        if commented and commented != script:
            # Pour les scripts, on préfixe avec le commentaire IA
            new_script = commented + "\n\n" + script
            db_update_fn(new_script)
            log.info("Script #%d commenté", doc_id)

        _script_status[doc_id] = "done"

    except Exception as e:
        log.error("comment_script #%d: %s", doc_id, e, exc_info=True)
        _script_status[doc_id] = "error"
