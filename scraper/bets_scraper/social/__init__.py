"""
Social media integration for game timeline posts.

This module provides infrastructure for collecting and managing
social posts from team X accounts.
"""

from .collector import MockXCollector, XApiCollector, XPostCollector
from .collector_base import XCollectorStrategy
from .exceptions import SocialRateLimitError
from .models import CollectedPost, PostCollectionJob, PostCollectionResult
from .playwright_collector import PlaywrightXCollector
from .rate_limit import PlatformRateLimiter
from .cache import SocialRequestCache

__all__ = [
    "CollectedPost",
    "PostCollectionJob",
    "PostCollectionResult",
    "XPostCollector",
    "XCollectorStrategy",
    "MockXCollector",
    "XApiCollector",
    "PlaywrightXCollector",
    "SocialRateLimitError",
    "PlatformRateLimiter",
    "SocialRequestCache",
]
