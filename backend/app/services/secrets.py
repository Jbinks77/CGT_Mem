import re
from app.config import get_settings

MASK = "***MASKED***"


def mask_secrets(command: str) -> tuple[str, bool]:
    """Mask secrets in a command string. Returns (masked_command, is_sensitive)."""
    settings = get_settings()
    is_sensitive = False
    masked = command

    for pattern in settings.secret_patterns:
        if re.search(pattern, masked):
            is_sensitive = True
            masked = re.sub(pattern, lambda m: _mask_match(m), masked)

    return masked, is_sensitive


def _mask_match(match: re.Match) -> str:
    text = match.group(0)
    if "=" in text:
        key, _, _ = text.partition("=")
        return f"{key}={MASK}"
    if ":" in text:
        key, _, _ = text.partition(":")
        return f"{key}: {MASK}"
    return MASK


def normalize_command(command: str) -> str:
    """Keep the full command as-is, just trim whitespace."""
    return command.strip()
