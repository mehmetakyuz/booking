'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Shared custom dropdown: compact trigger field + absolutely positioned panel.
export function Dropdown({
  label,
  disabled,
  children,
  closeOnSelect = true,
  panelClassName,
}: {
  label: React.ReactNode
  disabled?: boolean
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
  closeOnSelect?: boolean
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className={`dropdown-trigger${open ? ' is-open' : ''}`}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dropdown-trigger-label">{label}</span>
        <ChevronDown size={16} className="dropdown-caret" />
      </button>
      {open ? (
        <div
          className={`dropdown-panel${panelClassName ? ` ${panelClassName}` : ''}`}
          onClick={closeOnSelect && typeof children !== 'function' ? close : undefined}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      ) : null}
    </div>
  )
}
