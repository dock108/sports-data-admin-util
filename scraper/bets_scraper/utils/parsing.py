"""Common HTML parsing utilities for scrapers."""

from __future__ import annotations

from bs4 import BeautifulSoup, Tag


def get_stat_from_row(row: Tag, stat_name: str) -> str | None:
    """Extract a stat value from a table row by data-stat attribute.
    
    Args:
        row: BeautifulSoup Tag representing a table row
        stat_name: The data-stat attribute value to find
        
    Returns:
        The text content of the matching cell, or None if not found
    """
    cell = row.find("td", {"data-stat": stat_name})
    if cell:
        text = cell.text.strip()
        return text if text and text != "" else None
    return None


def parse_int(value: str | None) -> int | None:
    """Parse a string value to an integer, handling common edge cases.
    
    Handles:
    - None, empty strings, "-" -> None
    - Float strings (e.g., "12.5") -> 12
    - Invalid values -> None
    
    Args:
        value: String value to parse
        
    Returns:
        Parsed integer or None
    """
    if value in (None, "", "-"):
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def parse_float(value: str | None) -> float | None:
    """Parse a string value to a float, handling common edge cases.
    
    Handles:
    - None, empty strings, "-" -> None
    - Time format "MM:SS" -> converts to decimal minutes
    - Invalid values -> None
    
    Args:
        value: String value to parse
        
    Returns:
        Parsed float or None
    """
    if value in (None, "", "-"):
        return None
    try:
        # Handle time format like "32:45" (minutes:seconds)
        if ":" in str(value):
            parts = str(value).split(":")
            if len(parts) == 2:
                return float(parts[0]) + float(parts[1]) / 60
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_time_to_minutes(value: str | None) -> float | None:
    """Parse time string (MM:SS or HH:MM:SS) to decimal minutes.
    
    Args:
        value: Time string in format "MM:SS" or "HH:MM:SS"
        
    Returns:
        Decimal minutes (e.g., "32:45" -> 32.75) or None
    """
    if value in (None, "", "-"):
        return None
    try:
        parts = str(value).split(":")
        if len(parts) == 2:
            # MM:SS format
            return float(parts[0]) + float(parts[1]) / 60
        elif len(parts) == 3:
            # HH:MM:SS format
            return float(parts[0]) * 60 + float(parts[1]) + float(parts[2]) / 60
        return float(value)
    except (ValueError, TypeError):
        return None


def extract_all_stats_from_row(row: Tag) -> dict[str, str]:
    """Extract all stats from a table row as a dictionary.
    
    Iterates through all td cells and extracts data-stat attributes.
    
    Args:
        row: BeautifulSoup Tag representing a table row
        
    Returns:
        Dictionary mapping stat names to their text values
    """
    raw_stats = {}
    for cell in row.find_all("td"):
        stat_name = cell.get("data-stat")
        if stat_name:
            raw_stats[stat_name] = cell.text.strip()
    return raw_stats

