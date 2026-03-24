'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { AccommodationOption, UnitOption, BoardOption } from '@/lib/booking/types'

/* ── Helpers ── */

function formatDelta(pence: number): string {
  if (pence === 0) return '+\u00A30'
  const sign = pence > 0 ? '+' : '-'
  return `${sign}\u00A3${Math.abs(pence / 100).toFixed(0)}`
}

function formatPrice(pence: number): string {
  return `\u00A3${(pence / 100).toFixed(0)}`
}

function renderStars(count: number): string {
  return '\u2605'.repeat(count)
}

/* ── Default finders ── */

function findDefaultHotel(
  accommodations: AccommodationOption[],
): AccommodationOption | undefined {
  return accommodations.find((h) => h.units.some((u) => u.selected))
}

function findDefaultUnit(hotel: AccommodationOption): UnitOption | undefined {
  return hotel.units.find((u) => u.selected)
}

function findDefaultBoard(unit: UnitOption): BoardOption | undefined {
  return unit.boards.find((b) => b.selected) ?? unit.boards[0]
}

/* ── Component ── */

export default function RoomsStep() {
  const { state, actions } = useBooking()
  const {
    accommodations,
    accommodationsLoading,
    steps,
    currentStepIndex,
    receipt,
    payload,
  } = state

  /* ── Load accommodations on mount ── */
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (accommodations.length === 0 && !accommodationsLoading) {
      setLoading(true)
      actions.loadAccommodations().finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isLoading = loading || accommodationsLoading

  /* ── Defaults (memoised from data) ── */
  const defaultHotel = useMemo(
    () => findDefaultHotel(accommodations),
    [accommodations],
  )
  const defaultUnit = useMemo(
    () => (defaultHotel ? findDefaultUnit(defaultHotel) : undefined),
    [defaultHotel],
  )
  const defaultBoard = useMemo(
    () => (defaultUnit ? findDefaultBoard(defaultUnit) : undefined),
    [defaultUnit],
  )

  /* ── Selection state ── */
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)

  // Initialise selections when data arrives
  useEffect(() => {
    if (accommodations.length > 0 && selectedHotelId === null) {
      const dh = findDefaultHotel(accommodations)
      if (dh) {
        setSelectedHotelId(dh.id)
        const du = findDefaultUnit(dh)
        if (du) {
          setSelectedUnitId(du.id)
          const db = findDefaultBoard(du)
          if (db) setSelectedBoardId(db.id)
        }
      } else {
        const first = accommodations[0]
        setSelectedHotelId(first.id)
        if (first.units.length > 0) {
          setSelectedUnitId(first.units[0].id)
          if (first.units[0].boards.length > 0) {
            setSelectedBoardId(first.units[0].boards[0].id)
          }
        }
      }
    }
  }, [accommodations, selectedHotelId])

  /* ── Derived objects ── */
  const selectedHotel = useMemo(
    () => accommodations.find((h) => h.id === selectedHotelId) ?? null,
    [accommodations, selectedHotelId],
  )
  const selectedUnit = useMemo(
    () => selectedHotel?.units.find((u) => u.id === selectedUnitId) ?? null,
    [selectedHotel, selectedUnitId],
  )
  const selectedBoard = useMemo(
    () => selectedUnit?.boards.find((b) => b.id === selectedBoardId) ?? null,
    [selectedUnit, selectedBoardId],
  )

  /* ── Repricing on selection change ── */
  // Build a temporary payload and reprice via direct GQL call
  const [repricing, setRepricing] = useState(false)

  async function doReprice(unitId: string, boardId: string) {
    setRepricing(true)
    try {
      const { gql } = await import('@/lib/graphql/client')
      const { GET_DYNAMIC_PACKAGE_RECEIPT } = await import('@/lib/graphql/queries')
      const { normalizeReceipt } = await import('@/lib/booking/normalize')
      const { toReceiptVars } = await import('@/lib/booking/variables')

      const products = payload.products.filter(
        (p) => !p.id.startsWith('A:') && !p.id.startsWith('S:'),
      )
      products.push({ id: `A:${unitId}` })
      if (boardId !== unitId) {
        products.push({ id: `A:${boardId}` })
      }
      const updatedPayload = { ...payload, products }

      const hdrs = { 'x-tb-sessionid': payload.sessionId }
      const data = await gql(
        GET_DYNAMIC_PACKAGE_RECEIPT,
        toReceiptVars(updatedPayload),
        hdrs,
      )
      normalizeReceipt(data.dynamicPackageReceipt)
      // Note: the receipt in context will be updated when confirmAccommodation is called.
      // This intermediate call validates the selection and warms caches.
    } catch {
      // Ignore repricing errors for intermediate selections
    } finally {
      setRepricing(false)
    }
  }

  /* ── Selection handlers ── */
  function handleHotelSelect(hotelId: string) {
    if (hotelId === selectedHotelId) return
    setSelectedHotelId(hotelId)
    const hotel = accommodations.find((h) => h.id === hotelId)
    if (hotel) {
      const du = findDefaultUnit(hotel) ?? hotel.units[0]
      if (du) {
        setSelectedUnitId(du.id)
        const db = findDefaultBoard(du) ?? du.boards[0]
        if (db) {
          setSelectedBoardId(db.id)
          doReprice(du.id, db.id)
        }
      }
    }
  }

  function handleUnitSelect(unitId: string) {
    if (unitId === selectedUnitId) return
    setSelectedUnitId(unitId)
    const unit = selectedHotel?.units.find((u) => u.id === unitId)
    if (unit) {
      const db = findDefaultBoard(unit) ?? unit.boards[0]
      if (db) {
        setSelectedBoardId(db.id)
        doReprice(unit.id, db.id)
      }
    }
  }

  function handleBoardSelect(boardId: string) {
    if (boardId === selectedBoardId) return
    setSelectedBoardId(boardId)
    if (selectedUnitId) {
      doReprice(selectedUnitId, boardId)
    }
  }

  /* ── Hotel detail modal ── */
  const [modalHotel, setModalHotel] = useState<AccommodationOption | null>(null)

  /* ── Continue / Back ── */
  const [confirming, setConfirming] = useState(false)

  const canContinue =
    selectedHotelId !== null && selectedUnitId !== null && selectedBoardId !== null

  async function handleContinue() {
    if (!canContinue || !selectedUnitId || !selectedBoardId || !selectedHotelId) return
    setConfirming(true)
    try {
      await actions.confirmAccommodation({
        hotelId: selectedHotelId,
        unitId: selectedUnitId,
        boardId: selectedBoardId,
        options: [],
      })
    } catch {
      // Error handled in flow
    } finally {
      setConfirming(false)
    }
  }

  const nextStep = steps[currentStepIndex + 1]
  const continueLabel = nextStep
    ? `Step ${currentStepIndex + 2}. ${nextStep.label}`
    : 'Continue'

  /* ── Price delta helpers ── */
  const baseHotelPrice = defaultHotel?.price ?? 0

  function hotelPriceLabel(hotel: AccommodationOption): string {
    if (defaultHotel && hotel.id === defaultHotel.id) return 'Included'
    const delta = hotel.price - baseHotelPrice
    return formatDelta(delta)
  }

  function unitPriceLabel(unit: UnitOption): string {
    const hotelDefaultUnit = selectedHotel
      ? findDefaultUnit(selectedHotel) ?? selectedHotel.units[0]
      : undefined
    const basePrice = hotelDefaultUnit?.price ?? 0
    if (hotelDefaultUnit && unit.id === hotelDefaultUnit.id) return 'Included'
    const delta = unit.price - basePrice
    return formatDelta(delta)
  }

  function boardPriceLabel(board: BoardOption): string {
    const unitDefaultBoard = selectedUnit
      ? findDefaultBoard(selectedUnit) ?? selectedUnit.boards[0]
      : undefined
    const basePrice = unitDefaultBoard?.price ?? 0
    if (unitDefaultBoard && board.id === unitDefaultBoard.id) return 'Included'
    const delta = board.price - basePrice
    return formatDelta(delta)
  }

  function hotelTotalPrice(hotel: AccommodationOption): string {
    if (receipt) {
      const delta = hotel.price - baseHotelPrice
      return formatPrice(receipt.totalPrice + delta)
    }
    return formatPrice(hotel.price)
  }

  /* ── Render ── */
  return (
    <div className="step-panel">
      <div className="step-panel-header">
        <h2 className="step-title serif">Choose your room</h2>
      </div>

      <div className="step-panel-content" style={{ position: 'relative' }}>
        {isLoading && (
          <div className="loader-overlay">
            <div className="loader-spinner" />
          </div>
        )}

        {/* ── Hotel list ── */}
        {accommodations.length > 0 && (
          <section className="rooms-section">
            <label className="field-label">Hotels</label>
            <div className="option-list">
              {accommodations.map((hotel) => (
                <button
                  key={hotel.id}
                  type="button"
                  className={`option-card${selectedHotelId === hotel.id ? ' selected' : ''}`}
                  onClick={() => handleHotelSelect(hotel.id)}
                >
                  <div className="option-card-image">
                    {hotel.imageUrl && (
                      <img src={hotel.imageUrl} alt={hotel.name} />
                    )}
                  </div>
                  <div className="option-card-body">
                    <div className="option-card-name">{hotel.name}</div>
                    {hotel.subtitle && (
                      <div className="option-card-subtitle">{hotel.subtitle}</div>
                    )}
                    {hotel.stars > 0 && (
                      <div className="option-card-stars">{renderStars(hotel.stars)}</div>
                    )}
                    {hotel.facilities.length > 0 && (
                      <div className="chip-row">
                        {hotel.facilities.map((f) => (
                          <span key={f} className="chip">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn-text"
                      onClick={(e) => {
                        e.stopPropagation()
                        setModalHotel(hotel)
                      }}
                    >
                      View details
                    </button>
                  </div>
                  <div className="option-card-price">
                    <span className="option-card-delta">{hotelPriceLabel(hotel)}</span>
                    <span className="option-card-total">{hotelTotalPrice(hotel)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Room list (for selected hotel) ── */}
        {selectedHotel && selectedHotel.units.length > 0 && (
          <section className="rooms-section">
            <label className="field-label">Rooms</label>
            <div className="option-list">
              {selectedHotel.units.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  className={`option-card${selectedUnitId === unit.id ? ' selected' : ''}`}
                  onClick={() => handleUnitSelect(unit.id)}
                >
                  <div className="option-card-image">
                    {unit.imageUrl && (
                      <img src={unit.imageUrl} alt={unit.name} />
                    )}
                  </div>
                  <div className="option-card-body">
                    <div className="option-card-name">{unit.name}</div>
                    {unit.subtitle && (
                      <div className="option-card-subtitle">{unit.subtitle}</div>
                    )}
                    {unit.facilities.length > 0 && (
                      <div className="chip-row">
                        {unit.facilities.map((f) => (
                          <span key={f} className="chip">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="option-card-price">
                    <span className="option-card-delta">{unitPriceLabel(unit)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Board list (for selected room) ── */}
        {selectedUnit && selectedUnit.boards.length > 0 && (
          <section className="rooms-section">
            <label className="field-label">Board</label>
            <div className="chip-row">
              {selectedUnit.boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  className={`chip${selectedBoardId === board.id ? ' selected' : ''}`}
                  onClick={() => handleBoardSelect(board.id)}
                >
                  <span className="chip-label">{board.name}</span>
                  <span className="chip-price">{boardPriceLabel(board)}</span>
                </button>
              ))}
            </div>
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
          disabled={!canContinue || confirming}
          onClick={handleContinue}
        >
          {confirming ? 'Loading...' : continueLabel}
        </button>
      </div>

      {/* ── Hotel detail modal ── */}
      {modalHotel && (
        <div className="modal-backdrop" onClick={() => setModalHotel(null)}>
          <div className="modal-shell" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setModalHotel(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="modal-title">{modalHotel.name}</h3>
            {modalHotel.stars > 0 && (
              <div className="modal-stars">{renderStars(modalHotel.stars)}</div>
            )}
            {modalHotel.address && (
              <div className="modal-address">{modalHotel.address}</div>
            )}
            {modalHotel.gallery.length > 0 && (
              <div className="modal-gallery">
                {modalHotel.gallery.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${modalHotel.name} ${i + 1}`}
                    className="modal-gallery-img"
                  />
                ))}
              </div>
            )}
            {modalHotel.description && (
              <div
                className="modal-description"
                dangerouslySetInnerHTML={{ __html: modalHotel.description }}
              />
            )}
            {modalHotel.facilities.length > 0 && (
              <div className="modal-facilities">
                <h4>Facilities</h4>
                <div className="chip-row">
                  {modalHotel.facilities.map((f) => (
                    <span key={f} className="chip">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
