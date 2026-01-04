"""Utilities for detecting and redacting score-like content."""

from __future__ import annotations

import re

_SCORE_PATTERNS = [
    re.compile(r"\b\d{1,3}\s*[-–—:]\s*\d{1,3}\b"),
    re.compile(r"\b\d{1,3}\s*(?:to|at)\s*\d{1,3}\b", re.IGNORECASE),
]

_WHITESPACE_PATTERN = re.compile(r"\s+")


def contains_explicit_score(text: str | None) -> bool:
    """Return True if the text contains an explicit score pattern."""
    if not text:
        return False
    return any(pattern.search(text) for pattern in _SCORE_PATTERNS)


def redact_scores(text: str, mask: str = "") -> str:
    """Remove or mask score-like patterns in text."""
    if not text:
        return text
    cleaned = text
    for pattern in _SCORE_PATTERNS:
        cleaned = pattern.sub(mask, cleaned)
    cleaned = _WHITESPACE_PATTERN.sub(" ", cleaned).strip()
    return cleaned
