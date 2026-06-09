'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useBookingActions, useBookingState } from '@/lib/store'
import { SkeletonCards } from '../Loading'
import { Modal } from '../Modal'
import { GalleryCarousel } from '../Gallery'
import { PriceBlock } from '../PriceBlock'
import { StepFooter } from '../StepFooter'
import { FacilityIcon } from '../icons'
import { getSelectedProductId } from '@/lib/payload'
import type { Accommodation, AccommodationUnit } from '@/lib/types'

interface Resolved {
  hotel: Accommodation | null
  unit: AccommodationUnit | null
  boardId: string | null
}

export function RoomsStep() {
  const state = useBookingState()
  const actions = useBookingActions()
  const { accommodations, accommodationsLoading, payload, offerMeta } = state
  const currency = offerMeta?.currency ?? 'GBP'
  const [detailsHotel, setDetailsHotel] = useState<Accommodation | null>(null)

  useEffect(() => {
    actions.ensureAccommodations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hotels = accommodations?.accommodations ?? []

  // Selection resolution: payload product first, then backend-selected, then first.
  const resolved: Resolved = useMemo(() => {
    const productId = getSelectedProductId(payload.products, 'A:')
    if (productId) {
      for (const hotel of hotels) {
        for (const unit of hotel.units) {
          if (unit.id === productId || unit.boards.some((b) => b.id === productId)) {
            return { hotel, unit, boardId: productId }
          }
        }
      }
    }
    const hotel = hotels.find((h) => h.selected) ?? hotels[0] ?? null
    const unit = hotel ? hotel.units.find((u) => u.selected) ?? hotel.units[0] ?? null : null
    const board = unit ? unit.boards.find((b) => b.selected) ?? unit.boards[0] ?? null : null
    return { hotel, unit, boardId: board?.id ?? unit?.id ?? null }
  }, [hotels, payload.products])

  // The backend-selected default hotel is the pricing baseline.
  const baselineHotel = hotels.find((h) => h.selected) ?? null

  function productIdForUnit(unit: AccommodationUnit): string {
    const board = unit.boards.find((b) => b.selected) ?? unit.boards[0]
    return board?.id ?? unit.id
  }

  function chooseHotel(hotel: Accommodation) {
    if (hotel === resolved.hotel) return
    const unit = hotel.units.find((u) => u.selected) ?? hotel.units[0]
    if (!unit) return
    actions.selectAccommodationProduct(productIdForUnit(unit))
  }

  function chooseUnit(unit: AccommodationUnit) {
    if (unit === resolved.unit) return
    actions.selectAccommodationProduct(productIdForUnit(unit))
  }

  if (accommodationsLoading || !accommodations) {
    return (
      <div className="step-panel">
        <h1 className="step-heading">Choose your room</h1>
        <SkeletonCards count={3} />
      </div>
    )
  }

  return (
    <div className="step-panel">
      <h1 className="step-heading">Choose your room</h1>

      {!hotels.length ? (
        <p className="empty-note">There are no alternative accommodation choices for this stay.</p>
      ) : (
        <>
          <div className="option-list">
            {hotels.map((hotel) => {
              const isActive = hotel === resolved.hotel
              const isBaseline = baselineHotel != null && hotel === baselineHotel
              const delta =
                baselineHotel?.price != null && hotel.price != null ? hotel.price - baselineHotel.price : null
              return (
                <div
                  key={hotel.id}
                  className={`option-card hotel-card${isActive ? ' is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => chooseHotel(hotel)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') chooseHotel(hotel)
                  }}
                >
                  <div className="option-media">
                    <GalleryCarousel
                      images={[hotel.image?.url ?? null, ...hotel.imagePreviews.map((p) => p.url)].slice(0, 6)}
                      alt={hotel.name ?? 'Hotel'}
                    />
                  </div>
                  <div className="option-content">
                    <h3 className="option-title">{hotel.name}</h3>
                    {hotel.starRating ? <p className="option-meta">{hotel.starRating}-star</p> : null}
                    {hotel.venue?.city ? <p className="option-meta">{hotel.venue.city}</p> : null}
                    <button
                      type="button"
                      className="text-link"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetailsHotel(hotel)
                      }}
                    >
                      Hotel details
                    </button>
                  </div>
                  <PriceBlock isBaseline={isBaseline} delta={delta} total={hotel.price} currency={currency} />
                </div>
              )
            })}
          </div>

          {resolved.hotel && resolved.hotel.units.length > 0 ? (
            <RoomChoices
              hotel={resolved.hotel}
              activeUnit={resolved.unit}
              activeBoardId={resolved.boardId}
              currency={currency}
              onChooseUnit={chooseUnit}
              onChooseBoard={(id) => actions.selectAccommodationProduct(id)}
            />
          ) : null}
        </>
      )}

      {detailsHotel ? (
        <Modal title={detailsHotel.name ?? 'Hotel details'} onClose={() => setDetailsHotel(null)} wide>
          <GalleryCarousel
            images={[detailsHotel.image?.url ?? null, ...detailsHotel.imagePreviews.map((p) => p.url)]}
            alt={detailsHotel.name ?? 'Hotel'}
          />
          {detailsHotel.venue?.formattedAddress ? (
            <p className="modal-meta">{detailsHotel.venue.formattedAddress}</p>
          ) : null}
          {detailsHotel.description ? <p className="modal-text">{detailsHotel.description}</p> : null}
          {detailsHotel.facilities.length ? (
            <>
              <h4 className="modal-subheading">Facilities</h4>
              <div className="facility-chips">
                {detailsHotel.facilities.map((f, i) => (
                  <span key={i} className="facility-chip">
                    <FacilityIcon token={f.icon} />
                    {f.name}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </Modal>
      ) : null}

      <StepFooter continueDisabled={state.receiptLoading} />
    </div>
  )
}

function RoomChoices({
  hotel,
  activeUnit,
  activeBoardId,
  currency,
  onChooseUnit,
  onChooseBoard,
}: {
  hotel: Accommodation
  activeUnit: AccommodationUnit | null
  activeBoardId: string | null
  currency: string
  onChooseUnit: (unit: AccommodationUnit) => void
  onChooseBoard: (boardId: string) => void
}) {
  // Backend-selected unit is the room baseline.
  const baselineUnit = hotel.units.find((u) => u.selected) ?? null
  // Board choices come from the currently selected room only.
  const boards = activeUnit?.boards ?? []
  const baselineBoard = boards.find((b) => b.selected) ?? null

  return (
    <>
      {hotel.units.length > 1 ? (
        <section className="room-section">
          <h2 className="section-heading">Room type</h2>
          <div className="option-list">
            {hotel.units.map((unit) => {
              const isActive = unit === activeUnit
              const isBaseline = baselineUnit != null && unit === baselineUnit
              const delta =
                baselineUnit?.price != null && unit.price != null ? unit.price - baselineUnit.price : null
              return (
                <div
                  key={unit.id}
                  className={`option-card room-card${isActive ? ' is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onChooseUnit(unit)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onChooseUnit(unit)
                  }}
                >
                  {unit.image?.url || unit.images.length ? (
                    <div className="option-media">
                      <GalleryCarousel
                        images={[unit.image?.url ?? null, ...unit.images.map((im) => im.url)].slice(0, 5)}
                        alt={unit.name ?? 'Room'}
                      />
                    </div>
                  ) : null}
                  <div className="option-content">
                    <h3 className="option-title">{unit.name}</h3>
                    {unit.description ? <p className="option-desc">{unit.description}</p> : null}
                  </div>
                  <PriceBlock isBaseline={isBaseline} delta={delta} total={unit.price} currency={currency} />
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {boards.length > 0 ? (
        <section className="room-section">
          <h2 className="section-heading">Meal plan</h2>
          <div className="board-list">
            {boards.map((board) => {
              const isActive = board.id === activeBoardId
              const isBaseline = baselineBoard != null && board === baselineBoard
              const delta =
                baselineBoard?.price != null && board.price != null ? board.price - baselineBoard.price : null
              return (
                <button
                  key={board.id}
                  type="button"
                  className={`board-option${isActive ? ' is-selected' : ''}`}
                  onClick={() => onChooseBoard(board.id)}
                >
                  <span className="board-option-body">
                    <span className="board-option-name">{board.name}</span>
                    {board.description ? <span className="board-option-desc">{board.description}</span> : null}
                  </span>
                  <PriceBlock isBaseline={isBaseline} delta={delta} total={board.price} currency={currency} />
                </button>
              )
            })}
          </div>
        </section>
      ) : null}
    </>
  )
}
