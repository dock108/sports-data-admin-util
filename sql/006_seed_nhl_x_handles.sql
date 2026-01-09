-- Migration: Seed NHL team X handles
-- Run with: psql "$DATABASE_URL" -f sql/006_seed_nhl_x_handles.sql

UPDATE sports_teams SET x_handle = 'AnaheimDucks' WHERE abbreviation = 'ANA';
UPDATE sports_teams SET x_handle = 'ArizonaCoyotes' WHERE abbreviation = 'ARI';
UPDATE sports_teams SET x_handle = 'NHLBruins' WHERE abbreviation = 'BOS';
UPDATE sports_teams SET x_handle = 'BuffaloSabres' WHERE abbreviation = 'BUF';
UPDATE sports_teams SET x_handle = 'NHLFlames' WHERE abbreviation = 'CGY';
UPDATE sports_teams SET x_handle = 'Canes' WHERE abbreviation = 'CAR';
UPDATE sports_teams SET x_handle = 'NHLBlackhawks' WHERE abbreviation = 'CHI';
UPDATE sports_teams SET x_handle = 'Avalanche' WHERE abbreviation = 'COL';
UPDATE sports_teams SET x_handle = 'BlueJacketsNHL' WHERE abbreviation = 'CBJ';
UPDATE sports_teams SET x_handle = 'DallasStars' WHERE abbreviation = 'DAL';
UPDATE sports_teams SET x_handle = 'DetroitRedWings' WHERE abbreviation = 'DET';
UPDATE sports_teams SET x_handle = 'EdmontonOilers' WHERE abbreviation = 'EDM';
UPDATE sports_teams SET x_handle = 'FlaPanthers' WHERE abbreviation = 'FLA';
UPDATE sports_teams SET x_handle = 'LAKings' WHERE abbreviation = 'LAK';
UPDATE sports_teams SET x_handle = 'mnwild' WHERE abbreviation = 'MIN';
UPDATE sports_teams SET x_handle = 'CanadiensMTL' WHERE abbreviation = 'MTL';
UPDATE sports_teams SET x_handle = 'PredsNHL' WHERE abbreviation = 'NSH';
UPDATE sports_teams SET x_handle = 'NJDevils' WHERE abbreviation = 'NJD';
UPDATE sports_teams SET x_handle = 'NYIslanders' WHERE abbreviation = 'NYI';
UPDATE sports_teams SET x_handle = 'NYRangers' WHERE abbreviation = 'NYR';
UPDATE sports_teams SET x_handle = 'Senators' WHERE abbreviation = 'OTT';
UPDATE sports_teams SET x_handle = 'NHLFlyers' WHERE abbreviation = 'PHI';
UPDATE sports_teams SET x_handle = 'penguins' WHERE abbreviation = 'PIT';
UPDATE sports_teams SET x_handle = 'SanJoseSharks' WHERE abbreviation = 'SJS';
UPDATE sports_teams SET x_handle = 'SeattleKraken' WHERE abbreviation = 'SEA';
UPDATE sports_teams SET x_handle = 'StLouisBlues' WHERE abbreviation = 'STL';
UPDATE sports_teams SET x_handle = 'TampaBayLightning' WHERE abbreviation = 'TBL';
UPDATE sports_teams SET x_handle = 'MapleLeafs' WHERE abbreviation = 'TOR';
UPDATE sports_teams SET x_handle = 'Canucks' WHERE abbreviation = 'VAN';
UPDATE sports_teams SET x_handle = 'GoldenKnights' WHERE abbreviation = 'VGK';
UPDATE sports_teams SET x_handle = 'Capitals' WHERE abbreviation = 'WSH';
UPDATE sports_teams SET x_handle = 'NHLJets' WHERE abbreviation = 'WPG';

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM sports_teams
    WHERE x_handle IS NOT NULL AND abbreviation IN (
        'ANA', 'ARI', 'BOS', 'BUF', 'CGY', 'CAR', 'CHI', 'COL', 'CBJ', 'DAL', 'DET',
        'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NSH', 'NJD', 'NYI', 'NYR', 'OTT', 'PHI',
        'PIT', 'SJS', 'SEA', 'STL', 'TBL', 'TOR', 'VAN', 'VGK', 'WSH', 'WPG'
    );
    RAISE NOTICE 'Updated % teams with NHL X handles', updated_count;
END $$;
