"""HTML caching utilities for scrapers."""

from __future__ import annotations

import hashlib
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

from ..logging import logger


class HTMLCache:
    """Local file cache for scraped HTML pages.
    
    Stores HTML in a structured directory:
      {cache_dir}/{league}/{season}/{filename}.html
    
    This ensures we only scrape each page once, making us a good citizen
    and allowing re-parsing without network requests.
    """
    
    def __init__(self, cache_dir: str | Path, league_code: str, *, force_refresh: bool = False) -> None:
        self.cache_dir = Path(cache_dir)
        self.league_code = league_code
        self.force_refresh = force_refresh
        
    def _get_cache_path(self, url: str, game_date: date | None = None) -> Path:
        """Build cache path for a URL.
        
        For boxscore URLs, extracts game key (e.g., 202410220BOS.html).
        For scoreboard URLs, uses date-based filename.
        """
        parsed = urlparse(url)
        path_parts = parsed.path.strip("/").split("/")
        
        # Build filename from URL (season is no longer part of path to avoid stale year segments)
        if "boxscores" in parsed.path and path_parts[-1].endswith(".html"):
            # Boxscore URL: .../boxscores/202410220BOS.html
            filename = path_parts[-1]
        elif "boxscores" in parsed.path and parsed.query:
            # Scoreboard URL: .../boxscores/?month=10&day=22&year=2024
            # Extract date from query params
            filename = f"scoreboard_{parsed.query.replace('&', '_').replace('=', '')}.html"
        else:
            # Fallback: hash the URL
            url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
            filename = f"page_{url_hash}.html"
        
        # Drop year/season directory to avoid mis-bucketing when season differs from current year
        return self.cache_dir / self.league_code / filename
    
    def get(self, url: str, game_date: date | None = None) -> str | None:
        """Load HTML from cache if it exists."""
        cache_path = self._get_cache_path(url, game_date)
        if cache_path.exists():
            if self.force_refresh:
                logger.info(
                    "cache_refresh_forced",
                    url=url,
                    path=str(cache_path),
                    league=self.league_code,
                )
                return None
            logger.info(
                "cache_hit",
                url=url,
                path=str(cache_path),
                league=self.league_code,
            )
            return cache_path.read_text(encoding="utf-8")
        logger.debug("cache_miss", url=url, path=str(cache_path), league=self.league_code)
        return None
    
    def put(self, url: str, html: str, game_date: date | None = None) -> Path:
        """Save HTML to cache."""
        cache_path = self._get_cache_path(url, game_date)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(html, encoding="utf-8")
        logger.info("cache_saved", url=url, path=str(cache_path), size_kb=len(html) // 1024)
        return cache_path

