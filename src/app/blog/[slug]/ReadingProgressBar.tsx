"use client";

import { useEffect, useState } from "react";

export default function ReadingProgressBar() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const totalHeight = docHeight - windowHeight;

      if (totalHeight > 0) {
        const pct = (window.scrollY / totalHeight) * 100;
        setWidth(Math.min(pct, 100));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-[3.5px] bg-zinc-100 z-50 pointer-events-none">
      <div 
        className="h-full bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 transition-all duration-75 ease-out shadow-[0_0_8px_rgba(139,92,246,0.4)]" 
        style={{ width: `${width}%` }} 
      />
    </div>
  );
}
