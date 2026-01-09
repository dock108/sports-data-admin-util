"""
Spoiler detection utilities for classifying social posts.

These patterns help flag posts that reveal game outcomes.
Used to mark spoiler risk without deleting or rewriting content.

Note: This is a copy of the API utility for use in the scraper service.
Keep in sync with api/app/utils/spoiler_filter.py
"""

import re
from typing import NamedTuple


# Score patterns: "112-108", "W 112-108", "Final: 112-108"
SCORE_PATTERNS = [
    re.compile(r'\b\d{2,3}\s*[-–—]\s*\d{2,3}\b'),
    re.compile(r'\b[WL]\s*\d{2,3}\s*[-–—]\s*\d{2,3}\b', re.I),
    re.compile(r'final\s*:?\s*\d{2,3}\s*[-–—]\s*\d{2,3}', re.I),
]

# Keywords indicating game conclusion
FINAL_KEYWORDS = [
    re.compile(r'\bfinal\b', re.I),
    re.compile(r'\bfinal score\b', re.I),
    re.compile(r'\bend of (game|regulation)\b', re.I),
    re.compile(r'\bgame over\b', re.I),
    re.compile(r'\bwe win\b', re.I),
    re.compile(r'\bwe lose\b', re.I),
    re.compile(r'\bvictory\b', re.I),
    re.compile(r'\bdefeat\b', re.I),
    re.compile(r'\bwin streak\b', re.I),
    re.compile(r'\blose streak\b', re.I),
]

# Recap/summary content
RECAP_PATTERNS = [
    re.compile(r'\brecap\b', re.I),
    re.compile(r'\bgame recap\b', re.I),
    re.compile(r'\bpost-?game\b', re.I),
    re.compile(r'\bfull (game )?highlights\b', re.I),
    re.compile(r'\bgame summary\b', re.I),
]

# Safe patterns (downgrade to spoiler-safe when matched).
SAFE_PATTERNS = [
    re.compile(r'\blineup\b', re.I),
    re.compile(r'\bstarting (five|lineup)\b', re.I),
    re.compile(r'\binjury update\b', re.I),
    re.compile(r'\bstatus update\b', re.I),
    re.compile(r'\bwe\'?re underway\b', re.I),
    re.compile(r'\bgame time\b', re.I),
    re.compile(r'\btip-?off\b', re.I),
    re.compile(r'\bwarm-?ups\b', re.I),
]

# Emojis often used alongside scoring or outcomes.
SCORE_EMOJI_PATTERN = re.compile(r'[🏆✅🎉🚨]')  # Trophy/celebration/goal alert


class SpoilerCheckResult(NamedTuple):
    """Result of a spoiler check."""

    is_spoiler: bool
    reason: str | None = None
    matched_pattern: str | None = None


class SpoilerClassification(NamedTuple):
    """Result of spoiler risk classification."""

    spoiler_risk: bool
    reason: str | None = None
    matched_pattern: str | None = None


def check_for_spoilers(text: str) -> SpoilerCheckResult:
    """
    Check if text contains spoiler content.

    Args:
        text: The text to check (e.g., tweet content)

    Returns:
        SpoilerCheckResult with is_spoiler flag and details
    """
    if not text:
        return SpoilerCheckResult(False)

    # Check score patterns first (most definitive)
    for pattern in SCORE_PATTERNS:
        if pattern.search(text):
            return SpoilerCheckResult(True, "score", pattern.pattern)

    # Check final/conclusion keywords
    for pattern in FINAL_KEYWORDS:
        if pattern.search(text):
            return SpoilerCheckResult(True, "final_keyword", pattern.pattern)

    # Check recap patterns
    for pattern in RECAP_PATTERNS:
        if pattern.search(text):
            return SpoilerCheckResult(True, "recap", pattern.pattern)

    return SpoilerCheckResult(False)


def classify_spoiler_risk(text: str | None) -> SpoilerClassification:
    """
    Classify spoiler risk conservatively.

    Default behavior is spoiler_risk=True. We only downgrade to safe if the
    post clearly matches a non-spoiler pattern (e.g., lineups, injury updates).
    """
    if not text:
        return SpoilerClassification(True, reason="default_no_text")

    # High-risk patterns always remain spoilers.
    spoiler_result = check_for_spoilers(text)
    if spoiler_result.is_spoiler:
        return SpoilerClassification(True, spoiler_result.reason, spoiler_result.matched_pattern)

    if SCORE_EMOJI_PATTERN.search(text):
        return SpoilerClassification(True, reason="score_emoji", matched_pattern=SCORE_EMOJI_PATTERN.pattern)

    for pattern in SAFE_PATTERNS:
        if pattern.search(text):
            return SpoilerClassification(False, reason="safe_pattern", matched_pattern=pattern.pattern)

    return SpoilerClassification(True, reason="default_conservative")


def contains_spoiler(text: str) -> bool:
    """
    Quick boolean check for spoilers.

    Args:
        text: The text to check

    Returns:
        True if text contains spoiler content
    """
    return check_for_spoilers(text).is_spoiler
