'use client';

import React, { useState } from 'react';
import { useBooking } from '@/lib/state';
import { formatMoney } from '@/lib/utils';
import Modal from '../Modal';
import { AccommodationOption, AccommodationUnitOption, AccommodationBoardOption, Facility } from '@/lib/types';

// Facility SVG icon mapper
function FacilityIcon({ icon, className = 'itinerary-icon' }: { icon: string; className?: string }) {
  const i = icon.toLowerCase();
  
  if (i.includes('wifi')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M5.283 13.576a9.5 9.5 0 0113.434 0M2.455 10.749a14.5 14.5 0 0119.09 0" />
      </svg>
    );
  }
  if (i.includes('spa') || i.includes('pool') || i.includes('bath')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (i.includes('restaurant') || i.includes('bar') || i.includes('coffee') || i.includes('tea') || i.includes('food')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (i.includes('parking') || i.includes('car')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    );
  }
  
  // Default fallback chip icon
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

// Slidable gallery carousel component for detail modals
function GalleryCarousel({ gallery }: { gallery: Array<{ url: string }> }) {
  const [slideIdx, setSlideIdx] = useState(0);

  if (!gallery || gallery.length === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideIdx(prev => (prev === 0 ? gallery.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideIdx(prev => (prev === gallery.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="gallery-carousel">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gallery[slideIdx].url}
        alt={`Hotel view ${slideIdx + 1}`}
        className="gallery-image"
      />
      {gallery.length > 1 && (
        <>
          <button className="gallery-nav gallery-nav-prev" onClick={handlePrev}>
            ‹
          </button>
          <button className="gallery-nav gallery-nav-next" onClick={handleNext}>
            ›
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '9999px'
            }}
          >
            {slideIdx + 1} / {gallery.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function RoomsStep() {
  const { state, actions } = useBooking();
  const { accommodations, accommodationsLoading, payload, receipt, steps } = state;

  const [detailHotel, setDetailHotel] = useState<AccommodationOption | null>(null);

  const currency = state.offer?.currency || 'GBP';

  // Find active selections from products payload
  const activeProductIds = (payload.products || []).map(p => p.id);

  // Helper to check if a hotel/room/board is active
  const isHotelActive = (hotel: AccommodationOption) => {
    // Hotel is active if payload contains either the hotel.id, any unit.id, or any board.id
    if (activeProductIds.includes(hotel.id)) return true;
    
    for (const unit of hotel.units || []) {
      if (activeProductIds.includes(unit.id)) return true;
      for (const board of unit.boards || []) {
        if (activeProductIds.includes(board.id)) return true;
      }
    }
    return false;
  };

  const getActiveUnit = (hotel: AccommodationOption) => {
    for (const unit of hotel.units || []) {
      if (activeProductIds.includes(unit.id)) return unit;
      for (const board of unit.boards || []) {
        if (activeProductIds.includes(board.id)) return unit;
      }
    }
    // Fallback to selected/default or first
    return hotel.units?.find(u => u.selected) || hotel.units?.[0] || null;
  };

  const getActiveBoard = (unit: AccommodationUnitOption | null) => {
    if (!unit) return null;
    for (const board of unit.boards || []) {
      if (activeProductIds.includes(board.id)) return board;
    }
    // Fallback to selected/default or first
    return unit.boards?.find(b => b.selected) || unit.boards?.[0] || null;
  };

  // Locate current active hotel
  const activeHotel = accommodations?.find(isHotelActive) || accommodations?.[0] || null;
  const activeUnit = activeHotel ? getActiveUnit(activeHotel) : null;
  const activeBoard = activeUnit ? getActiveBoard(activeUnit) : null;

  const handleSelectHotel = async (hotel: AccommodationOption) => {
    // Find default unit and board for this hotel
    const unit = hotel.units?.find(u => u.selected) || hotel.units?.[0] || null;
    const board = unit?.boards?.find(b => b.selected) || unit?.boards?.[0] || null;
    
    await actions.setAccommodationSelection(hotel.id, unit?.id || '', board?.id || '');
  };

  const handleSelectRoom = async (unit: AccommodationUnitOption) => {
    if (!activeHotel) return;
    const board = unit.boards?.find(b => b.selected) || unit.boards?.[0] || null;
    await actions.setAccommodationSelection(activeHotel.id, unit.id, board?.id || '');
  };

  const handleSelectBoard = async (board: AccommodationBoardOption) => {
    if (!activeHotel || !activeUnit) return;
    await actions.setAccommodationSelection(activeHotel.id, activeUnit.id, board.id);
  };

  const getDeltaPriceDisplay = (optionPrice: number, isBaseline: boolean) => {
    if (isBaseline) {
      return <span className="price-delta included">Included</span>;
    }
    const delta = optionPrice; // Note: price in option is already relative delta or absolute?
    // Wait, the API returns price delta or total option price?
    // "tied non-baselines show +£0, cheaper alternatives may show negative deltas"
    // So the price returned is indeed a delta price!
    if (delta === 0) return <span className="price-delta">+£0</span>;
    
    return (
      <span className="price-delta">
        {delta > 0 ? '+' : ''}
        {formatMoney(delta, currency)}
      </span>
    );
  };

  // Find baseline hotel: backend-selected or first
  const baselineHotel = accommodations?.find(h => h.selected) || accommodations?.[0];

  const nextStepDef = steps.find(s => s.id === state.currentStep + 1);

  return (
    <div className="content-card" style={{ padding: '24px' }}>
      {accommodationsLoading && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
        </div>
      )}

      <div className="step-header">
        <h1 className="step-title">Accommodation &amp; Rooms</h1>
        <p className="step-subtitle">Select your preferred hotel, room type, and board options.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Hotel List */}
        <div>
          <h2 className="form-label" style={{ marginBottom: '12px' }}>1. Choose Hotel</h2>
          <div className="option-cards-list">
            {accommodations?.map((hotel) => {
              const isSelected = activeHotel?.id === hotel.id;
              const isBaseline = baselineHotel?.id === hotel.id;
              const imageSrc = hotel.image?.url || '/logo-light.svg';
              
              // Total price display calculation:
              // If selected, it is receipt.totalPrice. If not, it is receipt.totalPrice + delta?
              // Wait, the spec says: "show the resulting total package price as a smaller secondary line under the delta"
              const totalEst = receipt ? receipt.totalPrice + (isBaseline ? 0 : hotel.price) : 0;

              return (
                <div
                  key={hotel.id}
                  className={`option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectHotel(hotel)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="option-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc} alt={hotel.name} className="option-card-image" />
                  </div>
                  
                  <div className="option-card-content">
                    <div className="option-card-header">
                      <div>
                        <h3 className="option-card-title">{hotel.name}</h3>
                        <span
                          className="summary-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailHotel(hotel);
                          }}
                          style={{ fontSize: '12px', marginTop: '4px', display: 'inline-block' }}
                        >
                          View hotel details
                        </span>
                      </div>

                      <div className="option-card-price-block">
                        {getDeltaPriceDisplay(hotel.price, isBaseline)}
                        {receipt && (
                          <div className="price-total-hint">
                            Total: {formatMoney(totalEst, currency)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room List (for selected hotel) */}
        {activeHotel && activeHotel.units && activeHotel.units.length > 0 && (
          <div style={{ borderTop: '1px solid #dfdfdf', paddingTop: '20px' }}>
            <h2 className="form-label" style={{ marginBottom: '12px' }}>2. Choose Room Type</h2>
            <div className="option-cards-list">
              {activeHotel.units.map((room) => {
                const isSelected = activeUnit?.id === room.id;
                const baselineRoom = activeHotel.units.find(r => r.selected) || activeHotel.units[0];
                const isBaseline = baselineRoom.id === room.id;
                const imageSrc = room.image?.url || '/logo-light.svg';
                
                const totalEst = receipt ? receipt.totalPrice + (isBaseline ? 0 : room.price) : 0;

                return (
                  <div
                    key={room.id}
                    className={`option-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectRoom(room)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="option-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageSrc} alt={room.name} className="option-card-image" />
                    </div>

                    <div className="option-card-content">
                      <div className="option-card-header">
                        <div>
                          <h3 className="option-card-title">{room.name}</h3>
                          {room.description && (
                            <p className="option-card-description">{room.description}</p>
                          )}
                        </div>

                        <div className="option-card-price-block">
                          {getDeltaPriceDisplay(room.price, isBaseline)}
                          {receipt && (
                            <div className="price-total-hint">
                              Total: {formatMoney(totalEst, currency)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Board List (for selected room) */}
        {activeUnit && activeUnit.boards && activeUnit.boards.length > 0 && (
          <div style={{ borderTop: '1px solid #dfdfdf', paddingTop: '20px' }}>
            <h2 className="form-label" style={{ marginBottom: '12px' }}>3. Choose Board / Meal Plan</h2>
            <div className="stay-pills-list" style={{ marginTop: '8px' }}>
              {activeUnit.boards.map((board) => {
                const isSelected = activeBoard?.id === board.id;
                const baselineBoard = activeUnit.boards.find(b => b.selected) || activeUnit.boards[0];
                const isBaseline = baselineBoard.id === board.id;

                let label = board.name;
                if (!isBaseline) {
                  const delta = board.price;
                  const deltaStr = delta >= 0 ? `+${formatMoney(delta, currency)}` : `-${formatMoney(Math.abs(delta), currency)}`;
                  label += ` (${deltaStr})`;
                } else {
                  label += ' (Included)';
                }

                return (
                  <button
                    key={board.id}
                    type="button"
                    className={`stay-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectBoard(board)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation CTAs */}
        <div className="nav-buttons">
          <button type="button" className="btn btn-secondary" onClick={actions.prevStep}>
            ← Back
          </button>
          <button type="button" className="btn btn-primary" onClick={actions.nextStep}>
            {nextStepDef ? `Step 3. ${nextStepDef.label}` : 'Continue'} →
          </button>
        </div>
      </div>

      {/* Hotel Details Modal */}
      {detailHotel && (
        <Modal
          isOpen={!!detailHotel}
          onClose={() => setDetailHotel(null)}
          title={detailHotel.name}
        >
          {detailHotel.gallery && detailHotel.gallery.length > 0 ? (
            <GalleryCarousel gallery={detailHotel.gallery} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detailHotel.image?.url || '/logo-light.svg'}
              alt={detailHotel.name}
              style={{ width: '100%', height: '250px', objectFit: 'cover' }}
            />
          )}

          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Hotel Facilities</h3>
            <div className="facility-chips">
              {detailHotel.facilities?.map((f: Facility, idx: number) => (
                <div key={idx} className="facility-chip">
                  <FacilityIcon icon={f.icon} />
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '14px', lineHeight: '1.6', color: '#575757' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#17171a', marginBottom: '6px' }}>Description</h3>
            <p>{detailHotel.description || 'Premium accommodation select escape destination.'}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
