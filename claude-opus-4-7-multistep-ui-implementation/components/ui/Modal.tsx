'use client'

import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, children, wide }: Props) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={'modal-shell' + (wide ? ' modal-shell--wide' : '')}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
        {title ? (
          <header className="modal-header">
            <h2>{title}</h2>
          </header>
        ) : null}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
