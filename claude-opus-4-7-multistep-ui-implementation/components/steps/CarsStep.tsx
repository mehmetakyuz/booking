'use client'

import { useEffect } from 'react'
import { useBooking } from '@/lib/booking/context'
import { formatMoney, formatDelta } from '@/lib/booking/format'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { StepFooter } from './StepFooter'

export function CarsStep() {
  const { state, actions } = useBooking()

  useEffect(() => {
    if (!state.cars && !state.async.carsLoading) actions.loadCars()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cars = state.cars ?? []
  const loading = state.async.carsLoading
  const empty =
    !loading && (!!state.async.carResultsEmpty || (state.cars !== null && cars.length === 0))

  const baseline = cars.find((c) => c.selected) ?? cars[0]
  const current =
    cars.find((c) => (state.payload.products ?? []).some((p) => p.id === c.id)) ?? baseline
  const extras = state.carExtras ?? []
  const selectedCar = state.payload.products?.find((p) => p.id.startsWith('C:'))
  const selectedExtraIds = new Set(selectedCar?.options?.map((o) => o.id) ?? [])

  const canContinue = !!current && !state.async.receiptLoading && (state.receipt?.errors?.length ?? 0) === 0

  return (
    <div className="step-panel">
      <header className="step-panel-head">
        <h1 className="step-heading">Add a rental car</h1>
      </header>

      {loading ? (
        <div className="panel-loading">
          <Spinner size={32} label={state.async.carSearchStatus ?? 'Searching cars…'} />
        </div>
      ) : empty ? (
        <div className="empty-state">
          <h3>No cars available for this stay</h3>
          <p>Try different dates or airport from Step 1.</p>
          <Button variant="secondary" onClick={() => actions.restartFromDates()}>
            Back to dates
          </Button>
        </div>
      ) : (
        <>
          <ul className="option-list">
            {cars.map((c) => {
              const isActive = c.id === current?.id
              const isBaseline = c.id === baseline?.id
              const delta = (c.price ?? 0) - (baseline?.price ?? 0)
              return (
                <li
                  key={c.id}
                  className={'option-card' + (isActive ? ' option-card--active' : '')}
                >
                  <button
                    type="button"
                    className="option-card-image"
                    onClick={() => actions.selectCar(c.id)}
                  >
                    {c.vehicle?.photo?.url ? <img src={c.vehicle.photo.url} alt="" /> : null}
                  </button>
                  <div className="option-card-body">
                    <div className="option-card-content">
                      <h3 className="option-card-name">{c.vehicle?.modelName}</h3>
                      <p className="option-card-meta">
                        {c.vehicle?.category}
                        {c.vehicle?.transmission ? ` · ${c.vehicle.transmission}` : ''}
                        {c.vehicle?.minSeats ? ` · ${c.vehicle.minSeats} seats` : ''}
                        {c.vehicle?.doors ? ` · ${c.vehicle.doors} doors` : ''}
                      </p>
                      {c.pickupLocation?.name ? (
                        <p className="option-card-subtitle">
                          Pick-up: {c.pickupLocation.name}
                          {c.pickupLocation.airport?.iataCode ? ` (${c.pickupLocation.airport.iataCode})` : ''}
                        </p>
                      ) : null}
                      {c.insurance ? <p className="option-card-subtitle">{c.insurance}</p> : null}
                    </div>
                    <div className="option-card-price">
                      <span className="option-card-delta">
                        {isBaseline ? 'Included' : formatDelta(delta)}
                      </span>
                      <span className="option-card-total">{formatMoney(c.price ?? 0)}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <section className="rooms-section">
            <h2 className="rooms-section-title">Extras</h2>
            {state.async.carExtrasLoading ? (
              <Spinner size={20} label="Loading extras…" />
            ) : extras.length === 0 ? (
              <p className="empty-state">No extras available for this car.</p>
            ) : (
              <ul className="option-list option-list--compact">
                {extras.map((ex) => {
                  const isSel = selectedExtraIds.has(ex.id)
                  return (
                    <li
                      key={ex.id}
                      className={'option-card option-card--compact' + (isSel ? ' option-card--active' : '')}
                    >
                      <button
                        type="button"
                        className="option-card-body"
                        onClick={() => actions.toggleCarExtra(ex.id)}
                      >
                        <div className="option-card-content">
                          <h3 className="option-card-name">{ex.name}</h3>
                          <p className="option-card-meta">
                            {ex.extraType ? ex.extraType : ''}
                            {ex.prePayable !== undefined
                              ? ` · ${ex.prePayable ? 'Pay now' : 'Pay at desk'}`
                              : ''}
                          </p>
                          <div className="extra-docs">
                            {ex.policyDocUrl ? (
                              <a
                                className="link-button btn-sm"
                                href={ex.policyDocUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Policy
                              </a>
                            ) : null}
                            {ex.keyFactsUrl ? (
                              <a
                                className="link-button btn-sm"
                                href={ex.keyFactsUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Key facts
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <div className="option-card-price">
                          <span className="option-card-delta">
                            {formatDelta(ex.price?.amount ?? 0)}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <StepFooter
        onContinue={() => {
          if (canContinue) actions.goToStep(state.currentStep + 1)
        }}
        continueDisabled={!canContinue}
      />
    </div>
  )
}
