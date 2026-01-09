"""
Reveal-level detection utilities for classifying social posts.

These patterns help flag posts that expose game outcomes.
Used to mark reveal risk without deleting or rewriting content.

Note: This is a copy of the API utility for use in the scraper service.
Keep in sync with api/app/utils/reveal_filter.py
"""

from __future__ import annotations

import re
from typing import NamedTuple


# Score patterns: "112-108", "W 112-108", "Final: 112-108"
SCORE_PATTERNS = [
    re.compile(r"\b\d{2,3}\s*[-–—]\s*\d{2,3}\b"),
    re.compile(r"\b[WL]\s*\d{2,3}\s*[-–—]\s*\d{2,3}\b", re.I),
    re.compile(r"final\s*:?\s*\d{2,3}\s*[-–—]\s*\d{2,3}", re.I),
]

# Keywords indicating game conclusion
FINAL_KEYWORDS = [
    re.compile(r"\bfinal\b", re.I),
    re.compile(r"\bfinal score\b", re.I),
    re.compile(r"\bend of (game|regulation)\b", re.I),
    re.compile(r"\bgame over\b", re.I),
    re.compile(r"\bwe win\b", re.I),
    re.compile(r"\bwe lose\b", re.I),
    re.compile(r"\bvictory\b", re.I),
    re.compile(r"\bdefeat\b", re.I),
    re.compile(r"\bwin streak\b", re.I),
    re.compile(r"\blose streak\b", re.I),
]

# Recap/summary content
RECAP_PATTERNS = [
    re.compile(r"\brecap\b", re.I),
    re.compile(r"\bgame recap\b", re.I),
    re.compile(r"\bpost-?game\b", re.I),
    re.compile(r"\bfull (game )?highlights\b", re.I),
    re.compile(r"\bgame summary\b", re.I),
]

# Safe patterns (downgrade to reveal-safe when matched).
SAFE_PATTERNS = [
    re.compile(r"\blineup\b", re.I),
    re.compile(r"\bstarting (five|lineup)\b", re.I),
    re.compile(r"\binjury update\b", re.I),
    re.compile(r"\bstatus update\b", re.I),
    re.compile(r"\bwe'?re underway\b", re.I),
    re.compile(r"\bgame time\b", re.I),
    re.compile(r"\btip-?off\b", re.I),
    re.compile(r"\bwarm-?ups\b", re.I),
]

# Emojis often used alongside scoring or outcomes.
SCORE_EMOJI_PATTERN = re.compile(r"[🏆✅🎉🚨]")  # Trophy/celebration/goal alert


class RevealCheckResult(NamedTuple):
    """Result of a reveal check."""

    reveals_outcome: bool
    reason: str | None = None
    matched_pattern: str | None = None


class RevealClassification(NamedTuple):
    """Result of reveal risk classification."""

    reveal_risk: bool
    reason: str | None = None
    matched_pattern: str | None = None


def check_for_reveals(text: str) -> RevealCheckResult:
    """
    Check if text contains outcome exposure.

    Args:
        text: The text to check (e.g., post content)

    Returns:
        RevealCheckResult with reveals_outcome flag and details
    """
    if not text:
        return RevealCheckResult(False)

    # Check score patterns first (most definitive)
    for pattern in SCORE_PATTERNS:
        if pattern.search(text):
            return RevealCheckResult(True, "score", pattern.pattern)

    # Check final/conclusion keywords
    for pattern in FINAL_KEYWORDS:
        if pattern.search(text):
            return RevealCheckResult(True, "final_keyword", pattern.pattern)

    # Check recap patterns
    for pattern in RECAP_PATTERNS:
        if pattern.search(text):
            return RevealCheckResult(True, "recap", pattern.pattern)

    return RevealCheckResult(False)


def classify_reveal_risk(text: str | None) -> RevealClassification:
    """
    Classify reveal risk conservatively.

    Default behavior is reveal_risk=True. We only downgrade to safe if the
    post clearly matches a reveal-safe pattern (e.g., lineups, injury updates).
    """
    if not text:
        return RevealClassification(True, reason="default_no_text")

    # High-risk patterns always remain post-level.
    reveal_result = check_for_reveals(text)
    if reveal_result.reveals_outcome:
        return RevealClassification(True, reveal_result.reason, reveal_result.matched_pattern)

    if SCORE_EMOJI_PATTERN.search(text):
        return RevealClassification(True, reason="score_emoji", matched_pattern=SCORE_EMOJI_PATTERN.pattern)

    for pattern in SAFE_PATTERNS:
        if pattern.search(text):
            return RevealClassification(False, reason="safe_pattern", matched_pattern=pattern.pattern)

    return RevealClassification(True, reason="default_conservative")


def contains_reveal(text: str) -> bool:
    """
    Quick boolean check for outcome exposure.

    Args:
        text: The text to check

    Returns:
        True if text contains outcome exposure
    """
    return check_for_reveals(text).reveals_outcome
