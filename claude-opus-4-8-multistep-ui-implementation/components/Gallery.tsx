"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Slidable gallery carousel used by detail modals (hotels, activities).
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  const safe = ((idx % images.length) + images.length) % images.length;

  return (
    <div className="gallery">
      <div className="gallery-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[safe]} alt={alt} className="gallery-image" />
        {images.length > 1 ? (
          <>
            <button
              className="gallery-nav gallery-nav--prev"
              onClick={() => setIdx(safe - 1)}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="gallery-nav gallery-nav--next"
              onClick={() => setIdx(safe + 1)}
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
            <div className="gallery-dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`gallery-dot${i === safe ? " is-active" : ""}`}
                  onClick={() => setIdx(i)}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
