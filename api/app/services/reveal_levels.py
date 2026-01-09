"""Reveal level helpers for app-facing APIs."""

from __future__ import annotations

from enum import Enum


class RevealLevel(str, Enum):
    """Reveal levels for score visibility."""

    pre = "pre"
    post = "post"


def parse_reveal_level(value: str) -> RevealLevel | None:
    """Parse a reveal level string, returning None when invalid."""
    try:
        return RevealLevel(value)
    except ValueError:
        return None
