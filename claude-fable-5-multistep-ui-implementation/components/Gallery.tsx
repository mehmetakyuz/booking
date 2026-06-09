'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Slidable gallery carousel shared by the hotel and activity detail modals.
export function GalleryCarousel({ images, alt }: { images: (string | null)[]; alt: string }) {
  const urls = images.filter((u): u is string => Boolean(u))
  const [index, setIndex] = useState(0)
  if (!urls.length) return null

  const prev = () => setIndex((i) => (i - 1 + urls.length) % urls.length)
  const next = () => setIndex((i) => (i + 1) % urls.length)

  return (
    <div className="gallery-carousel">
      <div className="gallery-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {urls.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={u} alt={`${alt} photo ${i + 1}`} className="gallery-slide" loading="lazy" />
        ))}
      </div>
      {urls.length > 1 ? (
        <>
          <button type="button" className="gallery-nav gallery-nav-prev" aria-label="Previous photo" onClick={prev}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="gallery-nav gallery-nav-next" aria-label="Next photo" onClick={next}>
            <ChevronRight size={20} />
          </button>
          <div className="gallery-dots">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                className={`gallery-dot${i === index ? ' is-active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
