"""NCAA basketball scraper using sports-reference.com/cbb."""

from __future__ import annotations

from datetime import date, datetime
from typing import Sequence
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from ..logging import logger
from ..models import (
    GameIdentification,
    NormalizedGame,
    NormalizedPlayerBoxscore,
    NormalizedTeamBoxscore,
    TeamIdentity,
)
from ..normalization import normalize_team_name
from ..utils.parsing import (
    extract_all_stats_from_row,
    get_stat_from_row,
    parse_float,
    parse_int,
)
from .base import BaseSportsReferenceScraper, ScraperError


class NCAABSportsReferenceScraper(BaseSportsReferenceScraper):
    sport = "ncaab"
    league_code = "NCAAB"
    base_url = "https://www.sports-reference.com/cbb/boxscores/"
    _NON_NUMERIC_SCORE_MARKERS = {
        "FINAL",
        "FINAL/OT",
        "FINAL/2OT",
        "FINAL/3OT",
        "OT",
        "PREVIEW",
        "POSTPONED",
        "CANCELED",
        "CANCELLED",
        "UPCOMING",
        "TBA",
        "TBD",
        "PPD",
    }

    def _parse_team_row(self, row) -> tuple[TeamIdentity, int]:
        """
        NCAA basketball scoreboards occasionally append a trailing status cell
        (e.g., \"Final\" or \"Final/OT\"). Instead of assuming the last <td>
        contains the numeric score, scan cells from right to left until we find
        the first value that can be parsed as an integer.
        """
        team_link = row.find("a")
        if not team_link:
            raise ScraperError("Missing team link")
        team_name = team_link.text.strip()
        canonical_name, abbreviation = normalize_team_name(self.league_code, team_name)

        score = None
        score_text: str | None = None
        for cell in reversed(row.find_all("td")):
            score_text = cell.text.strip()
            score = parse_int(score_text)
            if score is not None:
                break

        if score is None:
            status_hint = (score_text or "unknown").upper()
            if status_hint in self._NON_NUMERIC_SCORE_MARKERS:
                raise ScraperError(f"score_unavailable_status:{status_hint}")
            raise ScraperError(f"invalid_score_value:{score_text or 'unknown'}")

        identity = TeamIdentity(
            league_code=self.league_code,
            name=canonical_name,
            short_name=canonical_name,
            abbreviation=abbreviation,
            external_ref=abbreviation.upper() if abbreviation else None,
        )
        return identity, score

    def _extract_team_stats(self, soup: BeautifulSoup, team_identity: TeamIdentity, is_home: bool) -> dict:
        """Extract team totals from NCAAB boxscore tables (no abbreviations provided).
        
        NCAAB uses tables with IDs like ``box-score-basic-{team_slug}`` and a ``tfoot``
        row containing team totals. We match by slug (derived from team name) and fall
        back to positional order (away first, home second).
        """
        from ..utils.html_parsing import extract_team_stats_from_table
        
        def _slugify(name: str) -> str:
            # Lowercase, strip, replace non-alnum with hyphen, collapse duplicates.
            import re
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            return slug
        
        target_slug = _slugify(team_identity.name)
        # Some SR slugs drop words like "state"/"university" or apostrophes; keep alternates.
        alt_slug = target_slug.replace("-state", "").replace("-university", "").replace("st-", "")
        candidates = {target_slug, alt_slug}
        
        tables = [t for t in soup.find_all("table", id=True) if t.get("id", "").startswith("box-score-basic-")]
        matched_table = None
        for t in tables:
            table_id = t.get("id", "").lower()
            tbl_slug = table_id.split("box-score-basic-", 1)[1]
            if any(c and (c in tbl_slug or tbl_slug in c) for c in candidates):
                matched_table = t
                break
        
        # Fallback by position if slug match failed
        if matched_table is None and tables:
            matched_table = tables[1] if (is_home and len(tables) > 1) else tables[0]
        
        if matched_table is None:
            logger.warning(
                "ncaab_team_stats_table_not_found",
                team=team_identity.name,
                is_home=is_home,
                available_tables=[t.get("id") for t in tables][:5],
            )
            return {}
        
        # Use existing extractor against the located table
        stats = extract_team_stats_from_table(matched_table, team_identity.name, matched_table.get("id", ""))
        
        # Coerce numeric fields
        parsed: dict[str, int | float | str] = {}
        for key, val in stats.items():
            if val in (None, ""):
                continue
            parsed_int = parse_int(val)
            if parsed_int is not None:
                parsed[key] = parsed_int
                continue
            parsed_float = parse_float(val)
            if parsed_float is not None:
                parsed[key] = parsed_float
                continue
            parsed[key] = val
        return parsed

    def _find_player_table_by_position(
        self, soup: BeautifulSoup, team_identity: TeamIdentity, is_home: bool
    ) -> BeautifulSoup.Tag | None:
        """Find player stats table for NCAAB when abbreviations are not available.
        
        Since NCAAB doesn't use abbreviations, we find tables by:
        1. Finding all tables with IDs matching box-score-basic-* pattern (NCAAB uses this format)
        2. Matching by position (first table = away team, second = home team)
        3. Or by checking team name in table header/caption
        
        Args:
            soup: BeautifulSoup document of the boxscore page
            team_identity: Team identity to match
            is_home: Whether this is the home team
            
        Returns:
            Table Tag if found, None otherwise
        """
        from ..utils.html_parsing import get_table_ids_on_page
        
        # Find all tables with IDs matching the NCAAB pattern
        # NCAAB uses: box-score-basic-{team} and box-score-advanced-{team}
        # (not box-{team}-game-basic like other sports)
        all_tables = soup.find_all("table", id=True)
        all_table_ids = [t.get("id", "") for t in all_tables if t.get("id")]
        player_tables = [
            t for t in all_tables
            if t.get("id", "").startswith("box-score-basic-")
        ]
        
        logger.debug(
            "ncaab_player_table_search",
            team=team_identity.name,
            is_home=is_home,
            total_tables_with_ids=len(all_table_ids),
            player_tables_found=len(player_tables),
            player_table_ids=[t.get("id") for t in player_tables],
            sample_table_ids=all_table_ids[:10],
        )
        
        if not player_tables:
            logger.warning(
                "ncaab_player_table_not_found_by_pattern",
                team=team_identity.name,
                is_home=is_home,
                all_table_ids=all_table_ids[:20],  # Show more table IDs for debugging
            )
            return None
        
        # First, try to match by team name in table ID
        # Table IDs are like "box-score-basic-arkansas" or "box-score-basic-illinois"
        team_name_lower = team_identity.name.lower()
        # Normalize team name for matching (remove spaces, punctuation, common suffixes)
        team_name_normalized = team_name_lower.replace(" ", "_").replace("-", "_").replace(".", "").replace("'", "")
        # Also try without common suffixes
        team_name_no_suffix = team_name_normalized.replace("_state", "").replace("_st", "").replace("_university", "").replace("_u", "")
        
        # Extract team name from table IDs for comparison
        # Format: "box-score-basic-{team_name}"
        for table in player_tables:
            table_id = table.get("id", "").lower()
            # Extract team name from table ID (everything after "box-score-basic-")
            if "box-score-basic-" in table_id:
                table_team_name = table_id.split("box-score-basic-", 1)[1]
                # Try various matching strategies
                if (team_name_normalized in table_team_name or 
                    table_team_name in team_name_normalized or
                    team_name_no_suffix in table_team_name or
                    table_team_name in team_name_no_suffix or
                    team_name_lower.replace(" ", "") in table_team_name or
                    table_team_name in team_name_lower.replace(" ", "")):
                    logger.debug(
                        "ncaab_player_table_found_by_id",
                        team=team_identity.name,
                        is_home=is_home,
                        table_id=table.get("id"),
                        table_team_name=table_team_name,
                        matched_pattern=team_name_normalized,
                    )
                    return table
        
        # Fallback: Try to match by position: first table = away, second = home
        if len(player_tables) >= 2:
            table_index = 1 if is_home else 0
            if table_index < len(player_tables):
                table = player_tables[table_index]
                logger.debug(
                    "ncaab_player_table_found_by_position",
                    team=team_identity.name,
                    is_home=is_home,
                    table_id=table.get("id"),
                    position=table_index,
                )
                return table
        
        # Fallback: try to match by team name in table caption or header
        for table in player_tables:
            # Check caption
            caption = table.find("caption")
            if caption and team_identity.name.lower() in caption.get_text().lower():
                logger.debug(
                    "ncaab_player_table_found_by_caption",
                    team=team_identity.name,
                    is_home=is_home,
                    table_id=table.get("id"),
                )
                return table
            
            # Check thead for team name
            thead = table.find("thead")
            if thead:
                thead_text = thead.get_text().lower()
                if team_identity.name.lower() in thead_text:
                    logger.debug(
                        "ncaab_player_table_found_by_thead",
                        team=team_identity.name,
                        is_home=is_home,
                        table_id=table.get("id"),
                    )
                    return table
        
        # If we have at least one table, use position-based matching as fallback
        if player_tables:
            table_index = 1 if is_home else 0
            if table_index < len(player_tables):
                logger.debug(
                    "ncaab_player_table_using_fallback_position",
                    team=team_identity.name,
                    is_home=is_home,
                    table_id=player_tables[table_index].get("id"),
                    total_tables=len(player_tables),
                )
                return player_tables[table_index]
        
        return None

    def _extract_player_stats(
        self, soup: BeautifulSoup, team_identity: TeamIdentity, is_home: bool
    ) -> list[NormalizedPlayerBoxscore]:
        """Extract player stats from NCAAB boxscore page.
        
        Since NCAAB doesn't use abbreviations, we find tables by position or pattern matching.
        
        Args:
            soup: BeautifulSoup document of the boxscore page
            team_identity: Team identity
            is_home: Whether this is the home team
            
        Returns:
            List of NormalizedPlayerBoxscore objects
        """
        from ..utils.html_parsing import find_player_table
        
        # Try to find table using position-based matching
        table = self._find_player_table_by_position(soup, team_identity, is_home)
        
        if not table:
            logger.warning(
                "ncaab_player_stats_table_not_found",
                team=team_identity.name,
                is_home=is_home,
            )
            return []
        
        table_id = table.get("id", "unknown")
        logger.debug(
            "ncaab_player_stats_table_found",
            team=team_identity.name,
            is_home=is_home,
            table_id=table_id,
        )
        
        players: list[NormalizedPlayerBoxscore] = []
        tbody = table.find("tbody")
        if not tbody:
            logger.warning(
                "ncaab_player_stats_tbody_not_found",
                table_id=table_id,
                team=team_identity.name,
            )
            return players
        
        all_rows = tbody.find_all("tr")
        logger.debug(
            "ncaab_player_stats_rows_found",
            table_id=table_id,
            team=team_identity.name,
            row_count=len(all_rows),
        )
        
        skipped_thead = 0
        skipped_no_player_cell = 0
        skipped_no_player_link = 0
        parsed_count = 0
        
        for row in all_rows:
            # Skip section headers (rows with class="thead") and reserve rows
            row_classes = row.get("class", [])
            if "thead" in row_classes:
                skipped_thead += 1
                continue
            
            # Get player name and external ref from the th cell
            player_cell = row.find("th", {"data-stat": "player"})
            if not player_cell:
                skipped_no_player_cell += 1
                continue
            
            player_link = player_cell.find("a")
            if not player_link:
                # Skip "Team Totals" or "Reserves" header rows
                skipped_no_player_link += 1
                continue
            
            player_name = player_link.text.strip()
            # Extract player ID from href like "/cbb/players/t/tatumja01.html"
            href = player_link.get("href", "")
            player_id = href.split("/")[-1].replace(".html", "") if href else player_name
            
            # Build raw stats dict with all available columns
            raw_stats = extract_all_stats_from_row(row)
            
            players.append(
                NormalizedPlayerBoxscore(
                    player_id=player_id,
                    player_name=player_name,
                    team=team_identity,
                    minutes=parse_float(get_stat_from_row(row, "mp")),
                    points=parse_int(get_stat_from_row(row, "pts")),
                    rebounds=parse_int(get_stat_from_row(row, "trb")),
                    assists=parse_int(get_stat_from_row(row, "ast")),
                    raw_stats=raw_stats,
                )
            )
            parsed_count += 1
        
        logger.info(
            "ncaab_player_stats_extraction_complete",
            team=team_identity.name,
            is_home=is_home,
            total_rows=len(all_rows),
            skipped_thead=skipped_thead,
            skipped_no_player_cell=skipped_no_player_cell,
            skipped_no_player_link=skipped_no_player_link,
            parsed_players=parsed_count,
        )
        
        return players

    def _build_team_boxscore(self, identity: TeamIdentity, is_home: bool, score: int, stats: dict) -> NormalizedTeamBoxscore:
        return NormalizedTeamBoxscore(
            team=identity,
            is_home=is_home,
            points=score,
            rebounds=parse_int(stats.get("trb")),
            assists=parse_int(stats.get("ast")),
            turnovers=parse_int(stats.get("tov")),
            raw_stats=stats,
        )

    def _is_probable_womens_game(
        self,
        href: str,
        source_game_key: str,
        home_team: str,
        away_team: str,
        *,
        is_gender_f: bool = False,
    ) -> tuple[bool, str]:
        """
        Heuristically detect women's games that may appear in the men's scoreboard.
        
        Sports Reference women's pages often include markers like \"-women\"
        or slugs that start with \"w\". We skip these early to avoid persisting
        women's games into the men's NCAAB universe.
        """
        href_lower = href.lower()
        reasons: list[str] = []

        if is_gender_f:
            reasons.append("gender_f_class")
        if "women" in href_lower:
            reasons.append("href_contains_women")
        if "/w-" in href_lower or "-w-" in href_lower:
            reasons.append("href_contains_w_dash")
        if href_lower.endswith("_w.html") or "_w." in href_lower:
            reasons.append("href_suffix_w")
        if source_game_key and not source_game_key[0].isdigit():
            reasons.append("game_key_not_numeric")
        if source_game_key.startswith("w"):
            reasons.append("game_key_starts_with_w")
        if source_game_key.endswith("_w") or source_game_key.endswith("-w"):
            reasons.append("game_key_suffix_w")
        if "women" in home_team.lower() or "women" in away_team.lower():
            reasons.append("team_name_contains_women")

        return (len(reasons) > 0, ",".join(reasons))

    # _season_from_date now inherited from base class

    def fetch_games_for_date(self, day: date) -> Sequence[NormalizedGame]:
        soup = self.fetch_html(self.scoreboard_url(day))
        game_divs = soup.select("div.game_summary")
        logger.info(
            "ncaab_fetch_games_start",
            day=str(day),
            game_divs_count=len(game_divs),
        )
        games: list[NormalizedGame] = []
        skipped_count = 0
        error_count = 0
        for div in game_divs:
            div_classes = div.get("class", [])
            is_gender_f = "gender-f" in div_classes
            team_rows = div.select("table.teams tr")
            if len(team_rows) < 2:
                logger.debug(
                    "ncaab_game_skipped_insufficient_rows",
                    day=str(day),
                    team_rows_count=len(team_rows),
                )
                skipped_count += 1
                continue
            try:
                away_identity, away_score = self._parse_team_row(team_rows[0])
                home_identity, home_score = self._parse_team_row(team_rows[1])
            except ScraperError as exc:
                message = str(exc)
                if message.startswith("score_unavailable_status:"):
                    logger.debug(
                        "ncaab_game_pending",
                        day=str(day),
                        status=message.split(":", 1)[1],
                    )
                    skipped_count += 1
                    continue
                # Treat any invalid/non-numeric score or parse issue as a skipped game, not fatal
                logger.warning(
                    "ncaab_game_parse_error",
                    day=str(day),
                    error=message,
                    exc_info=True,
                )
                skipped_count += 1
                continue

            # Try multiple selectors for boxscore link (HTML structure may vary)
            boxscore_link = (
                div.select_one("p.links a[href*='/boxscores/']") or
                div.select_one("p.links a[href*='boxscores']") or
                div.select_one("a[href*='/boxscores/']") or
                div.select_one("a[href*='boxscores']")
            )
            if not boxscore_link:
                # Log more details about what we found
                links_section = div.select_one("p.links")
                all_links = div.select("a[href]")
                logger.debug(
                    "ncaab_game_skipped_no_boxscore_link",
                    day=str(day),
                    home_team=home_identity.name,
                    away_team=away_identity.name,
                    has_links_section=links_section is not None,
                    links_section_text=links_section.get_text()[:100] if links_section else None,
                    all_links_count=len(all_links),
                    sample_links=[a.get("href", "")[:50] for a in all_links[:3]],
                )
                skipped_count += 1
                continue
            boxscore_href = boxscore_link["href"]
            source_game_key = boxscore_href.split("/")[-1].replace(".html", "")

            is_womens, reason = self._is_probable_womens_game(
                boxscore_href,
                source_game_key,
                home_identity.name,
                away_identity.name,
                is_gender_f=is_gender_f,
            )
            if is_womens:
                logger.info(
                    "ncaab_womens_boxscore_skipped",
                    day=str(day),
                    href=boxscore_href,
                    source_game_key=source_game_key,
                    home_team=home_identity.name,
                    away_team=away_identity.name,
                    reason=reason,
                    gender_f=is_gender_f,
                )
                skipped_count += 1
                continue

            boxscore_url = urljoin(self.base_url, boxscore_href)
            box_soup = self.fetch_html(boxscore_url)

            away_stats = self._extract_team_stats(box_soup, away_identity, is_home=False)
            home_stats = self._extract_team_stats(box_soup, home_identity, is_home=True)

            # Extract player-level stats for both teams
            away_players = self._extract_player_stats(box_soup, away_identity, is_home=False)
            home_players = self._extract_player_stats(box_soup, home_identity, is_home=True)
            
            total_players = len(away_players) + len(home_players)
            logger.debug(
                "ncaab_game_player_extraction_summary",
                day=str(day),
                home_team=home_identity.name,
                away_team=away_identity.name,
                away_players_count=len(away_players),
                home_players_count=len(home_players),
                total_players=total_players,
                source_game_key=source_game_key,
            )

            identity = GameIdentification(
                league_code=self.league_code,
                season=self._season_from_date(day),
                season_type="regular",
                game_date=datetime.combine(day, datetime.min.time()),
                home_team=home_identity,
                away_team=away_identity,
                source_game_key=source_game_key,
            )
            team_boxscores = [
                self._build_team_boxscore(away_identity, False, away_score, away_stats),
                self._build_team_boxscore(home_identity, True, home_score, home_stats),
            ]
            player_boxscores = away_players + home_players

            games.append(
                NormalizedGame(
                    identity=identity,
                    status="completed",
                    home_score=home_score,
                    away_score=away_score,
                    team_boxscores=team_boxscores,
                    player_boxscores=player_boxscores,
                )
            )
        logger.info(
            "ncaab_fetch_games_complete",
            day=str(day),
            game_divs_count=len(game_divs),
            games_parsed=len(games),
            games_skipped=skipped_count,
            games_error=error_count,
            )
        return games


