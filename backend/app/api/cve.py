"""
Veille CVE automatique — sans API key, données toujours à jour.
Sources :
  - CERT-FR (avis + alertes + IoC en français) : cert.ssi.gouv.fr
  - CISA KEV (Known Exploited Vulnerabilities, JSON quotidien) : cisa.gov
Cache mémoire 30 minutes.
"""

import httpx
import xml.etree.ElementTree as ET
import asyncio
import re
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter

router = APIRouter()

# ─── Cache ───────────────────────────────────────────────────────────────────
_cache: dict = {}
CACHE_TTL = 1800  # 30 min

# ─── URLs ────────────────────────────────────────────────────────────────────
CERT_FR_SOURCES = [
    {"type": "alerte", "url": "https://www.cert.ssi.gouv.fr/alerte/feed/", "label": "Alerte"},
    {"type": "avis",   "url": "https://www.cert.ssi.gouv.fr/feed/",        "label": "Avis"},
    {"type": "ioc",    "url": "https://www.cert.ssi.gouv.fr/ioc/feed/",    "label": "IoC"},
]
CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

SEVERITY_MAP = {"alerte": "critical", "ioc": "critical", "avis": "high"}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    for entity, char in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&nbsp;", " "), ("&#39;", "'"), ("&quot;", '"')]:
        text = text.replace(entity, char)
    return re.sub(r"\s+", " ", text).strip()


def _is_cache_fresh(key: str) -> bool:
    if key not in _cache:
        return False
    cached_at, _ = _cache[key]
    return (datetime.now() - cached_at).total_seconds() < CACHE_TTL


def _parse_date(raw: str) -> datetime | None:
    """Parse various date formats into a datetime object."""
    formats = [
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(raw.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


# ─── CERT-FR ─────────────────────────────────────────────────────────────────

def _parse_rss(xml_text: str, src_type: str, src_label: str) -> list[dict]:
    items = []
    try:
        root = ET.fromstring(xml_text)
        channel = root.find("channel")
        if channel is None:
            return []
        for item in channel.findall("item"):
            title       = _strip_html(item.findtext("title", ""))
            link        = item.findtext("link", "").strip()
            description = _strip_html(item.findtext("description", ""))[:500]
            pub_date    = item.findtext("pubDate", "").strip()

            item_id_match = re.search(r"CERT\w+-\d+-\w+-\d+", link)
            item_id = item_id_match.group(0) if item_id_match else link.rstrip("/").split("/")[-1]

            items.append({
                "id":         item_id,
                "title":      title,
                "description": description,
                "link":       link,
                "published":  pub_date,
                "source":     "cert-fr",
                "type":       src_type,
                "type_label": src_label,
                "severity":   SEVERITY_MAP.get(src_type, "medium"),
                "cvss_score": None,
                "lang":       "fr",
            })
    except Exception:
        pass
    return items


async def _fetch_cert_fr() -> list[dict]:
    if _is_cache_fresh("cert_fr"):
        return _cache["cert_fr"][1]

    items: list[dict] = []
    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
        for src in CERT_FR_SOURCES:
            try:
                resp = await client.get(src["url"])
                if resp.status_code == 200:
                    items.extend(_parse_rss(resp.text, src["type"], src["label"]))
            except Exception:
                continue

    # Deduplicate
    seen: set = set()
    deduped = [it for it in items if not (it["id"] in seen or seen.add(it["id"]))]  # type: ignore

    _cache["cert_fr"] = (datetime.now(), deduped[:60])
    return _cache["cert_fr"][1]


# ─── CISA KEV ────────────────────────────────────────────────────────────────

async def _fetch_cisa_kev(days: int = 30) -> list[dict]:
    """
    CISA Known Exploited Vulnerabilities catalog.
    Mis à jour quotidiennement, sans API key, toujours à jour.
    Ref: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
    """
    cache_key = f"cisa_kev_{days}"
    if _is_cache_fresh(cache_key):
        return _cache[cache_key][1]

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    items: list[dict] = []

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(CISA_KEV_URL)
            if resp.status_code != 200:
                return []

            data = resp.json()
            vulns = data.get("vulnerabilities", [])

            for v in vulns:
                date_added = v.get("dateAdded", "")
                dt = _parse_date(date_added)
                if dt is None or dt < cutoff:
                    continue

                cve_id = v.get("cveID", "")
                vendor  = v.get("vendorProject", "")
                product = v.get("product", "")
                name    = v.get("vulnerabilityName", "")
                desc    = v.get("shortDescription", "")
                action  = v.get("requiredAction", "")
                due     = v.get("dueDate", "")

                full_title = f"{cve_id} — {vendor} {product}: {name}" if name else cve_id
                full_desc  = desc
                if action and action.lower() not in ("unknown", ""):
                    full_desc += f" • Action CISA : {action}"
                if due:
                    full_desc += f" (échéance : {due})"

                items.append({
                    "id":         cve_id,
                    "title":      full_title[:200],
                    "description": full_desc[:500],
                    "link":       f"https://nvd.nist.gov/vuln/detail/{cve_id}",
                    "published":  date_added,
                    "source":     "cisa-kev",
                    "type":       "kev",
                    "type_label": "KEV",
                    "severity":   "critical",   # KEV = exploité activement = toujours critique
                    "cvss_score": None,
                    "lang":       "en",
                })

        # Trier du plus récent au plus ancien
        items.sort(key=lambda x: x["published"], reverse=True)

    except Exception:
        pass

    _cache[cache_key] = (datetime.now(), items[:60])
    return _cache[cache_key][1]


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/cve/feed")
async def get_cve_feed(days: int = 30, keywords: str = ""):
    """
    Flux CVE complet : CERT-FR (FR) + CISA KEV (vulnérabilités activement exploitées).
    keywords : filtres séparés par virgule (ex: nginx,openssl,windows)
    """
    cert_items, kev_items = await asyncio.gather(
        _fetch_cert_fr(),
        _fetch_cisa_kev(days=days),
    )
    all_items = cert_items + kev_items

    if keywords:
        kws = [k.strip().lower() for k in keywords.split(",") if k.strip()]
        all_items = [
            i for i in all_items
            if any(kw in (i["title"] + " " + i["description"]).lower() for kw in kws)
        ]

    return {
        "items":          all_items,
        "total":          len(all_items),
        "cert_fr_count":  len(cert_items),
        "nvd_count":      len(kev_items),   # champ conservé pour compatibilité frontend
        "refreshed_at":   datetime.now().isoformat(),
    }


@router.get("/cve/cert-fr")
async def get_cert_fr_only():
    items = await _fetch_cert_fr()
    return {"items": items, "total": len(items)}


@router.get("/cve/search")
async def search_cves(q: str = "", severity: str = "", source: str = ""):
    cert_items, kev_items = await asyncio.gather(
        _fetch_cert_fr(),
        _fetch_cisa_kev(days=90),
    )
    all_items = cert_items + kev_items

    if q:
        q_low = q.lower()
        all_items = [i for i in all_items if q_low in (i["title"] + " " + i["description"]).lower()]
    if severity:
        all_items = [i for i in all_items if i["severity"] == severity.lower()]
    if source:
        all_items = [i for i in all_items if i["source"] == source.lower()]

    return {"items": all_items, "total": len(all_items)}


@router.post("/cve/refresh")
async def refresh_cache():
    keys = [k for k in _cache if k.startswith(("cert_fr", "cisa_kev", "nvd_"))]
    for k in keys:
        del _cache[k]
    cert_items, kev_items = await asyncio.gather(
        _fetch_cert_fr(),
        _fetch_cisa_kev(days=30),
    )
    return {
        "status":  "refreshed",
        "cert_fr": len(cert_items),
        "nvd":     len(kev_items),
        "total":   len(cert_items) + len(kev_items),
    }
