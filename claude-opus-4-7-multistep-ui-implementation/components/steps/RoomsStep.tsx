'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { Accommodation, AccommodationUnit } from '@/lib/booking/types'
import { formatMoney, formatDelta } from '@/lib/booking/format'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { FacilityIcon } from '@/components/ui/FacilityIcon'
import { StepFooter } from './StepFooter'

export function RoomsStep() {
  const { state, actions } = useBooking()
  const [detailsFor, setDetailsFor] = useState<Accommodation | null>(null)

  useEffect(() => {
    if (!state.accommodations && !state.async.accommodationsLoading) {
      actions.loadAccommodations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accs = state.accommodations ?? []
  const selectedAccommodation = useMemo(() => {
    const accProducts = (state.payload.products ?? []).filter((p) => p.id.startsWith('A:'))
    return accs.find((a) => a.units?.some((u) => accProducts.some((p) => p.id === u.id))) ?? accs[0]
  }, [accs, state.payload.products])

  const baselineAcc = accs.find((a) => a.units?.some((u) => u.selected)) ?? accs[0]

  function hotelPrice(a: Accommodation): number {
    const unit = a.units?.find((u) => u.selected) ?? a.units?.[0]
    const board = unit?.boards?.find((b) => b.selected) ?? unit?.boards?.[0]
    const up = unit?.price ?? 0
    const bp = board?.price ?? 0
    return a.price ?? up + bp
  }
  const baselinePrice = baselineAcc ? hotelPrice(baselineAcc) : 0

  function selectHotel(a: Accommodation) {
    const unit = a.units?.find((u) => u.selected) ?? a.units?.[0]
    const board = unit?.boards?.find((b) => b.selected) ?? unit?.boards?.[0]
    if (unit) actions.selectAccommodation(unit.id, board?.id)
  }

  const currentUnitId = (state.payload.products ?? []).find(
    (p) => p.id.startsWith('A:') && selectedAccommodation?.units?.some((u) => u.id === p.id),
  )?.id
  const currentUnit = selectedAccommodation?.units?.find((u) => u.id === currentUnitId) ?? selectedAccommodation?.units?.[0]
  const currentBoardId = (state.payload.products ?? []).find(
    (p) =>
      p.id.startsWith('A:') &&
      currentUnit?.boards?.some((b) => b.id === p.id) &&
      p.id !== currentUnit?.id,
  )?.id

  const unitBaseline = selectedAccommodation?.units?.find((u) => u.selected) ?? selectedAccommodation?.units?.[0]
  const unitBaselinePrice = (unitBaseline?.price ?? 0) + (unitBaseline?.boards?.find((b) => b.selected)?.price ?? unitBaseline?.boards?.[0]?.price ?? 0)

  const boardBaseline = currentUnit?.boards?.find((b) => b.selected) ?? currentUnit?.boards?.[0]

  const canContinue =
    !!currentUnitId &&
    !!state.receipt &&
    (state.receipt.errors?.length ?? 0) === 0 &&
    !state.async.receiptLoading &&
    !state.async.accommodationsLoading

  return (
    <div className="step-panel">
      <header className="step-panel-head">
        <h1 className="step-heading">Choose your room</h1>
      </header>

      {state.async.accommodationsLoading ? (
        <div className="panel-loading">
          <Spinner size={32} label="Loading rooms…" />
        </div>
      ) : (
        <>
          <section className="rooms-section">
            <h2 className="rooms-section-title">Hotels</h2>
            <ul className="option-list">
              {accs.map((a) => {
                const price = hotelPrice(a)
                const delta = price - baselinePrice
                const isActive = a.id === selectedAccommodation?.id
                const isBaseline = a.id === baselineAcc?.id
                return (
                  <li
                    key={a.id}
                    className={'option-card' + (isActive ? ' option-card--active' : '')}
                  >
                    <button
                      type="button"
                      className="option-card-image"
                      onClick={() => selectHotel(a)}
                      aria-label={`Select ${a.name}`}
                    >
                      {a.image?.url ? <img src={a.image.url} alt="" /> : null}
                    </button>
                    <div className="option-card-body">
                      <div className="option-card-content">
                        <h3 className="option-card-name">{a.name}</h3>
                        {a.starRating ? (
                          <div className="option-card-stars" aria-label={`${a.starRating} stars`}>
                            {'★'.repeat(a.starRating)}
                          </div>
                        ) : null}
                        {a.subTitle ? <p className="option-card-subtitle">{a.subTitle}</p> : null}
                        {a.venue?.formattedAddress ? (
                          <p className="option-card-address">{a.venue.formattedAddress}</p>
                        ) : null}
                        <button
                          type="button"
                          className="link-button btn-sm"
                          onClick={() => setDetailsFor(a)}
                        >
                          Hotel details
                        </button>
                      </div>
                      <div className="option-card-price">
                        <span className="option-card-delta">
                          {isBaseline ? 'Included' : formatDelta(delta)}
                        </span>
                        <span className="option-card-total">{formatMoney(price)}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {selectedAccommodation && (selectedAccommodation.units?.length ?? 0) > 1 ? (
            <section className="rooms-section">
              <h2 className="rooms-section-title">Rooms at {selectedAccommodation.name}</h2>
              <ul className="option-list">
                {selectedAccommodation.units!.map((u) => {
                  const isActive = u.id === currentUnit?.id
                  const isBaseline = u.id === unitBaseline?.id
                  const board = u.boards?.find((b) => b.selected) ?? u.boards?.[0]
                  const combinedPrice = (u.price ?? 0) + (board?.price ?? 0)
                  const delta = combinedPrice - unitBaselinePrice
                  return (
                    <li
                      key={u.id}
                      className={'option-card' + (isActive ? ' option-card--active' : '')}
                    >
                      <button
                        type="button"
                        className="option-card-image"
                        onClick={() => actions.selectAccommodation(u.id, board?.id)}
                        aria-label={`Select ${u.name}`}
                      >
                        {u.image?.url ? <img src={u.image.url} alt="" /> : null}
                      </button>
                      <div className="option-card-body">
                        <div className="option-card-content">
                          <h3 className="option-card-name">{u.name}</h3>
                          {u.subTitle ? <p className="option-card-subtitle">{u.subTitle}</p> : null}
                        </div>
                        <div className="option-card-price">
                          <span className="option-card-delta">
                            {isBaseline ? 'Included' : formatDelta(delta)}
                          </span>
                          <span className="option-card-total">{formatMoney(combinedPrice)}</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {currentUnit && (currentUnit.boards?.length ?? 0) > 1 ? (
            <section className="rooms-section">
              <h2 className="rooms-section-title">Board</h2>
              <ul className="option-list option-list--compact">
                {currentUnit.boards!.map((b) => {
                  const isActive = b.id === (currentBoardId ?? boardBaseline?.id)
                  const isBaseline = b.id === boardBaseline?.id
                  const delta = (b.price ?? 0) - (boardBaseline?.price ?? 0)
                  return (
                    <li
                      key={b.id}
                      className={'option-card option-card--compact' + (isActive ? ' option-card--active' : '')}
                    >
                      <button
                        type="button"
                        className="option-card-body"
                        onClick={() => actions.selectAccommodation(currentUnit.id, b.id)}
                      >
                        <div className="option-card-content">
                          <h3 className="option-card-name">{b.name}</h3>
                          {b.description ? <p className="option-card-subtitle">{b.description}</p> : null}
                        </div>
                        <div className="option-card-price">
                          <span className="option-card-delta">
                            {isBaseline ? 'Included' : formatDelta(delta)}
                          </span>
                          <span className="option-card-total">{formatMoney(b.price ?? 0)}</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <StepFooter
        onContinue={() => {
          if (canContinue) actions.goToStep(state.currentStep + 1)
        }}
        continueDisabled={!canContinue}
      />

      <HotelDetailsModal accommodation={detailsFor} onClose={() => setDetailsFor(null)} />
    </div>
  )
}

function HotelDetailsModal({
  accommodation,
  onClose,
}: {
  accommodation: Accommodation | null
  onClose: () => void
}) {
  const [imgIdx, setImgIdx] = useState(0)
  if (!accommodation) return null
  const images = accommodation.imagePreviews?.length
    ? accommodation.imagePreviews
    : accommodation.image
      ? [accommodation.image]
      : []
  const img = images[imgIdx]
  return (
    <Modal open={!!accommodation} onClose={onClose} wide title={accommodation.name}>
      <div className="modal-title">
        {accommodation.starRating ? (
          <div className="modal-stars">{'★'.repeat(accommodation.starRating)}</div>
        ) : null}
        {accommodation.venue?.formattedAddress ? (
          <div className="modal-address">{accommodation.venue.formattedAddress}</div>
        ) : null}
      </div>
      {images.length ? (
        <div className="modal-gallery">
          {img?.url ? <img className="modal-gallery-img" src={img.url} alt="" /> : null}
          {images.length > 1 ? (
            <div className="modal-gallery-controls">
              <button
                type="button"
                className="modal-gallery-btn"
                onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                aria-label="Previous image"
              >
                ‹
              </button>
              <span className="modal-gallery-count">
                {imgIdx + 1} / {images.length}
              </span>
              <button
                type="button"
                className="modal-gallery-btn"
                onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                aria-label="Next image"
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {accommodation.description ? (
        <div className="modal-description">{accommodation.description}</div>
      ) : null}
      {accommodation.facilities?.length ? (
        <div className="modal-facilities">
          {accommodation.facilities.map((f, i) => (
            <span className="facility-chip" key={i}>
              <FacilityIcon icon={f.icon} />
              {f.name}
            </span>
          ))}
        </div>
      ) : null}
    </Modal>
  )
}
