"use client";

import { useEffect, useRef, useState } from "react";

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  /** Optional still frame shown until the video is in view. */
  poster?: string;
}

/**
 * A background video that actually is lazy.
 *
 * The previous version was lazy in name only: it rendered `<video src>` with
 * `preload="auto"`, so every instance on the page downloaded its whole file
 * during initial load. On the homepage that was three 1080p clips — several
 * megabytes of below-the-fold video competing with the hero for bandwidth.
 *
 * Now the source is only attached once the element is close to the viewport,
 * and playback is paused again when it scrolls away so the decoder isn't
 * burning CPU on something nobody is looking at.
 */
export default function LazyVideo({
  src,
  poster,
  className,
  autoPlay,
  ...props
}: LazyVideoProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Pre-2019 browser with no IntersectionObserver: attach the source
    // directly rather than leaving the element permanently blank. Done through
    // the DOM node instead of state so it doesn't trigger a cascading render.
    if (typeof IntersectionObserver === "undefined") {
      const video = videoRef.current;
      if (video) {
        video.src = src;
        if (autoPlay) video.play().catch(() => {});
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            if (autoPlay) videoRef.current?.play().catch(() => {});
          } else {
            videoRef.current?.pause();
          }
        }
      },
      // Start fetching one viewport ahead so it is ready by the time it lands.
      { rootMargin: "300px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlay, src]);

  return (
    <div ref={wrapperRef} className={`w-full h-full relative ${className || ""}`}>
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        poster={poster}
        preload={shouldLoad ? "metadata" : "none"}
        autoPlay={autoPlay}
        className="w-full h-full object-cover"
        {...props}
      />
    </div>
  );
}
