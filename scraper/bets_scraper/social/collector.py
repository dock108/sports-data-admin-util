"""
X (Twitter) post collector for game timelines.

This module provides infrastructure to collect posts from team X accounts
through pluggable strategies. The orchestrator handles persistence and
spoiler filtering.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from ..logging import logger
from .collector_base import XCollectorStrategy
from .models import CollectedPost, PostCollectionJob, PostCollectionResult
from .playwright_collector import PlaywrightXCollector, playwright_available

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class MockXCollector(XCollectorStrategy):
    """
    Mock collector for testing without X API access.

    Returns empty results - real data should come from actual X integration.
    """

    def collect_posts(
        self,
        x_handle: str,
        window_start: datetime,
        window_end: datetime,
    ) -> list[CollectedPost]:
        logger.info(
            "mock_x_collector_called",
            x_handle=x_handle,
            window_start=str(window_start),
            window_end=str(window_end),
        )
        return []


class XApiCollector(XCollectorStrategy):
    """
    Collector using X API v2.

    Requires X_BEARER_TOKEN environment variable.
    Rate limited to 450 requests per 15 minutes (user timeline).
    """

    def __init__(self, bearer_token: str | None = None):
        import os

        self.bearer_token = bearer_token or os.environ.get("X_BEARER_TOKEN")
        if not self.bearer_token:
            logger.warning("x_api_collector_no_token", msg="X_BEARER_TOKEN not set")

    def collect_posts(
        self,
        x_handle: str,
        window_start: datetime,
        window_end: datetime,
    ) -> list[CollectedPost]:
        if not self.bearer_token:
            logger.warning("x_api_skipped_no_token", x_handle=x_handle)
            return []

        # TODO: Implement actual X API v2 integration
        # See: https://developer.twitter.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-tweets
        #
        # Steps:
        # 1. Get user ID from handle: GET /2/users/by/username/:username
        # 2. Get user tweets: GET /2/users/:id/tweets
        #    - start_time, end_time for filtering
        #    - expansions=attachments.media_keys for video detection
        # 3. Filter by time window
        # 4. Map to CollectedPost objects

        logger.info(
            "x_api_collection_not_implemented",
            x_handle=x_handle,
            msg="X API integration pending implementation",
        )
        return []


class XPostCollector:
    """
    Main X post collector that orchestrates collection and storage.

    Supports running collection jobs for specific games, persisting
    results to the database, and filtering spoilers.
    """

    def __init__(
        self,
        strategy: XCollectorStrategy | None = None,
        filter_spoilers: bool = True,
    ):
        if strategy:
            self.strategy = strategy
        else:
            self.strategy = PlaywrightXCollector() if playwright_available() else MockXCollector()
        self.filter_spoilers = filter_spoilers

    def run_job(self, job: PostCollectionJob, session: Session) -> PostCollectionResult:
        """
        Run a post collection job and persist results.

        Args:
            job: Collection job parameters
            session: Database session for persistence

        Returns:
            PostCollectionResult with counts and any errors
        """
        from ..db import db_models
        from .spoiler_filter import contains_spoiler

        result = PostCollectionResult(job=job)
        errors: list[str] = []

        try:
            posts = self.strategy.collect_posts(
                x_handle=job.x_handle,
                window_start=job.window_start,
                window_end=job.window_end,
            )
            result.posts_found = len(posts)

            team = session.query(db_models.SportsTeam).filter(
                db_models.SportsTeam.abbreviation.ilike(job.team_abbreviation)
            ).first()

            if not team:
                errors.append(f"Team not found: {job.team_abbreviation}")
                result.errors = errors
                return result

            posts_updated = 0
            for post in posts:
                if self.filter_spoilers and post.text and contains_spoiler(post.text):
                    result.posts_filtered += 1
                    continue

                existing = session.query(db_models.GameSocialPost).filter(
                    db_models.GameSocialPost.post_url == post.post_url
                ).first()

                if existing:
                    existing.posted_at = post.posted_at
                    existing.has_video = post.has_video
                    existing.tweet_text = post.text
                    existing.source_handle = post.author_handle
                    existing.video_url = post.video_url
                    existing.image_url = post.image_url
                    existing.media_type = post.media_type or "none"
                    existing.updated_at = datetime.now(timezone.utc)
                    posts_updated += 1
                else:
                    db_post = db_models.GameSocialPost(
                        game_id=job.game_id,
                        team_id=team.id,
                        post_url=post.post_url,
                        posted_at=post.posted_at,
                        has_video=post.has_video,
                        tweet_text=post.text,
                        source_handle=post.author_handle,
                        video_url=post.video_url,
                        image_url=post.image_url,
                        media_type=post.media_type or "none",
                        updated_at=datetime.now(timezone.utc),
                    )
                    session.add(db_post)
                    result.posts_saved += 1

            if result.posts_saved > 0 or posts_updated > 0:
                session.commit()
                logger.debug(
                    "x_posts_committed",
                    game_id=job.game_id,
                    team=job.team_abbreviation,
                    saved=result.posts_saved,
                    updated=posts_updated,
                )

            result.completed_at = datetime.utcnow()

            logger.info(
                "x_collection_job_complete",
                game_id=job.game_id,
                team=job.team_abbreviation,
                found=result.posts_found,
                saved=result.posts_saved,
                filtered=result.posts_filtered,
            )

        except Exception as e:
            errors.append(str(e))
            logger.exception(
                "x_collection_job_failed",
                game_id=job.game_id,
                team=job.team_abbreviation,
                error=str(e),
            )

        result.errors = errors
        return result

    def collect_for_game(
        self,
        session: Session,
        game_id: int,
    ) -> list[PostCollectionResult]:
        """
        Collect posts for both teams in a game.

        Uses a simple 24-hour window around game day:
        - Start: 5:00 AM ET on game day
        - End: 4:59:59 AM ET the next day

        This covers all US timezones and captures pre-game hype through post-game celebration.

        Args:
            session: Database session
            game_id: Game database ID

        Returns:
            List of PostCollectionResult for each team
        """
        from datetime import time
        from ..db import db_models

        game = session.query(db_models.SportsGame).filter(db_models.SportsGame.id == game_id).first()

        if not game:
            logger.warning("x_collect_game_not_found", game_id=game_id)
            return []

        home_team = session.query(db_models.SportsTeam).get(game.home_team_id)
        away_team = session.query(db_models.SportsTeam).get(game.away_team_id)

        if not home_team or not away_team:
            logger.warning("x_collect_teams_not_found", game_id=game_id)
            return []

        try:
            from zoneinfo import ZoneInfo
        except ImportError:
            from backports.zoneinfo import ZoneInfo  # Python < 3.9

        eastern = ZoneInfo("America/New_York")
        utc = ZoneInfo("UTC")

        game_day = game.game_date.date()

        window_start = datetime.combine(game_day, time(5, 0), tzinfo=eastern).astimezone(utc)
        window_end = datetime.combine(game_day + timedelta(days=1), time(4, 59, 59), tzinfo=eastern).astimezone(utc)

        logger.debug(
            "x_window_calculated",
            game_id=game_id,
            game_day=str(game_day),
            window_start_et=f"{game_day} 05:00 ET",
            window_end_et=f"{game_day + timedelta(days=1)} 04:59 ET",
            window_start_utc=str(window_start),
            window_end_utc=str(window_end),
        )

        results = []

        for team in [home_team, away_team]:
            if not team.x_handle:
                logger.debug("x_collect_no_handle", team=team.abbreviation)
                continue

            job = PostCollectionJob(
                game_id=game_id,
                team_abbreviation=team.abbreviation,
                x_handle=team.x_handle,
                window_start=window_start,
                window_end=window_end,
            )

            result = self.run_job(job, session)
            results.append(result)

        return results
