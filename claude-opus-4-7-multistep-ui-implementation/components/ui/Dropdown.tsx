'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface DropdownProps {
  label: string
  summary: ReactNode
  children: (close: () => void) => ReactNode
  width?: number
  disabled?: boolean
}

export function Dropdown({ label, summary, children, width = 320, disabled }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])
  return (
    <div className={`dropdown${disabled ? ' dropdown--disabled' : ''}`} ref={ref}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-expanded={open}
        disabled={disabled}
      >
        <span className="dropdown-trigger-summary">{summary}</span>
        <span className="chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="dropdown-panel" style={{ width }} role="dialog" aria-label={label}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  )
}
