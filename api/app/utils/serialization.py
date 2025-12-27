"""Serialization helpers for API responses."""

from __future__ import annotations

from datetime import datetime
from typing import Any


def serialize_datetime(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def serialize_date(d: datetime | None) -> str | None:
    return d.date().isoformat() if d else None


def serialize_jsonb_field(field: dict[str, Any] | None) -> dict[str, Any]:
    return field if field is not None else {}


def flatten_stats_for_response(stats: dict[str, Any] | None) -> dict[str, Any]:
    if not stats:
        return {}
    result = {}
    for key in ["minutes", "points", "rebounds", "assists", "yards", "touchdowns"]:
        if key in stats:
            result[key] = stats[key]
    result["raw_stats"] = stats
    return result


