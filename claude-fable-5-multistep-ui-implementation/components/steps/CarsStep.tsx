'use client'

import React, { useEffect } from 'react'
import { CarFront, Check } from 'lucide-react'
import { useBookingActions, useBookingState } from '@/lib/store'
import { PanelLoader, Spinner } from '../Loading'
import { PriceBlock } from '../PriceBlock'
import { StepFooter } from '../StepFooter'
import { carExtraTypeLabel, formatMoney, transmissionLabel } from '@/lib/format'
import { getSelectedProductId } from '@/lib/payload'

export function CarsStep() {
  const state = useBookingState()
  const actions = useBookingActions()
  const { cars, carsStatus, carExtras, carExtrasLoading, payload, offerMeta } = state
  const currency = offerMeta?.currency ?? 'GBP'

  useEffect(() => {
    actions.ensureCars()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (carsStatus === 'idle' || carsStatus === 'searching') {
    return (
      <div className="step-panel">
        <h1 className="step-heading">Choose your car</h1>
        <PanelLoader label="Searching for car hire…" />
      </div>
    )
  }

  if (carsStatus === 'noresults' || !cars?.cars.length) {
    return (
      <div className="step-panel">
        <h1 className="step-heading">Choose your car</h1>
        <div className="no-results">
          <h2>No cars are available for these dates</h2>
          <p>We couldn’t find car hire for your selected dates. Please choose a different stay.</p>
          <button type="button" className="btn btn-primary" onClick={() => actions.resetToDates()}>
            Choose new dates
          </button>
        </div>
      </div>
    )
  }

  const baseline = cars.cars.find((c) => c.selected) ?? null
  const payloadCarId = getSelectedProductId(payload.products, 'C:')
  const activeId = payloadCarId ?? baseline?.id ?? null
  const activeProduct = (payload.products ?? []).find((p) => p.id === activeId)
  const selectedExtraIds = new Set((activeProduct?.options ?? []).map((o) => o.id))

  return (
    <div className="step-panel">
      <h1 className="step-heading">Choose your car</h1>

      <div className="option-list">
        {cars.cars.map((car) => {
          const isActive = car.id === activeId
          const isBaseline = baseline != null && car.id === baseline.id
          const delta = baseline?.price != null && car.price != null ? car.price - baseline.price : null
          const v = car.vehicle
          const specs = [
            v?.category,
            transmissionLabel(v?.transmission),
            v?.maxSeats ? `${v.maxSeats} seats` : null,
            v?.doors ? `${v.doors} doors` : null,
            v?.airConditioning ? 'Air conditioning' : null,
          ].filter(Boolean)
          return (
            <div
              key={car.id}
              className={`option-card car-card${isActive ? ' is-selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!isActive) actions.selectCar(car.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isActive) actions.selectCar(car.id)
              }}
            >
              <div className="option-media">
                {v?.photo?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.photo.url} alt={v.modelName ?? 'Car'} className="option-img option-img-contain" loading="lazy" />
                ) : (
                  <CarFront size={36} />
                )}
              </div>
              <div className="option-content">
                <h3 className="option-title">{v?.modelName ?? 'Hire car'}</h3>
                {specs.length ? <p className="option-meta">{specs.join(' · ')}</p> : null}
                {car.pickupLocation?.name ? <p className="option-meta">Pick-up: {car.pickupLocation.name}</p> : null}
                {car.productTermsUrl ? (
                  <a
                    className="text-link"
                    href={car.productTermsUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Rental terms
                  </a>
                ) : null}
              </div>
              <PriceBlock isBaseline={isBaseline} delta={delta} total={car.price} currency={currency} />
            </div>
          )
        })}
      </div>

      <section className="car-extras-section">
        <h2 className="section-heading">Car extras</h2>
        {carExtrasLoading ? (
          <div className="inline-loader">
            <Spinner size={22} />
            <span>Loading extras…</span>
          </div>
        ) : carExtras && carExtras.carId === activeId && carExtras.extras.length ? (
          <div className="board-list">
            {carExtras.extras.map((extra) => {
              const isOn = selectedExtraIds.has(extra.id)
              const typeLabel = carExtraTypeLabel(extra.extraType)
              return (
                <button
                  key={extra.id}
                  type="button"
                  className={`board-option${isOn ? ' is-selected' : ''}`}
                  onClick={() => actions.toggleCarExtra(extra.id)}
                >
                  <span className="board-option-body">
                    <span className="board-option-name">
                      {isOn ? <Check size={14} className="board-check" /> : null}
                      {extra.name ?? typeLabel ?? 'Extra'}
                    </span>
                    <span className="board-option-desc">
                      {[typeLabel && typeLabel !== extra.name ? typeLabel : null, extra.prePayable ? 'Pay now' : 'Pay at pick-up']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {extra.keyFactsUrl || extra.policyDocUrl ? (
                      <span className="board-option-links">
                        {extra.keyFactsUrl ? (
                          <a href={extra.keyFactsUrl} target="_blank" rel="noreferrer" className="text-link" onClick={(e) => e.stopPropagation()}>
                            Key facts
                          </a>
                        ) : null}
                        {extra.policyDocUrl ? (
                          <a href={extra.policyDocUrl} target="_blank" rel="noreferrer" className="text-link" onClick={(e) => e.stopPropagation()}>
                            Policy document
                          </a>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                  {extra.amount != null ? (
                    <span className="price-block">
                      <span className="price-delta">+{formatMoney(extra.amount, currency)}</span>
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="empty-note">No extras are available for this car.</p>
        )}
      </section>

      <StepFooter continueDisabled={state.receiptLoading} />
    </div>
  )
}
