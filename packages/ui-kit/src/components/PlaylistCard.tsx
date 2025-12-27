"use client";

import styles from "./PlaylistCard.module.css";

export interface PlaylistSegment {
  video: {
    id: string;
    title: string;
    description?: string;
    channelTitle: string;
    url: string;
    durationSeconds: number;
    tag: string;
    score?: number;
    keywordHits?: string[];
  };
  lockedUntilMinute?: number;
  startsAtMinute?: number;
}

export interface PlaylistResult {
  canonicalTopic: string;
  totalDurationSeconds: number;
  playlistTitle: string;
  playlistLink?: string;
  segments: PlaylistSegment[];
  endingDelayMinutes?: number;
  metadata: {
    requestedBucket: string;
    sportsMode: boolean;
    endingDelayChoice?: string;
    keepEndingHidden?: boolean;
  };
}

interface PlaylistCardProps {
  playlist: PlaylistResult;
  onRegenerate?: () => void;
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function friendlyTag(tag: string): string {
  switch (tag) {
    case "intro":
      return "Intro";
    case "context":
      return "Setup";
    case "deep_dive":
      return "Deep Dive";
    case "ending":
      return "Outcome Zone";
    case "misc":
      return "Related";
    default:
      return "Bonus";
  }
}

export function PlaylistCard({ playlist, onRegenerate, loading = false }: PlaylistCardProps) {
  const totalLength = formatDuration(playlist.totalDurationSeconds);
  const outcomeLockInfo = playlist.endingDelayMinutes
    ? `Outcome locked until: ~${Math.round(playlist.endingDelayMinutes / 60)}h mark`
    : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {playlist.playlistLink ? "Live Playlist" : "Preview Only"}
          </p>
          {playlist.playlistLink ? (
            <h2 className={styles.title}>
              <a href={playlist.playlistLink} target="_blank" rel="noreferrer" className={styles.link}>
                {playlist.playlistTitle}
              </a>
            </h2>
          ) : (
            <h2 className={styles.title}>{playlist.playlistTitle}</h2>
          )}
          {totalLength && (
            <p className={styles.runtimeInfo}>
              Total runtime: {totalLength}
              {outcomeLockInfo && <> · {outcomeLockInfo}</>}
            </p>
          )}
        </div>
        {totalLength && <span className={styles.badge}>{totalLength}</span>}
      </div>

      <div className={styles.actions}>
        {playlist.playlistLink ? (
          <a
            className={styles.secondaryButton}
            href={playlist.playlistLink}
            target="_blank"
            rel="noreferrer"
          >
            Open Playlist on YouTube
          </a>
        ) : (
          <div className={styles.note}>
            <p>
              <strong>Playlist not saved to YouTube.</strong>
            </p>
            <p className={styles.noteSmall}>
              Add <code>YOUTUBE_OAUTH_ACCESS_TOKEN</code> and{" "}
              <code>YOUTUBE_PLAYLIST_CHANNEL_ID</code> to your .env.local to auto-create playlists.
            </p>
          </div>
        )}

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className={styles.ghostButton}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Generate Alternative Version"}
          </button>
        )}
      </div>

      <ol className={styles.videoList}>
        {playlist.segments.map((segment, index) => (
          <li key={segment.video.id} className={styles.videoItem}>
            <div>
              <p className={styles.videoTitle}>
                {index + 1}. {segment.video.title}
              </p>
              <p className={styles.videoMeta}>
                {segment.video.channelTitle} · {formatDuration(segment.video.durationSeconds)} ·{" "}
                {friendlyTag(segment.video.tag)}
                {typeof segment.startsAtMinute === "number" && (
                  <> · starts at {segment.startsAtMinute}m</>
                )}
              </p>
              {segment.lockedUntilMinute && (
                <p className={styles.locked}>
                  Ending locked until {segment.lockedUntilMinute} min mark.
                </p>
              )}
            </div>
            <a
              href={segment.video.url}
              target="_blank"
              rel="noreferrer"
              className={styles.watchLink}
            >
              Watch
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

