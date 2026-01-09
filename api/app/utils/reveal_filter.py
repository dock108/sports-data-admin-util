"""
Reveal-level detection utilities for classifying social post text.

These patterns help flag posts that expose game outcomes. Classification
is conservative and defaults to reveal risk when unsure.
"""

from __future__ import annotations

import re
from typing import NamedTuple


SCORE_PATTERNS = [
    re.compile(r"\b\d{2,3}\s*[-–—]\s*\d{2,3}\b"),
    re.compile(r"\b[WL]\s*\d{2,3}\s*[-–—]\s*\d{2,3}\b", re.I),
    re.compile(r"final\s*:?\s*\d{2,3}\s*[-–—]\s*\d{2,3}", re.I),
]

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

RECAP_PATTERNS = [
    re.compile(r"\brecap\b", re.I),
    re.compile(r"\bgame recap\b", re.I),
    re.compile(r"\bpost-?game\b", re.I),
    re.compile(r"\bfull (game )?highlights\b", re.I),
    re.compile(r"\bgame summary\b", re.I),
]

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

SCORE_EMOJI_PATTERN = re.compile(r"[🏆✅🎉🚨]")


class RevealCheckResult(NamedTuple):
    reveals_outcome: bool
    reason: str | None = None
    matched_pattern: str | None = None


class RevealClassification(NamedTuple):
    reveal_risk: bool
    reason: str | None = None
    matched_pattern: str | None = None


def check_for_reveals(text: str) -> RevealCheckResult:
    if not text:
        return RevealCheckResult(False)

    for pattern in SCORE_PATTERNS:
        if pattern.search(text):
            return RevealCheckResult(True, "score", pattern.pattern)

    for pattern in FINAL_KEYWORDS:
        if pattern.search(text):
            return RevealCheckResult(True, "final_keyword", pattern.pattern)

    for pattern in RECAP_PATTERNS:
        if pattern.search(text):
            return RevealCheckResult(True, "recap", pattern.pattern)

    return RevealCheckResult(False)


def classify_reveal_risk(text: str | None) -> RevealClassification:
    if not text:
        return RevealClassification(True, reason="default_no_text")

    reveal_result = check_for_reveals(text)
    if reveal_result.reveals_outcome:
        return RevealClassification(True, reveal_result.reason, reveal_result.matched_pattern)

    if SCORE_EMOJI_PATTERN.search(text):
        return RevealClassification(True, reason="score_emoji", matched_pattern=SCORE_EMOJI_PATTERN.pattern)

    for pattern in SAFE_PATTERNS:
        if pattern.search(text):
            return RevealClassification(False, reason="safe_pattern", matched_pattern=pattern.pattern)

    return RevealClassification(True, reason="default_conservative")
