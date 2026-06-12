"use client";

import { useEffect, useRef, useState } from "react";

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

export default function LazyVideo({ src, className, ...props }: LazyVideoProps) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "300px", // Preload video 300px before it enters viewport
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (observer && currentRef) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className || ""}`}>
      {inView ? (
        <video src={src} className="w-full h-full object-cover" {...props} />
      ) : (
        <div className="w-full h-full bg-zinc-950 animate-pulse flex items-center justify-center">
          {/* Soft loading spinner inside a dark placeholder card */}
          <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
