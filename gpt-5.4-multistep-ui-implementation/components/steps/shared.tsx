'use client'

import { ReactNode, useEffect, useId, useRef, useState } from 'react'
import { StepDefinition } from '@/lib/booking/types'

export function StepShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="step-shell">
      <p className="step-eyebrow">{eyebrow}</p>
      <h2 className="step-title">{title}</h2>
      {description ? <p className="step-description">{description}</p> : null}
      {children}
    </section>
  )
}

export function StepFooter({
  backLabel = 'Back',
  continueLabel = 'Continue',
  onBack,
  onContinue,
  canGoBack = true,
  canContinue = true,
  continueBusy = false,
  children,
}: {
  backLabel?: string
  continueLabel?: string
  onBack?: () => void
  onContinue?: () => void
  canGoBack?: boolean
  canContinue?: boolean
  continueBusy?: boolean
  children?: ReactNode
}) {
  return (
    <div className="step-footer">
      <div className="step-footer-meta">{children}</div>
      <div className="step-footer-actions">
        {canGoBack && onBack ? (
          <button className="button button-secondary" onClick={onBack} type="button">
            {backLabel}
          </button>
        ) : null}
        <button
          className="button button-primary"
          disabled={!canContinue || continueBusy}
          onClick={onContinue}
          type="button"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  )
}

export function PanelLoadingState({
  title,
  detail,
}: {
  title: string
  detail?: string
}) {
  return (
    <div className="panel-loading-state" aria-busy="true" aria-live="polite">
      <div className="panel-loading-skeleton panel-loading-skeleton-title" />
      <div className="panel-loading-skeleton panel-loading-skeleton-line" />
      <div className="panel-loading-skeleton panel-loading-skeleton-card" />
      <div className="panel-loading-skeleton panel-loading-skeleton-card" />
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  )
}

export function OptionCard({
  selected,
  onClick,
  className = '',
  as = 'button',
  children,
}: {
  selected?: boolean
  onClick?: () => void
  className?: string
  as?: 'button' | 'div'
  children: ReactNode
}) {
  const classes = `selection-card${selected ? ' is-selected' : ''}${className ? ` ${className}` : ''}`

  if (as === 'div') {
    return (
      <div
        className={classes}
        onClick={onClick}
        onKeyDown={(event) => {
          if (!onClick) {
            return
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
          }
        }}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </div>
    )
  }

  return (
    <button className={classes} onClick={onClick} type="button">
      {children}
    </button>
  )
}

export function getNextStepLabel(steps: StepDefinition[], currentStepIndex: number) {
  const nextStep = steps[currentStepIndex + 1]
  return nextStep ? `Step ${currentStepIndex + 2}. ${nextStep.label}` : 'Continue'
}

type DropdownOption = {
  value: string
  label: string
}

export function DropdownField({
  label,
  ariaLabel,
  value,
  options,
  disabled,
  onChange,
}: {
  label?: string
  ariaLabel?: string
  value: string
  options: DropdownOption[]
  disabled?: boolean
  onChange: (value: string) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (disabled) {
      setOpen(false)
    }
  }, [disabled])

  return (
    <div className="dropdown-field" ref={rootRef}>
      {label ? <span>{label}</span> : null}
      <button
        aria-label={ariaLabel ?? label}
        aria-controls={listboxId}
        aria-expanded={open}
        className={`dropdown-trigger${open ? ' is-open' : ''}`}
        disabled={disabled || !selectedOption}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="dropdown-trigger-label">{selectedOption?.label ?? ''}</span>
        <span aria-hidden="true" className="dropdown-trigger-icon">
          ▾
        </span>
      </button>
      {open ? (
        <div className="dropdown-menu" id={listboxId} role="listbox">
          {options.map((option) => {
            const selected = option.value === selectedOption?.value
            return (
              <button
                aria-selected={selected}
                className={`dropdown-option${selected ? ' is-selected' : ''}`}
                key={option.value}
                onClick={async () => {
                  setOpen(false)
                  if (!selected) {
                    await onChange(option.value)
                  }
                }}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {selected ? (
                  <span aria-hidden="true" className="dropdown-option-check">
                    ✓
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownPanelField({
  label,
  ariaLabel,
  triggerLabel,
  disabled,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  label?: string
  ariaLabel?: string
  triggerLabel: string
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const open = controlledOpen ?? uncontrolledOpen

  function setOpen(nextOpen: boolean | ((open: boolean) => boolean)) {
    const resolved = typeof nextOpen === 'function' ? nextOpen(open) : nextOpen
    if (controlledOpen === undefined) {
      setUncontrolledOpen(resolved)
    }
    onOpenChange?.(resolved)
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (disabled) {
      setOpen(false)
    }
  }, [disabled])

  return (
    <div className="dropdown-field" ref={rootRef}>
      {label ? <span>{label}</span> : null}
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        className={`dropdown-trigger${open ? ' is-open' : ''}`}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="dropdown-trigger-label">{triggerLabel}</span>
        <span aria-hidden="true" className="dropdown-trigger-icon">
          ▾
        </span>
      </button>
      {open ? (
        <div className="dropdown-menu dropdown-panel" id={panelId}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
