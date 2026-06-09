'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

// One shared modal pattern: dark backdrop, white shell, top-right circular ×.
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title?: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-shell${wide ? ' modal-shell-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
        {title ? <h3 className="modal-title">{title}</h3> : null}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
