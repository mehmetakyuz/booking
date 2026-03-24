'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { CarOption, CarExtra } from '@/lib/booking/types'

/* ── Helpers ── */

function formatPrice(pence: number): string {
  return `\u00A3${(pence / 100).toFixed(0)}`
}

function formatPriceDelta(delta: number): string {
  if (delta === 0) return 'Included'
  const sign = delta > 0 ? '+' : '-'
  return `${sign}\u00A3${(Math.abs(delta) / 100).toFixed(0)}`
}

/* ── Component ── */

export default function CarsStep() {
  const { state, actions } = useBooking()
  const { cars, carSearch, carExtrasByCarId, carExtrasLoadingForId, steps, currentStepIndex } = state

  /* ── Load cars on mount ── */
  const loadedRef = useRef(false)
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      actions.loadCars()
    }
  }, [actions])

  /* ── Selected car ── */
  const defaultCarId = useMemo(() => {
    const sel = cars.find((c) => c.selected)
    return sel?.id ?? cars[0]?.id ?? null
  }, [cars])

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)

  // Sync default once cars load
  useEffect(() => {
    if (defaultCarId && selectedCarId === null) {
      setSelectedCarId(defaultCarId)
    }
  }, [defaultCarId, selectedCarId])

  const selectedCar = cars.find((c) => c.id === selectedCarId) ?? null

  /* ── Baseline price (the default/cheapest car) for delta computation ── */
  const baselinePrice = useMemo(() => {
    const def = cars.find((c) => c.selected)
    if (def) return def.price
    if (cars.length > 0) return cars[0].price
    return 0
  }, [cars])

  /* ── Car extras ── */
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(new Set())
  const extrasLoadedForRef = useRef<Set<string>>(new Set())

  // Load extras when a car is selected (if not already loaded)
  useEffect(() => {
    if (
      selectedCarId &&
      !carExtrasByCarId[selectedCarId] &&
      !extrasLoadedForRef.current.has(selectedCarId)
    ) {
      extrasLoadedForRef.current.add(selectedCarId)
      actions.loadCarExtras(selectedCarId)
    }
  }, [selectedCarId, carExtrasByCarId, actions])

  // Reset selected extras when car changes
  const prevCarIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedCarId !== prevCarIdRef.current) {
      setSelectedExtraIds(new Set())
      prevCarIdRef.current = selectedCarId
    }
  }, [selectedCarId])

  const extras: CarExtra[] = selectedCarId ? carExtrasByCarId[selectedCarId] ?? [] : []
  const extrasLoading = carExtrasLoadingForId === selectedCarId

  function toggleExtra(extraId: string) {
    setSelectedExtraIds((prev) => {
      const next = new Set(prev)
      if (next.has(extraId)) {
        next.delete(extraId)
      } else {
        next.add(extraId)
      }
      return next
    })
  }

  /* ── Handle car selection ── */
  function handleSelectCar(carId: string) {
    if (carId === selectedCarId) return
    setSelectedCarId(carId)
  }

  /* ── Continue / confirm ── */
  const [confirming, setConfirming] = useState(false)

  async function handleContinue() {
    if (!selectedCarId) return
    setConfirming(true)
    try {
      await actions.confirmCar({
        carId: selectedCarId,
        extraIds: Array.from(selectedExtraIds),
      })
    } catch {
      // Error handled in flow
    } finally {
      setConfirming(false)
    }
  }

  /* ── Next step label ── */
  const nextStep = steps[currentStepIndex + 1]
  const continueLabel = nextStep
    ? `Step ${currentStepIndex + 2}. ${nextStep.label}`
    : 'Continue'

  /* ── Render: searching state ── */
  if (carSearch.status === 'searching' || carSearch.status === 'idle') {
    return (
      <div className="step-panel">
        <div className="step-panel-header">
          <h2 className="step-title serif">Car hire</h2>
        </div>
        <div className="step-panel-content">
          <div className="loader-overlay" style={{ position: 'relative', minHeight: 200 }}>
            <div className="loader-spinner" />
          </div>
          <p style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            Searching for car hire options...
          </p>
        </div>
      </div>
    )
  }

  /* ── Render: error state ── */
  if (carSearch.status === 'error') {
    return (
      <div className="step-panel">
        <div className="step-panel-header">
          <h2 className="step-title serif">Car hire</h2>
        </div>
        <div className="step-panel-content">
          <p className="error-text">
            {carSearch.error ?? 'Something went wrong while searching for cars.'}
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              loadedRef.current = false
              actions.loadCars()
            }}
          >
            Try again
          </button>
        </div>
        <div className="step-panel-actions">
          <button type="button" className="btn-secondary" onClick={actions.goBack}>
            Back
          </button>
        </div>
      </div>
    )
  }

  /* ── Render: success state ── */
  return (
    <div className="step-panel">
      <div className="step-panel-header">
        <h2 className="step-title serif">Car hire</h2>
      </div>

      <div className="step-panel-content">
        {/* ── Car list ── */}
        <div className="option-list">
          {cars.map((car) => {
            const isSelected = car.id === selectedCarId
            const priceDelta = car.price - baselinePrice

            return (
              <button
                key={car.id}
                type="button"
                className={`option-card${isSelected ? ' selected' : ''}`}
                onClick={() => handleSelectCar(car.id)}
              >
                {/* Left: car image */}
                <div className="option-card-image">
                  <img
                    src={car.imageUrl}
                    alt={car.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Right: body */}
                <div className="option-card-body">
                  <div className="option-card-title">{car.name}</div>
                  <div className="option-card-description">{car.category}</div>

                  {/* Specs */}
                  <div className="option-card-description" style={{ marginTop: 'var(--space-2)' }}>
                    {[
                      car.transmission,
                      car.seats != null ? `${car.seats} seats` : null,
                      car.doors != null ? `${car.doors} doors` : null,
                      car.airConditioning ? 'A/C' : null,
                    ]
                      .filter(Boolean)
                      .join(' \u00B7 ')}
                  </div>

                  {/* Pickup / Dropoff */}
                  <div className="option-card-description" style={{ marginTop: 'var(--space-2)' }}>
                    <span>Pickup: {car.pickupLabel}</span>
                    <br />
                    <span>Drop-off: {car.dropoffLabel}</span>
                  </div>

                  {/* Insurance */}
                  {car.insurance && (
                    <div className="option-card-description" style={{ marginTop: 'var(--space-2)' }}>
                      {car.insurance}
                    </div>
                  )}

                  {/* Price delta */}
                  <div className="option-card-price">
                    {priceDelta === 0 ? (
                      <span className="option-card-price-included">Included</span>
                    ) : (
                      <span
                        className={`option-card-price-delta ${priceDelta > 0 ? 'positive' : 'secondary'}`}
                      >
                        {formatPriceDelta(priceDelta)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Car extras ── */}
        {selectedCarId && (
          <section style={{ marginTop: 'var(--space-6)' }}>
            <h3 className="step-subtitle">Extras</h3>

            {extrasLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div className="loader-spinner" style={{ width: 20, height: 20 }} />
                <span>Loading extras...</span>
              </div>
            )}

            {!extrasLoading && extras.length === 0 && (
              <p className="option-card-description">No extras available for this car.</p>
            )}

            {!extrasLoading && extras.length > 0 && (
              <div className="chip-row" style={{ flexWrap: 'wrap' }}>
                {extras.map((extra) => {
                  const isActive = selectedExtraIds.has(extra.id)
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      className={`chip${isActive ? ' selected' : ''}`}
                      onClick={() => toggleExtra(extra.id)}
                    >
                      <span className="chip-label">{extra.name}</span>
                      <span className="chip-meta">{extra.extraType}</span>
                      <span className="chip-price">{formatPrice(extra.price)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="step-panel-actions">
        <button type="button" className="btn-secondary" onClick={actions.goBack}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={!selectedCarId || confirming}
          onClick={handleContinue}
        >
          {confirming ? 'Loading...' : continueLabel}
        </button>
      </div>
    </div>
  )
}
