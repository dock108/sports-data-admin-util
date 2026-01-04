"""
Social media integration for game timeline posts.

This module provides infrastructure for collecting and managing
social posts from team X accounts.
"""

from .collector import MockXCollector, XApiCollector, XPostCollector
from .collector_base import XCollectorStrategy
from .models import CollectedPost, PostCollectionJob, PostCollectionResult
from .playwright_collector import PlaywrightXCollector

__all__ = [
    "CollectedPost",
    "PostCollectionJob",
    "PostCollectionResult",
    "XPostCollector",
    "XCollectorStrategy",
    "MockXCollector",
    "XApiCollector",
    "PlaywrightXCollector",
]
