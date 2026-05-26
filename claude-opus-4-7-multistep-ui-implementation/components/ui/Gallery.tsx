"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

// Slidable gallery carousel used by accommodation and activity detail modals.
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return null;
  const safe = ((index % images.length) + images.length) % images.length;

  return (
    <div className="gallery">
      <div className="gallery__viewport">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[safe]} alt={alt} />
      </div>
      {images.length > 1 && (
        <>
          <button
            className="gallery__nav gallery__nav--prev"
            onClick={() => setIndex(safe - 1)}
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="gallery__nav gallery__nav--next"
            onClick={() => setIndex(safe + 1)}
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>
          <div className="gallery__dots">
            {images.map((_, i) => (
              <button
                key={i}
                className={
                  i === safe ? "gallery__dot gallery__dot--active" : "gallery__dot"
                }
                onClick={() => setIndex(i)}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
