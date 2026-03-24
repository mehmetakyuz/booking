'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { getBackendDefault, getPreferredSelection } from '@/lib/booking/selection'
import { formatPrice, formatPriceDelta } from '@/lib/utils/price'
import { getNextStepLabel, OptionCard, PanelLoadingState, StepFooter, StepShell } from '@/components/steps/shared'

function renderStars(count: number) {
  return Array.from({ length: count }, (_, index) => <span key={`star-${index}`}>★</span>)
}

function FacilityIcon({ facility }: { facility: string }) {
  const value = facility.toLowerCase()

  const sharedProps = {
    'aria-hidden': true,
    className: 'facility-svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (value.includes('wifi') || value.includes('wi-fi') || value.includes('internet')) {
    return (
      <svg {...sharedProps}>
        <path d="M4.5 9.5A11 11 0 0 1 12 6.5a11 11 0 0 1 7.5 3" />
        <path d="M7.5 12.5A6.8 6.8 0 0 1 12 11a6.8 6.8 0 0 1 4.5 1.5" />
        <path d="M10.5 15.5A2.8 2.8 0 0 1 12 15a2.8 2.8 0 0 1 1.5.5" />
        <circle cx="12" cy="18.2" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (value.includes('bed')) {
    return (
      <svg {...sharedProps}>
        <path d="M4 18.5v-7" />
        <path d="M20 18.5v-5.5a2 2 0 0 0-2-2H6" />
        <path d="M4 14.5h16" />
        <path d="M7 12V9.5A1.5 1.5 0 0 1 8.5 8H12a2 2 0 0 1 2 2v2" />
      </svg>
    )
  }
  if (value.includes('bath') || value.includes('shower')) {
    return (
      <svg {...sharedProps}>
        <path d="M6 12V8a3 3 0 1 1 6 0" />
        <path d="M4 12h14" />
        <path d="M5 12v3a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-3" />
      </svg>
    )
  }
  if (value.includes('air') || value.includes('condition')) {
    return (
      <svg {...sharedProps}>
        <rect x="4" y="6" width="16" height="5" rx="2" />
        <path d="M8 15c0 1-.6 1.7-1.6 2.3" />
        <path d="M12 15c0 1-.6 1.7-1.6 2.3" />
        <path d="M16 15c0 1-.6 1.7-1.6 2.3" />
      </svg>
    )
  }
  if (value.includes('tv') || value.includes('television')) {
    return (
      <svg {...sharedProps}>
        <rect x="4" y="6" width="16" height="11" rx="2" />
        <path d="M10 20h4" />
        <path d="M12 17v3" />
      </svg>
    )
  }
  if (value.includes('balcony') || value.includes('terrace')) {
    return (
      <svg {...sharedProps}>
        <path d="M6 6h12v4H6z" />
        <path d="M5 10h14" />
        <path d="M7 10v8" />
        <path d="M12 10v8" />
        <path d="M17 10v8" />
        <path d="M4 18h16" />
      </svg>
    )
  }
  if (value.includes('view')) {
    return (
      <svg {...sharedProps}>
        <path d="M3.5 7.5h17v9h-17z" />
        <path d="m6 14 3-3 2.5 2.5L14 11l3.5 3.5" />
        <circle cx="16.5" cy="10" r="1.2" />
      </svg>
    )
  }
  if (value.includes('kitchen')) {
    return (
      <svg {...sharedProps}>
        <path d="M6 4.5v15" />
        <path d="M10 4.5v7" />
        <path d="M8 11.5h4" />
        <path d="M16 4.5v15" />
        <path d="M16 10.5h3" />
      </svg>
    )
  }
  if (value.includes('pool')) {
    return (
      <svg {...sharedProps}>
        <path d="M5 9.5a2.5 2.5 0 0 1 5 0v4" />
        <path d="M14 7h4" />
        <path d="M3 17c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0 2 .8 3 0" />
        <path d="M3 20c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0 2 .8 3 0" />
      </svg>
    )
  }

  return (
    <svg {...sharedProps}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 9v3.5l2 1.5" />
    </svg>
  )
}

export function AccommodationStep() {
  const {
    state: { accommodations, accommodationsLoading, currentStepIndex, payload, steps },
    actions,
  } = useBooking()

  const selectedUnitProductId = payload.products.find((product) => product.group === 0)?.id
  const selectedBoardProductId = payload.products.find((product) => product.id.startsWith('A:') && product.id !== selectedUnitProductId)?.id
  const defaultAccommodationId = useMemo(() => getBackendDefault(accommodations)?.id ?? '', [accommodations])
  const [selectedAccommodationId, setSelectedAccommodationId] = useState(defaultAccommodationId)
  const selectedAccommodation = useMemo(
    () => {
      const matchingAccommodationId = selectedUnitProductId
        ? accommodations.find((accommodation) => accommodation.units.some((unit) => unit.id === selectedUnitProductId))?.id
        : undefined
      return getPreferredSelection(accommodations, [selectedAccommodationId, matchingAccommodationId, defaultAccommodationId])
    },
    [accommodations, defaultAccommodationId, selectedAccommodationId, selectedUnitProductId],
  )
  const defaultUnitId = useMemo(
    () => getBackendDefault(selectedAccommodation?.units ?? [])?.id ?? '',
    [selectedAccommodation?.units],
  )
  const [selectedUnitId, setSelectedUnitId] = useState(defaultUnitId)
  const selectedUnit = useMemo(
    () => getPreferredSelection(selectedAccommodation?.units ?? [], [selectedUnitId, selectedUnitProductId, defaultUnitId]),
    [defaultUnitId, selectedAccommodation?.units, selectedUnitId, selectedUnitProductId],
  )
  const defaultBoardId = useMemo(
    () => getBackendDefault(selectedUnit?.boards ?? [])?.id ?? '',
    [selectedUnit?.boards],
  )
  const [selectedBoardId, setSelectedBoardId] = useState(defaultBoardId)
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})
  const [detailsAccommodationId, setDetailsAccommodationId] = useState('')
  const [galleryIndexByAccommodation, setGalleryIndexByAccommodation] = useState<Record<string, number>>({})
  const detailsAccommodation = useMemo(
    () => accommodations.find((item) => item.id === detailsAccommodationId) ?? null,
    [accommodations, detailsAccommodationId],
  )
  const baseAccommodationPrice = useMemo(
    () => getBackendDefault(accommodations)?.price ?? 0,
    [accommodations],
  )
  const baseUnitPrice = useMemo(
    () => getBackendDefault(selectedAccommodation?.units ?? [])?.price ?? 0,
    [selectedAccommodation?.units],
  )
  const baseBoardPrice = useMemo(
    () => getBackendDefault(selectedUnit?.boards ?? [])?.price ?? 0,
    [selectedUnit?.boards],
  )

  useEffect(() => {
    const matchingAccommodation = selectedUnitProductId
      ? accommodations.find((accommodation) => accommodation.units.some((unit) => unit.id === selectedUnitProductId))
      : undefined
    if (matchingAccommodation) {
      setSelectedAccommodationId(matchingAccommodation.id)
    } else if (defaultAccommodationId) {
      setSelectedAccommodationId(defaultAccommodationId)
    }
  }, [accommodations, defaultAccommodationId, selectedUnitProductId])

  useEffect(() => {
    if (!selectedAccommodation) {
      return
    }
    const nextUnit = getPreferredSelection(selectedAccommodation.units, [selectedUnitProductId, selectedUnitId, defaultUnitId])
    const nextBoard = getPreferredSelection(nextUnit?.boards ?? [], [selectedBoardProductId, selectedBoardId, defaultBoardId])
    setSelectedUnitId(nextUnit?.id ?? '')
    setSelectedBoardId(nextBoard?.id ?? '')
  }, [defaultBoardId, defaultUnitId, selectedAccommodation, selectedBoardId, selectedBoardProductId, selectedUnitId, selectedUnitProductId])

  useEffect(() => {
    const unitProduct = payload.products.find((product) => product.group === 0 && product.id === selectedUnit?.id)
    setSelectedValues(
      Object.fromEntries((unitProduct?.options ?? []).map((option) => [option.id, option.value])),
    )
  }, [payload.products, selectedUnit?.id])

  function getAccommodationDefaults(accommodationId: string) {
    const accommodation = accommodations.find((item) => item.id === accommodationId)
    if (!accommodation) {
      return { unitId: '', boardId: '' }
    }

    const unit = getBackendDefault(accommodation.units)
    const board = getBackendDefault(unit?.boards ?? [])

    return {
      unitId: unit?.id ?? '',
      boardId: board?.id ?? '',
    }
  }

  async function previewAccommodation(nextUnitId: string, nextBoardId: string) {
    const unit =
      selectedAccommodation?.units.find((item) => item.id === nextUnitId) ??
      accommodations.flatMap((item) => item.units).find((item) => item.id === nextUnitId)

    if (!unit || !nextBoardId) {
      return
    }

    await actions.previewAccommodation({
      unitId: nextUnitId,
      boardId: nextBoardId,
      selectedValues: {},
      availableOptions: unit.options,
    })
  }

  if (accommodationsLoading) {
    return (
      <StepShell eyebrow={`Step ${currentStepIndex + 1}`} title="Choose your room">
        <PanelLoadingState detail="The room options are loading in this panel." title="Loading room options…" />
      </StepShell>
    )
  }

  if (!accommodations.length) {
    return (
      <StepShell eyebrow={`Step ${currentStepIndex + 1}`} title="Choose your room">
        <div className="info-banner">No accommodation options are available for the selected trip details.</div>
        <StepFooter canContinue={false} onBack={actions.goBack} />
      </StepShell>
    )
  }

  return (
    <StepShell
      eyebrow={`Step ${currentStepIndex + 1}`}
      title="Choose your room"
      description="Pick your hotel, room type, and board basis. Mandatory extras are added automatically."
    >
      <div className="step-section">
        <h3 className="section-heading">Hotel</h3>
        <div className="accommodation-list">
          {accommodations.map((accommodation) => (
            (() => {
              const gallery = [accommodation.imageUrl, ...accommodation.gallery].filter(Boolean).filter((value, index, items) => items.indexOf(value) === index)
              const currentGalleryIndex = gallery.length ? Math.min(galleryIndexByAccommodation[accommodation.id] ?? 0, gallery.length - 1) : 0
              const currentImage = gallery[currentGalleryIndex] ?? ''
              const priceDelta = accommodation.price - baseAccommodationPrice

              return (
                <article
                  className={`accommodation-list-item${selectedAccommodation?.id === accommodation.id ? ' is-selected' : ''}`}
                  key={accommodation.id}
                >
                  <div
                    className="accommodation-select"
                    onClick={() => {
                      setSelectedAccommodationId(accommodation.id)
                      const { unitId: nextUnitId, boardId: nextBoardId } = getAccommodationDefaults(accommodation.id)
                      setSelectedUnitId(nextUnitId)
                      setSelectedBoardId(nextBoardId)
                      setSelectedValues({})
                      void previewAccommodation(nextUnitId, nextBoardId)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedAccommodationId(accommodation.id)
                        const { unitId: nextUnitId, boardId: nextBoardId } = getAccommodationDefaults(accommodation.id)
                        setSelectedUnitId(nextUnitId)
                        setSelectedBoardId(nextBoardId)
                        setSelectedValues({})
                        void previewAccommodation(nextUnitId, nextBoardId)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="accommodation-image-wrap">
                      {currentImage ? (
                        <img alt={accommodation.name} className="accommodation-image" src={currentImage} />
                      ) : (
                        <div className="accommodation-image accommodation-image-fallback" />
                      )}
                      {gallery.length > 1 ? (
                        <>
                          <button
                            aria-label={`Previous image for ${accommodation.name}`}
                            className="gallery-nav gallery-nav-prev"
                            onClick={(event) => {
                              event.stopPropagation()
                              setGalleryIndexByAccommodation((value) => ({
                                ...value,
                                [accommodation.id]: currentGalleryIndex === 0 ? gallery.length - 1 : currentGalleryIndex - 1,
                              }))
                            }}
                            type="button"
                          >
                            ‹
                          </button>
                          <button
                            aria-label={`Next image for ${accommodation.name}`}
                            className="gallery-nav gallery-nav-next"
                            onClick={(event) => {
                              event.stopPropagation()
                              setGalleryIndexByAccommodation((value) => ({
                                ...value,
                                [accommodation.id]: currentGalleryIndex === gallery.length - 1 ? 0 : currentGalleryIndex + 1,
                              }))
                            }}
                            type="button"
                          >
                            ›
                          </button>
                          <div className="gallery-dots">
                            {gallery.map((image, index) => (
                              <span
                                className={`gallery-dot${index === currentGalleryIndex ? ' is-active' : ''}`}
                                key={`${accommodation.id}-${image}-${index}`}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div className="accommodation-copy">
                      <div className="accommodation-copy-top">
                        <div>
                          <strong>{accommodation.name}</strong>
                          {accommodation.stars > 0 ? <div className="accommodation-stars">{renderStars(accommodation.stars)}</div> : null}
                        </div>
                        <div className="accommodation-price-block">
                          {accommodation.id === defaultAccommodationId ? (
                            <span className="accommodation-price-delta is-included">Included</span>
                          ) : (
                            <span className="accommodation-price-delta">{formatPriceDelta(accommodation.price, baseAccommodationPrice)}</span>
                          )}
                          <span className="option-price-note">{formatPrice(accommodation.price)} total</span>
                        </div>
                      </div>
                      <span className="muted">{accommodation.subtitle || accommodation.address}</span>
                      {accommodation.description ? (
                        <p className="accommodation-description">{accommodation.description.slice(0, 140)}{accommodation.description.length > 140 ? '…' : ''}</p>
                      ) : null}
                      {accommodation.facilities.length ? (
                        <div className="accommodation-facilities">
                          {accommodation.facilities.slice(0, 4).map((facility) => (
                            <span className="accommodation-facility" key={facility}>
                              <span className="accommodation-facility-icon" aria-hidden="true">
                                <FacilityIcon facility={facility} />
                              </span>
                              {facility}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="accommodation-actions">
                        <button className="link-button" onClick={() => setDetailsAccommodationId(accommodation.id)} type="button">
                          View accommodation details
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })()
          ))}
        </div>
      </div>

      {selectedAccommodation ? (
        <div className="step-section">
          <h3 className="section-heading">Room</h3>
          <div className="accommodation-list">
            {selectedAccommodation.units.map((unit) => (
              <OptionCard
                className="option-media-card option-media-card-compact"
                key={unit.id}
                selected={selectedUnit?.id === unit.id}
                onClick={() => {
                  const nextBoardId = getBackendDefault(unit.boards)?.id ?? ''
                  setSelectedUnitId(unit.id)
                  setSelectedBoardId(nextBoardId)
                  setSelectedValues({})
                  void actions.previewAccommodation({
                    unitId: unit.id,
                    boardId: nextBoardId,
                    selectedValues: {},
                    availableOptions: unit.options,
                  })
                }}
              >
                <div className="option-media unit-card-media">
                  {unit.imageUrl ? (
                    <img alt={unit.name} className="option-media-image unit-card-image" src={unit.imageUrl} />
                  ) : (
                    <div className="option-media-fallback unit-card-image unit-card-image-fallback" />
                  )}
                </div>
                <div className="option-card-copy">
                  <div className="option-card-top">
                    <div>
                      <strong>{unit.name}</strong>
                      <p className="muted">{unit.subtitle || unit.description}</p>
                    </div>
                    <div className="option-price-block">
                      <span className={`option-price-delta${unit.id === defaultUnitId ? ' is-included' : ''}`}>
                        {unit.id === defaultUnitId ? 'Included' : formatPriceDelta(unit.price, baseUnitPrice)}
                      </span>
                      <span className="option-price-note">{formatPrice(unit.price)} total</span>
                    </div>
                  </div>
                  {typeof unit.availableAmount === 'number' ? (
                    <span className="unit-availability">
                      {unit.availableAmount > 0 ? `${unit.availableAmount} left` : 'Unavailable'}
                    </span>
                  ) : null}
                  {unit.facilities.length ? (
                    <div className="unit-facilities">
                      {unit.facilities.slice(0, 6).map((facility) => (
                        <span className="unit-facility" key={facility}>
                          <span className="unit-facility-icon" aria-hidden="true">
                            <FacilityIcon facility={facility} />
                          </span>
                          <span>{facility}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </OptionCard>
            ))}
          </div>
        </div>
      ) : null}

      {selectedUnit ? (
        <div className="step-section">
          <h3 className="section-heading">Board basis</h3>
          <div className="card-grid">
            {selectedUnit.boards.map((board) => (
              <OptionCard
                className="option-detail-card"
                key={board.id}
                selected={selectedBoardId === board.id}
                onClick={() => {
                  setSelectedBoardId(board.id)
                  if (!selectedUnit) {
                    return
                  }
                  void actions.previewAccommodation({
                    unitId: selectedUnit.id,
                    boardId: board.id,
                    selectedValues: {},
                    availableOptions: selectedUnit.options,
                  })
                }}
              >
                <div className="option-card-top">
                  <div>
                    <strong>{board.name}</strong>
                    {board.description ? <p className="muted">{board.description}</p> : null}
                  </div>
                  <div className="option-price-block">
                    <span className={`option-price-delta${board.id === defaultBoardId ? ' is-included' : ''}`}>
                      {board.id === defaultBoardId ? 'Included' : formatPriceDelta(board.price, baseBoardPrice)}
                    </span>
                    <span className="option-price-note">{formatPrice(board.price)} total</span>
                  </div>
                </div>
              </OptionCard>
            ))}
          </div>
        </div>
      ) : null}

      {selectedUnit?.options.length ? (
        <div className="step-section">
          <h3 className="section-heading">Room extras</h3>
          <div className="field-grid">
            {selectedUnit.options.map((option) => (
              <label className="field" key={option.id}>
                <span>
                  {option.name}
                  {option.mandatory ? ' · required' : ''}
                </span>
                {option.kind === 'toggle' ? (
                  <input
                    checked={option.mandatory || selectedValues[option.id] === 'true'}
                    disabled={option.mandatory}
                    onChange={(event) =>
                      setSelectedValues((value) => ({ ...value, [option.id]: event.target.checked ? 'true' : '' }))
                    }
                    type="checkbox"
                  />
                ) : option.kind === 'choice' ? (
                  <select
                    value={selectedValues[option.id] ?? option.choices?.[0]?.id ?? ''}
                    onChange={(event) => setSelectedValues((value) => ({ ...value, [option.id]: event.target.value }))}
                  >
                    {(option.choices ?? []).map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.name} · {formatPrice(choice.price)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedValues[option.id] ?? String(option.rangeMin ?? 1)}
                    onChange={(event) => setSelectedValues((value) => ({ ...value, [option.id]: event.target.value }))}
                  >
                    {Array.from(
                      { length: (option.rangeMax ?? option.rangeMin ?? 1) - (option.rangeMin ?? 1) + 1 },
                      (_, index) => (option.rangeMin ?? 1) + index,
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <StepFooter
        canContinue={Boolean(selectedUnit && selectedBoardId)}
        continueLabel={getNextStepLabel(steps, currentStepIndex)}
        onBack={actions.goBack}
        onContinue={() => {
          if (!selectedUnit || !selectedBoardId) return
          void actions.confirmAccommodation({
            unitId: selectedUnit.id,
            boardId: selectedBoardId,
            selectedValues,
            availableOptions: selectedUnit.options,
          })
        }}
      />

      {detailsAccommodation ? (
        <div
          aria-modal="true"
          className="hero-modal-backdrop"
          onClick={() => setDetailsAccommodationId('')}
          role="dialog"
        >
          <div className="hero-modal accommodation-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hero-modal-header">
              <h2>{detailsAccommodation.name}</h2>
              <button aria-label="Close modal" className="modal-close-button" onClick={() => setDetailsAccommodationId('')} type="button">
                <span aria-hidden="true">×</span>
              </button>
            </div>
            {detailsAccommodation.imageUrl ? (
              <img alt={detailsAccommodation.name} className="accommodation-modal-image" src={detailsAccommodation.imageUrl} />
            ) : null}
            <div className="accommodation-modal-copy">
              {detailsAccommodation.stars > 0 ? (
                <div className="accommodation-stars">{renderStars(detailsAccommodation.stars)}</div>
              ) : null}
              {detailsAccommodation.address ? <p>{detailsAccommodation.address}</p> : null}
              {detailsAccommodation.description ? <p>{detailsAccommodation.description}</p> : null}
              {detailsAccommodation.facilities.length ? (
                <div>
                  <h3>Facilities</h3>
                  <ul className="hero-modal-list">
                    {detailsAccommodation.facilities.map((facility) => (
                      <li key={facility}>{facility}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detailsAccommodation.gallery.length ? (
                <div>
                  <h3>More photos</h3>
                  <div className="accommodation-modal-gallery">
                    {detailsAccommodation.gallery.slice(0, 4).map((imageUrl) => (
                      <img alt={detailsAccommodation.name} key={imageUrl} src={imageUrl} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </StepShell>
  )
}
