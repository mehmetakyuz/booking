'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { getBackendDefault } from '@/lib/booking/selection'
import { formatPrice, formatPriceDelta } from '@/lib/utils/price'
import { getNextStepLabel, OptionCard, PanelLoadingState, StepFooter, StepShell } from '@/components/steps/shared'

const CAR_EXTRA_TYPE_LABELS: Record<string, string> = {
  INSURANCE: 'Insurance',
  DAMAGE_WAIVER: 'Damage waiver',
  EXCESS_REDUCTION: 'Excess reduction',
  COVER: 'Cover',
}

function formatCarExtraType(value?: string | null) {
  if (!value) return ''
  return CAR_EXTRA_TYPE_LABELS[value] ?? value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase())
}

export function CarStep() {
  const {
    state: { cars, carExtrasByCarId, carExtrasLoadingForId, carSearch, currentStepIndex, payload, steps },
    actions,
  } = useBooking()
  const [selectedCarId, setSelectedCarId] = useState(
    payload.products.find((product) => product.id.startsWith('C:'))?.id ?? getBackendDefault(cars)?.id ?? '',
  )
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>(
    payload.products.find((product) => product.id.startsWith('C:'))?.options?.map((option) => option.id) ?? [],
  )

  useEffect(() => {
    void actions.ensureCarsLoaded()
  }, [actions])

  useEffect(() => {
    const nextCarId = payload.products.find((product) => product.id.startsWith('C:'))?.id ?? getBackendDefault(cars)?.id ?? ''
    setSelectedCarId(nextCarId)
    setSelectedExtraIds(payload.products.find((product) => product.id.startsWith('C:'))?.options?.map((option) => option.id) ?? [])
  }, [cars, payload.products])

  useEffect(() => {
    if (selectedCarId && !carExtrasByCarId[selectedCarId] && carExtrasLoadingForId !== selectedCarId) {
      void actions.loadCarExtras(selectedCarId)
    }
  }, [actions, carExtrasByCarId, carExtrasLoadingForId, selectedCarId])

  const extras = selectedCarId ? carExtrasByCarId[selectedCarId] ?? [] : []
  const baseCarPrice = getBackendDefault(cars)?.price ?? 0
  const defaultCarId = getBackendDefault(cars)?.id ?? ''

  return (
    <StepShell
      eyebrow={`Step ${currentStepIndex + 1}`}
      title="Cars"
      description="Choose your car hire and any add-ons you want to include."
    >
      {carSearch.status === 'searching' ? (
        <PanelLoadingState detail="Available car-hire options are loading in this panel." title="Searching for available cars…" />
      ) : null}

      {carSearch.status === 'error' ? (
        <div className="error-banner">
          <p>{carSearch.error}</p>
          <button className="button button-secondary" onClick={actions.resetToCalendar} type="button">
            Choose different dates
          </button>
        </div>
      ) : null}

      {carSearch.status === 'success' ? (
        <>
          <div className="card-grid">
            {cars.map((car) => (
              <OptionCard
                className="option-media-card"
                key={car.id}
                selected={selectedCarId === car.id}
                onClick={async () => {
                  setSelectedCarId(car.id)
                  setSelectedExtraIds([])
                  await actions.loadCarExtras(car.id)
                }}
              >
                <div className="option-media">
                  {car.imageUrl ? (
                    <img alt={car.name} className="option-media-image" src={car.imageUrl} />
                  ) : (
                    <div className="option-media-fallback option-media-icon">
                      <span aria-hidden="true">🚗</span>
                    </div>
                  )}
                </div>
                <div className="option-card-copy">
                  <div className="option-card-top">
                    <div>
                      <strong>{car.name}</strong>
                      <p className="muted">
                        {car.category} · {car.transmission} · {car.pickupLabel}
                      </p>
                    </div>
                    <div className="option-price-block">
                      <span className={`option-price-delta${car.id === defaultCarId ? ' is-included' : ''}`}>
                        {car.id === defaultCarId ? 'Included' : formatPriceDelta(car.price, baseCarPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </OptionCard>
            ))}
          </div>

          {selectedCarId ? (
            <div className="step-section">
              <h3 className="section-heading">Extras</h3>
              {carExtrasLoadingForId === selectedCarId ? (
                <div className="loader-inline">Loading car extras…</div>
              ) : extras.length ? (
                <div className="card-grid">
                  {extras.map((extra) => {
                    const checked = selectedExtraIds.includes(extra.id)
                    return (
                      <OptionCard
                        className="car-extra-card"
                        key={extra.id}
                        onClick={() =>
                          setSelectedExtraIds((value) =>
                            checked ? value.filter((item) => item !== extra.id) : [...value, extra.id],
                          )
                        }
                        selected={checked}
                      >
                        <div className="car-extra-copy">
                          <div className="car-extra-top">
                            <strong>{extra.name}</strong>
                            <span className="car-extra-price">{formatPrice(extra.price)}</span>
                          </div>
                          <div className="car-extra-meta">
                            {formatCarExtraType(extra.extraType) ? <span>{formatCarExtraType(extra.extraType)}</span> : null}
                            <span>{extra.prePayable ? 'Pay now' : 'Pay at desk'}</span>
                          </div>
                          {extra.keyFactsUrl || extra.policyDocUrl ? (
                            <div className="car-extra-links">
                              {extra.keyFactsUrl ? (
                                <a
                                  className="link-button"
                                  href={extra.keyFactsUrl}
                                  onClick={(event) => event.stopPropagation()}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Key facts
                                </a>
                              ) : null}
                              {extra.policyDocUrl ? (
                                <a
                                  className="link-button"
                                  href={extra.policyDocUrl}
                                  onClick={(event) => event.stopPropagation()}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Policy document
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <input
                          checked={checked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            setSelectedExtraIds((value) =>
                              event.target.checked ? [...value, extra.id] : value.filter((item) => item !== extra.id),
                            )
                          }
                          type="checkbox"
                        />
                      </OptionCard>
                    )
                  })}
                </div>
              ) : (
                <div className="info-banner">No extra add-ons are available for this car.</div>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      <StepFooter
        continueLabel={getNextStepLabel(steps, currentStepIndex)}
        onBack={actions.goBack}
        onContinue={() => {
          void actions.confirmCar({
            carId: selectedCarId || undefined,
            selectedExtraIds,
          })
        }}
      />
    </StepShell>
  )
}
