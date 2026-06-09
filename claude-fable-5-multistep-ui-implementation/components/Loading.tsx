'use client'

import React from 'react'

export function Spinner({ size = 28 }: { size?: number }) {
  return <span className="loader-spinner" style={{ width: size, height: size }} aria-hidden />
}

// Shared in-panel loading treatment used by every step.
export function PanelLoader({ label }: { label: string }) {
  return (
    <div className="panel-loader" role="status">
      <Spinner size={34} />
      <p className="panel-loader-label">{label}</p>
    </div>
  )
}

// Grey-out + spinner overlay for surfaces that stay visible while refreshing.
export function LoadingOverlay() {
  return (
    <div className="loading-overlay" role="status">
      <Spinner size={32} />
    </div>
  )
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-list" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-media" />
          <div className="skeleton-lines">
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-line" style={{ width: '85%' }} />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
