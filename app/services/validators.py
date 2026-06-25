import re

def is_valid_instagram_url(url: str) -> bool:
    """Valida se o formato do link pertence exclusivamente ao Instagram."""
    pattern = r"^https:\/\/(www\.)?instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+\/?.*"
    return bool(re.match(pattern, url))
