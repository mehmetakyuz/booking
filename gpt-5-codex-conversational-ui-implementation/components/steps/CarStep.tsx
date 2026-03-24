'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { getBackendDefault } from '@/lib/booking/selection'
import { formatPrice, formatPriceDelta } from '@/lib/utils/price'
import { getNextStepLabel, OptionCard, PanelLoadingState, StepFooter, StepShell } from '@/components/steps/shared'

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
      title="Choose your car hire"
      description="The included car returned by the API is selected by default. Car extras are loaded for the selected car."
    >
      {carSearch.status === 'searching' ? (
        <PanelLoadingState detail="Available car-hire options are loading in this panel." title="Searching for available cars…" />
      ) : null}

      {carSearch.status === 'error' ? (
        <div className="error-banner">
          <p>{carSearch.error}</p>
          <button className="button button-secondary" onClick={() => actions.ensureCarsLoaded()} type="button">
            Retry
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
                <div className="field-grid">
                  {extras.map((extra) => {
                    const checked = selectedExtraIds.includes(extra.id)
                    return (
                      <label className="field" key={extra.id}>
                        <span>
                          {extra.name} · {formatPrice(extra.price)}
                        </span>
                        <input
                          checked={checked}
                          onChange={(event) =>
                            setSelectedExtraIds((value) =>
                              event.target.checked ? [...value, extra.id] : value.filter((item) => item !== extra.id),
                            )
                          }
                          type="checkbox"
                        />
                      </label>
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
