"use client";

import { useMemo, useState } from "react";
import styles from "./SocialMediaRenderer.module.css";
import { ENABLE_INLINE_X_VIDEO } from "@/lib/featureFlags";

type SocialMediaRendererProps = {
  mediaType?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  postUrl: string;
  linkClassName?: string;
};

export function SocialMediaRenderer({
  mediaType,
  imageUrl,
  videoUrl,
  postUrl,
  linkClassName,
}: SocialMediaRendererProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const hasImage = Boolean(imageUrl);
  const hasVideo = Boolean(videoUrl);

  const shouldRenderVideo = useMemo(() => {
    return ENABLE_INLINE_X_VIDEO && hasVideo && !videoFailed;
  }, [hasVideo, videoFailed]);

  const showImage = !shouldRenderVideo && hasImage;
  const showPlaceholder = !shouldRenderVideo && !hasImage;
  const title = mediaType ? `X post media (${mediaType})` : "X post media";
  const showVideoOverlay = showImage && mediaType === "video";

  // TODO: Handle expiring X CDN URLs with refresh logic.
  // TODO: Support multi-media posts (multiple images/videos) in future.
  // TODO: Revisit autoplay behavior across browsers and user settings.
  return (
    <div className={styles.container}>
      <div className={styles.aspectContainer} aria-label={title}>
        {shouldRenderVideo && videoUrl ? (
          <video
            className={styles.media}
            controls
            muted
            autoPlay
            playsInline
            preload="none"
            poster={imageUrl ?? undefined}
            onError={() => setVideoFailed(true)}
          >
            <source src={videoUrl} />
            Your browser does not support the video tag.
          </video>
        ) : null}
        {showImage && imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="X post media"
              className={styles.media}
              loading="lazy"
            />
            {showVideoOverlay ? (
              <span className={styles.playOverlay} aria-hidden="true">
                ▶
              </span>
            ) : null}
          </>
        ) : null}
        {showPlaceholder ? (
          <div className={styles.placeholder}>Media unavailable</div>
        ) : null}
      </div>
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName ?? styles.link}
      >
        View on X →
      </a>
    </div>
  );
}
