"""Sports admin router bundle.

This package is imported as `app.routers.sports` by `api/main.py`.
Some unit tests (and older call sites) expect certain compact-mode helpers
and schemas to be available directly on this module. We keep lightweight
re-exports here for backwards compatibility.
"""

from fastapi import APIRouter

from . import diagnostics, game_compact, games, jobs, scraper_runs, teams
from .common import _compact_cache, store_compact_cache
from .schemas import (
    CompactMoment,
    CompactMomentSummaryResponse,
    CompactMomentsResponse,
    CompactPbpResponse,
    CompactPostEntry,
    CompactPostsResponse,
)

router = APIRouter(prefix="/api/admin/sports", tags=["sports-data"])
router.include_router(scraper_runs.router)
router.include_router(games.router)
router.include_router(game_compact.router)
router.include_router(teams.router)
router.include_router(jobs.router)
router.include_router(diagnostics.router)

# Backwards-compat exports for tests and legacy imports.
_store_compact_cache = store_compact_cache

__all__ = [
    "router",
    "_compact_cache",
    "_store_compact_cache",
    "CompactMoment",
    "CompactMomentsResponse",
    "CompactPbpResponse",
    "CompactPostsResponse",
    "CompactPostEntry",
    "CompactMomentSummaryResponse",
]
