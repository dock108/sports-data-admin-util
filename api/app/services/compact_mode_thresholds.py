"""Compact mode threshold configuration access."""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import db_models
from ..db import get_async_session

logger = logging.getLogger(__name__)


async def _fetch_thresholds(
    session: AsyncSession,
    sport_id: int,
) -> db_models.CompactModeThreshold:
    stmt = select(db_models.CompactModeThreshold).where(db_models.CompactModeThreshold.sport_id == sport_id)
    result = await session.execute(stmt)
    thresholds = result.scalar_one_or_none()
    if thresholds is None:
        logger.error("Compact mode thresholds not found for sport_id=%s", sport_id)
        raise ValueError(f"Compact mode thresholds not found for sport_id={sport_id}")
    return thresholds


async def getThresholdsForSport(
    sport_id: int,
    session: AsyncSession | None = None,
) -> db_models.CompactModeThreshold:
    """Return compact mode thresholds for the requested sport."""
    if session is not None:
        return await _fetch_thresholds(session, sport_id)

    async with get_async_session() as local_session:
        return await _fetch_thresholds(local_session, sport_id)
