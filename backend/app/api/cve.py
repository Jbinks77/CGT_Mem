"""
Veille CVE automatique — sans API key.
Sources :
  - CERT-FR (avis + alertes en français) : https://www.cert.ssi.gouv.fr/
  - NVD API v2 (CVEs critiques/élevées récentes)
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


# ─── Sources CERT-FR ─────────────────────────────────────────────────────────
CERT_FR_SOURCES = [
    {"type": "alerte", "url": "https://www.cert.ssi.gouv.fr/alerte/feed/",  "label": "Alerte"},
    {"type": "avis",   "url": "https://www.cert.ssi.gouv.fr/feed/",         "label": "Avis"},
    {"type": "ioc",    "url": "https://www.cert.ssi.gouv.fr/ioc/feed/",     "label": "IoC"},
]

SEVERITY_MAP = {
    "alerte": "critical",
    "ioc":    "critical",
    "avis":   "high",
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _strip_html(text: str) -> str:
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&amp;',  '&',  text)
    text = re.sub(r'&lt;',   '<',  text)
    text = re.sub(r'&gt;',   '>',  text)
    text = re.sub(r'&nbsp;', ' ',  text)
    text = re.sub(r'\s+',    ' ',  text)
    return text.strip()


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

            # Extract advisory ID from link (e.g. CERTFR-2024-AVI-0042)
            item_id = re.search(r'CERT\w+-\d+-\w+-\d+', link)
            item_id = item_id.group(0) if item_id else link.rstrip("/").split("/")[-1]

            items.append({
                "id":          item_id,
                "title":       title,
                "description": description,
                "link":        link,
                "published":   pub_date,
                "source":      "cert-fr",
                "type":        src_type,
                "type_label":  src_label,
                "severity":    SEVERITY_MAP.get(src_type, "medium"),
                "cvss_score":  None,
                "lang":        "fr",
            })
    except Exception:
        pass
    return items


def _parse_nvd_severity(metrics: dict) -> tuple[float | None, str]:
    """Extracts CVSS v3 score and severity label from NVD metrics."""
    for key in ("cvssMetricV31", "cvssMetricV30"):
        entries = metrics.get(key, [])
        if entries:
            data = entries[0].get("cvssData", {})
            score = data.get("baseScore")
            sev   = data.get("baseSeverity", "").lower()
            if score:
                return float(score), sev
    return None, "unknown"


def _is_cache_fresh(key: str) -> bool:
    if key not in _cache:
        return False
    cached_at, _ = _cache[key]
    return (datetime.now() - cached_at).total_seconds() < CACHE_TTL


# ─── Fetchers ────────────────────────────────────────────────────────────────

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

    # Deduplicate by id, sort newest first (keep RSS order which is newest-first)
    seen: set = set()
    deduped = []
    for it in items:
        if it["id"] not in seen:
            seen.add(it["id"])
            deduped.append(it)

    _cache["cert_fr"] = (datetime.now(), deduped[:60])
    return _cache["cert_fr"][1]


async def _fetch_nvd(days: int = 7, severities: list[str] | None = None) -> list[dict]:
    if severities is None:
        severities = ["CRITICAL", "HIGH"]

    cache_key = f"nvd_{days}_{'_'.join(severities)}"
    if _is_cache_fresh(cache_key):
        return _cache[cache_key][1]

    now   = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S.000")
    end   = now.strftime("%Y-%m-%dT%H:%M:%S.000")

    items: list[dict] = []
    async with httpx.AsyncClient(
        timeout=20.0,
        headers={"User-Agent": "cmdmem-cve-watcher/1.0"},
    ) as client:
        for severity in severities:
            try:
                resp = await client.get(
                    "https://services.nvd.nist.gov/rest/json/cves/2.0",
                    params={
                        "pubStartDate":  start,
                        "pubEndDate":    end,
                        "cvssV3Severity": severity,
                        "resultsPerPage": 20,
                    },
                )
                if resp.status_code != 200:
                    continue
                for vuln in resp.json().get("vulnerabilities", []):
                    cve  = vuln.get("cve", {})
                    cve_id = cve.get("id", "")
                    descs  = cve.get("descriptions", [])
                    desc   = next((d["value"] for d in descs if d["lang"] == "en"), "")
                    score, sev = _parse_nvd_severity(cve.get("metrics", {}))
                    items.append({
                        "id":          cve_id,
                        "title":       cve_id,
                        "description": desc[:500],
                        "link":        f"https://nvd.nist.gov/vuln/detail/{cve_id}",
                        "published":   cve.get("published", ""),
                        "source":      "nvd",
                        "type":        "cve",
                        "type_label":  "CVE",
                        "severity":    sev if sev != "unknown" else severity.lower(),
                        "cvss_score":  score,
                        "lang":        "en",
                    })
                await asyncio.sleep(0.6)  # NVD rate limit: 5 req/30s sans clé
            except Exception:
                continue

    _cache[cache_key] = (datetime.now(), items)
    return items


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/cve/feed")
async def get_cve_feed(days: int = 7, keywords: str = ""):
    """
    Flux CVE complet : CERT-FR (FR) + NVD critiques/élevées.
    keywords : filtres séparés par virgule (ex: nginx,openssl,windows)
    """
    cert_items, nvd_items = await asyncio.gather(
        _fetch_cert_fr(),
        _fetch_nvd(days=days),
    )
    all_items = cert_items + nvd_items

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
        "nvd_count":      len(nvd_items),
        "refreshed_at":   datetime.now().isoformat(),
    }


@router.get("/cve/cert-fr")
async def get_cert_fr_only():
    """Retourne uniquement les avis/alertes CERT-FR."""
    items = await _fetch_cert_fr()
    return {"items": items, "total": len(items)}


@router.get("/cve/search")
async def search_cves(q: str = "", severity: str = "", source: str = ""):
    """Recherche dans le flux CVE (30 derniers jours)."""
    cert_items, nvd_items = await asyncio.gather(
        _fetch_cert_fr(),
        _fetch_nvd(days=30),
    )
    all_items = cert_items + nvd_items

    if q:
        q_low = q.lower()
        all_items = [
            i for i in all_items
            if q_low in (i["title"] + " " + i["description"]).lower()
        ]
    if severity:
        all_items = [i for i in all_items if i["severity"] == severity.lower()]
    if source:
        all_items = [i for i in all_items if i["source"] == source.lower()]

    return {"items": all_items, "total": len(all_items)}


@router.post("/cve/refresh")
async def refresh_cache():
    """Vide le cache et recharge les flux."""
    keys_to_clear = [k for k in _cache if k.startswith(("cert_fr", "nvd_"))]
    for k in keys_to_clear:
        del _cache[k]
    cert_items, nvd_items = await asyncio.gather(
        _fetch_cert_fr(),
        _fetch_nvd(days=7),
    )
    return {
        "status":    "refreshed",
        "cert_fr":   len(cert_items),
        "nvd":       len(nvd_items),
        "total":     len(cert_items) + len(nvd_items),
    }
