'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Accessibility,
  BadgeHelp,
  Bath,
  BedDouble,
  Bike,
  CarFront,
  Coffee,
  CookingPot,
  CupSoda,
  Dumbbell,
  Flame,
  GlassWater,
  Hotel,
  Mountain,
  ParkingCircle,
  Refrigerator,
  Shield,
  ShowerHead,
  Snowflake,
  Soup,
  Tv,
  UserRoundCog,
  Waves,
  Wifi,
  Wind,
} from 'lucide-react'
import { useBooking } from '@/lib/booking/context'
import type { AccommodationFacility } from '@/lib/booking/types'
import { getBackendDefault, getPreferredSelection } from '@/lib/booking/selection'
import { formatPrice, formatPriceDelta } from '@/lib/utils/price'
import { getNextStepLabel, OptionCard, PanelLoadingState, StepFooter, StepShell } from '@/components/steps/shared'

function renderStars(count: number) {
  return Array.from({ length: count }, (_, index) => <span key={`star-${index}`}>★</span>)
}

function FacilityIcon({ facility }: { facility: AccommodationFacility }) {
  const value = facility.name.toLowerCase()
  const icon = facility.icon ?? ''

  const IconComponent =
    icon === 'wifi' || value.includes('wifi') || value.includes('wi-fi') || value.includes('internet')
      ? Wifi
      : icon === 'restaurant' || icon === 'room-service'
        ? Soup
        : icon === 'bar'
          ? CupSoda
          : icon === 'spa' || icon === 'hot-bath' || icon === 'sauna'
            ? Waves
            : icon === 'gym'
              ? Dumbbell
              : icon === 'lift'
                ? Hotel
                : icon === 'pool' || icon === 'playground'
                  ? Waves
                  : icon === 'parking' || icon === 'bike-parking'
                    ? ParkingCircle
                    : icon === 'bike-rental'
                      ? Bike
                      : icon === 'facilities' || icon === 'wheelchair'
                        ? Accessibility
                        : icon === 'front-desk' || icon === 'luggage'
                          ? UserRoundCog
                          : icon === 'smoking-no'
                            ? Flame
                            : icon === 'air-conditioning' || value.includes('air') || value.includes('condition')
                              ? Wind
                              : icon === 'pets'
                                ? BadgeHelp
                                : value.includes('bed')
                                  ? BedDouble
                                  : value.includes('bath') || value.includes('shower') || icon === 'private-bathroom'
                                    ? Bath
                                    : value.includes('tv') || value.includes('television')
                                      ? Tv
                                      : value.includes('balcony') || value.includes('terrace')
                                        ? Mountain
                                        : value.includes('view')
                                          ? Mountain
                                          : value.includes('kitchen')
                                            ? CookingPot
                                            : icon === 'safebox'
                                              ? Shield
                                              : icon === 'toiletries'
                                                ? GlassWater
                                                : icon === 'tea-facilities' || icon === 'coffee-machine'
                                                  ? Coffee
                                                  : icon === 'minifridge'
                                                    ? Refrigerator
                                                    : icon === 'shower'
                                                      ? ShowerHead
                                                      : icon === 'tv'
                                                        ? Tv
                                                        : icon === 'restaurant'
                                                          ? Soup
                                                          : icon === 'parking'
                                                            ? CarFront
                                                            : Snowflake

  return <IconComponent aria-hidden={true} className="facility-svg" strokeWidth={1.8} />
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
  const detailsGallery = useMemo(
    () =>
      detailsAccommodation
        ? [detailsAccommodation.imageUrl, ...detailsAccommodation.gallery]
            .filter(Boolean)
            .filter((value, index, items) => items.indexOf(value) === index)
        : [],
    [detailsAccommodation],
  )
  const detailsGalleryIndex = detailsAccommodation
    ? Math.min(galleryIndexByAccommodation[detailsAccommodation.id] ?? 0, Math.max(detailsGallery.length - 1, 0))
    : 0
  const detailsGalleryImage = detailsGallery[detailsGalleryIndex] ?? ''
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
      <StepShell eyebrow={`Step ${currentStepIndex + 1}`} title="Rooms">
        <PanelLoadingState detail="The room options are loading in this panel." title="Loading room options…" />
      </StepShell>
    )
  }

  if (!accommodations.length) {
    return (
      <StepShell eyebrow={`Step ${currentStepIndex + 1}`} title="Rooms">
        <div className="info-banner">No accommodation options are available for the selected trip details.</div>
        <StepFooter canContinue={false} onBack={actions.goBack} />
      </StepShell>
    )
  }

  return (
    <StepShell
      eyebrow={`Step ${currentStepIndex + 1}`}
      title="Rooms"
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
            {detailsGalleryImage ? (
              <div className="details-modal-gallery-shell">
                <img alt={detailsAccommodation.name} className="accommodation-modal-image" src={detailsGalleryImage} />
                {detailsGallery.length > 1 ? (
                  <>
                    <button
                      aria-label={`Previous image for ${detailsAccommodation.name}`}
                      className="gallery-nav gallery-nav-prev"
                      onClick={() =>
                        setGalleryIndexByAccommodation((value) => ({
                          ...value,
                          [detailsAccommodation.id]: detailsGalleryIndex === 0 ? detailsGallery.length - 1 : detailsGalleryIndex - 1,
                        }))
                      }
                      type="button"
                    >
                      ‹
                    </button>
                    <button
                      aria-label={`Next image for ${detailsAccommodation.name}`}
                      className="gallery-nav gallery-nav-next"
                      onClick={() =>
                        setGalleryIndexByAccommodation((value) => ({
                          ...value,
                          [detailsAccommodation.id]: detailsGalleryIndex === detailsGallery.length - 1 ? 0 : detailsGalleryIndex + 1,
                        }))
                      }
                      type="button"
                    >
                      ›
                    </button>
                    <div className="gallery-dots details-modal-gallery-dots">
                      {detailsGallery.map((image, index) => (
                        <button
                          aria-label={`Show image ${index + 1} for ${detailsAccommodation.name}`}
                          className={`gallery-dot${index === detailsGalleryIndex ? ' is-active' : ''}`}
                          key={`${detailsAccommodation.id}-${image}-${index}`}
                          onClick={() =>
                            setGalleryIndexByAccommodation((value) => ({
                              ...value,
                              [detailsAccommodation.id]: index,
                            }))
                          }
                          type="button"
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
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
                  <div className="accommodation-facilities">
                    {detailsAccommodation.facilities.map((facility) => (
                      <span className="accommodation-facility" key={`${facility.icon ?? 'unknown'}-${facility.name}`}>
                        <span className="accommodation-facility-icon" aria-hidden="true">
                          <FacilityIcon facility={facility} />
                        </span>
                        {facility.name}
                      </span>
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
