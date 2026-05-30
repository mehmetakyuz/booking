'use client';

import React, { useState } from 'react';
import { useBooking } from '@/lib/state';

export default function TopRail() {
  const { state, actions } = useBooking();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentStepDef = state.steps.find(s => s.id === state.currentStep);

  const handleStepClick = (stepId: number) => {
    if (stepId <= state.maxStepReached) {
      actions.goToStep(stepId);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="top-rail">
      <div className="top-rail-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-light.svg"
          alt="Secret Escapes"
          className="top-rail-logo"
        />
      </div>

      {/* Desktop Step Indicator */}
      <nav className="top-rail-right" style={{ display: 'flex' }}>
        {state.steps.map((step) => {
          const isActive = step.id === state.currentStep;
          const isCompleted = step.id < state.currentStep || step.id <= state.maxStepReached;
          const isFuture = step.id > state.maxStepReached;

          let stepClass = 'step-item';
          if (isActive) stepClass += ' active';
          else if (isCompleted) stepClass += ' completed';
          else stepClass += ' future';

          return (
            <div
              key={step.id}
              className={stepClass}
              onClick={() => handleStepClick(step.id)}
              style={{
                display: 'flex',
                // hide on narrow viewports
                cursor: isFuture ? 'not-allowed' : 'pointer',
              }}
            >
              {step.id}. {step.label}
            </div>
          );
        })}
      </nav>

      {/* Mobile Hamburger menu for steps */}
      <div className="mobile-step-toggle" style={{ display: 'none' }}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          ☰
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 850px) {
          .top-rail-right {
            display: none !important;
          }
          .mobile-step-toggle {
            display: block !important;
          }
        }
      `}</style>

      {/* Mobile Steps Expandable Panel */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            backgroundColor: '#17171a',
            borderTop: '1px solid #333',
            zIndex: 199,
            padding: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }}
        >
          {state.steps.map((step) => {
            const isActive = step.id === state.currentStep;
            const isCompleted = step.id <= state.maxStepReached;
            
            return (
              <div
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                style={{
                  padding: '12px 8px',
                  color: isActive ? '#0098A8' : isCompleted ? '#ffffff' : '#575757',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: isCompleted ? 'pointer' : 'not-allowed',
                  borderBottom: '1px solid #222',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '14px'
                }}
              >
                {step.id}. {step.label} {isActive ? '•' : ''}
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
}
