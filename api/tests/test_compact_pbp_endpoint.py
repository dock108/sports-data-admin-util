"""Integration tests for the compact PBP endpoint."""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from typing import AsyncGenerator

from fastapi.testclient import TestClient

from api.app.db import get_db
from api.app.routers import sports as sports_router
from api.main import app


class _FakeResult:
    def __init__(
        self,
        plays: list[SimpleNamespace] | None = None,
        scalar_value: int | None = None,
    ) -> None:
        self._plays = plays or []
        self._scalar_value = scalar_value

    def scalars(self) -> "_FakeResult":
        return self

    def all(self) -> list[SimpleNamespace]:
        return self._plays

    def scalar_one_or_none(self) -> int | None:
        return self._scalar_value


class _FakeSession:
    def __init__(self, execute_results: list[_FakeResult]) -> None:
        self._execute_results = execute_results

    async def execute(self, statement: object) -> _FakeResult:
        return self._execute_results.pop(0)


class TestCompactPbpEndpoint(unittest.TestCase):
    def setUp(self) -> None:
        self.moments_response = sports_router.CompactMomentsResponse(
            moments=[
                sports_router.CompactMoment(playIndex=5, quarter=1, gameClock="12:00", momentType="tip"),
                sports_router.CompactMoment(playIndex=10, quarter=1, gameClock="11:30", momentType="shot"),
                sports_router.CompactMoment(playIndex=15, quarter=1, gameClock="10:45", momentType="foul"),
            ],
            momentTypes=["tip", "shot", "foul"],
        )
        sports_router._compact_cache.clear()
        sports_router._store_compact_cache(123, self.moments_response)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        sports_router._compact_cache.clear()

    def test_compact_pbp_first_moment_slice(self) -> None:
        plays = [
            SimpleNamespace(
                play_index=5,
                quarter=1,
                game_clock="12:00",
                play_type="tip",
                raw_data={},
                player_name=None,
                description=None,
                home_score=None,
                away_score=None,
            ),
            SimpleNamespace(
                play_index=6,
                quarter=1,
                game_clock="11:58",
                play_type="pass",
                raw_data={},
                player_name=None,
                description=None,
                home_score=None,
                away_score=None,
            ),
            SimpleNamespace(
                play_index=9,
                quarter=1,
                game_clock="11:40",
                play_type="shot",
                raw_data={},
                player_name=None,
                description=None,
                home_score=None,
                away_score=None,
            ),
        ]
        session = _FakeSession([_FakeResult(plays=plays)])

        async def override_get_db() -> AsyncGenerator[_FakeSession, None]:
            yield session

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        response = client.get("/api/admin/sports/games/123/compact/5/pbp")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual([play["play_index"] for play in payload["plays"]], [5, 6, 9])

    def test_compact_pbp_last_moment_slice(self) -> None:
        plays = [
            SimpleNamespace(
                play_index=15,
                quarter=1,
                game_clock="10:45",
                play_type="foul",
                raw_data={},
                player_name=None,
                description=None,
                home_score=None,
                away_score=None,
            ),
            SimpleNamespace(
                play_index=16,
                quarter=1,
                game_clock="10:30",
                play_type="shot",
                raw_data={},
                player_name=None,
                description=None,
                home_score=None,
                away_score=None,
            ),
            SimpleNamespace(
                play_index=18,
                quarter=1,
                game_clock="10:05",
                play_type="turnover",
                raw_data={},
                player_name=None,
                description=None,
                home_score=None,
                away_score=None,
            ),
        ]
        session = _FakeSession([_FakeResult(scalar_value=18), _FakeResult(plays=plays)])

        async def override_get_db() -> AsyncGenerator[_FakeSession, None]:
            yield session

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        response = client.get("/api/admin/sports/games/123/compact/15/pbp")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual([play["play_index"] for play in payload["plays"]], [15, 16, 18])
