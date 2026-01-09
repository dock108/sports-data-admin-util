from bets_scraper.live.nba import _parse_nba_clock
from bets_scraper.persistence.games import resolve_status_transition


def test_parse_nba_clock_duration() -> None:
    assert _parse_nba_clock("PT11M32.00S") == "11:32"
    assert _parse_nba_clock("PT0M05.00S") == "0:05"


def test_parse_nba_clock_passthrough() -> None:
    assert _parse_nba_clock("11:32") == "11:32"
    assert _parse_nba_clock(None) is None


def test_resolve_status_transition_final_sticks() -> None:
    assert resolve_status_transition("final", "live") == "final"


def test_resolve_status_transition_promotes_live() -> None:
    assert resolve_status_transition("scheduled", "live") == "live"
    assert resolve_status_transition("live", "scheduled") == "live"


def test_resolve_status_transition_promotes_final() -> None:
    assert resolve_status_transition("live", "final") == "final"
