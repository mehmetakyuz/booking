'use client'

import { useState } from 'react'
import { useBooking } from '@/lib/booking/context'

export function TopRail() {
  const { state, actions } = useBooking()
  const [open, setOpen] = useState(false)
  const current = state.steps[state.currentStep]

  return (
    <header className="top-rail" role="banner">
      <div className="top-rail-inner">
        <a className="top-rail-logo" href="/" aria-label="Secret Escapes home">
          <img src="/logo-light.svg" alt="Secret Escapes" height={24} />
        </a>
        <nav className="top-rail-steps" aria-label="Booking steps">
          {state.steps.map((s, i) => {
            const isCurrent = i === state.currentStep
            const isCompleted = i < state.currentStep
            const className = [
              'step-link',
              isCurrent && 'step-link--current',
              isCompleted && 'step-link--completed',
              !isCurrent && !isCompleted && 'step-link--future',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={s.id}
                type="button"
                className={className}
                onClick={() => {
                  if (isCompleted) actions.goToStep(i)
                }}
                disabled={!isCompleted && !isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {s.number}. {s.label}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          className="top-rail-mobile-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle booking steps"
        >
          <span className="top-rail-current">
            {current ? `${current.number}. ${current.label}` : ''}
          </span>
          <span className="top-rail-hamburger" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
      {open ? (
        <ul className="top-rail-mobile-panel" role="menu">
          {state.steps.map((s, i) => {
            const isCompleted = i < state.currentStep
            const isCurrent = i === state.currentStep
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!isCompleted && !isCurrent}
                  onClick={() => {
                    if (isCompleted) {
                      actions.goToStep(i)
                      setOpen(false)
                    }
                  }}
                  className={
                    'mobile-step-link' +
                    (isCurrent ? ' mobile-step-link--current' : '') +
                    (isCompleted ? ' mobile-step-link--completed' : '')
                  }
                >
                  {s.number}. {s.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </header>
  )
}
