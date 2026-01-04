"""Sports admin router bundle."""

from fastapi import APIRouter

from . import game_compact, games, scraper_runs, teams

router = APIRouter(prefix="/api/admin/sports", tags=["sports-data"])
router.include_router(scraper_runs.router)
router.include_router(games.router)
router.include_router(game_compact.router)
router.include_router(teams.router)

__all__ = ["router"]
