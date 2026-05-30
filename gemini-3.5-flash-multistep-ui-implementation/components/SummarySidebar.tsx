'use client';

import React, { useState } from 'react';
import { useBooking } from '@/lib/state';
import { formatMoney } from '@/lib/utils';
import { ItineraryComponent } from '@/lib/types';

// Inline SVG icons helper
export function TypeIcon({ type, className = 'itinerary-icon' }: { type: string; className?: string }) {
  const t = type.toLowerCase();
  
  // Accommodation
  if (t === 'accommodation') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );
  }
  // Flight
  if (t === 'flight') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    );
  }
  // Car
  if (t === 'car' || t === 'carrental') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    );
  }
  // Activity / Leisure
  if (t === 'activity' || t === 'leisure') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  // Transfer
  if (t === 'transfer') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zm0-3h-3.71a6.002 6.002 0 00-11.58 0H3m16 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v5m16 0h1a1 1 0 001-1V8a2 2 0 00-2-2h-3l-1-1H9L8 6H5a2 2 0 00-2 2v5a1 1 0 001 1h1" />
      </svg>
    );
  }

  // Fallback
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function formatDateDisplay(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: '', monthYr: '', weekday: '' };

  const day = d.getDate().toString();
  const monthYr = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  return { day, monthYr, weekday };
}

export default function SummarySidebar() {
  const { state, actions } = useBooking();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { offer, receipt, payload, receiptError } = state;

  const handleOpenModal = (modalType: 'included' | 'excluded' | 'info' | 'itinerary') => {
    actions.openModal(modalType);
  };

  const getItinerarySubtitle = (comp: ItineraryComponent) => {
    if (comp.type === 'accommodation') {
      return `${comp.unit?.name || 'Room'} · ${comp.board?.name || 'Meal plan'}`;
    }
    if (comp.type === 'flight') {
      return `${comp.flightCode} · ${comp.cabinClass || 'Economy'}`;
    }
    if (comp.type === 'car') {
      return `Pickup: ${comp.pickupLocation || 'Airport'}`;
    }
    return '';
  };

  const renderUnifiedSummary = () => {
    const heroImage = offer?.image?.url || '/logo-light.svg';
    const currency = offer?.currency || 'GBP';
    const totalMinor = receipt?.totalPrice || 0;

    // Dates block computation
    const startStr = receipt?.startDate || payload.selectedDate;
    let endStr = receipt?.endDate;

    if (!endStr && startStr && payload.nights) {
      const d = new Date(startStr);
      d.setDate(d.getDate() + payload.nights);
      endStr = d.toISOString().split('T')[0];
    }

    const startFormatted = startStr ? formatDateDisplay(startStr) : null;
    const endFormatted = endStr ? formatDateDisplay(endStr) : null;

    return (
      <div className="summary-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt="Package Header" className="summary-hero-image" />
        
        <div className="summary-content">
          <div className="summary-location">
            <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {offer?.destinationText?.location || 'Secret Escape'}
          </div>

          <h2 className="summary-title">{receipt?.title || offer?.title || 'Loading Package...'}</h2>

          <div className="summary-links">
            {offer?.includedListWithDescriptions && offer.includedListWithDescriptions.length > 0 && (
              <span className="summary-link" onClick={() => handleOpenModal('included')}>What&apos;s Included</span>
            )}
            {offer?.excludedList && offer.excludedList.length > 0 && (
              <span className="summary-link" onClick={() => handleOpenModal('excluded')}>What&apos;s Excluded</span>
            )}
            {offer?.informationList && offer.informationList.length > 0 && (
              <span className="summary-link" onClick={() => handleOpenModal('info')}>Trip Info</span>
            )}
          </div>

          {/* Receipt errors banner */}
          {receiptError && (
            <div className="alert-banner" style={{ margin: '8px 0' }}>
              <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{receiptError}</span>
            </div>
          )}

          {/* Date Visual Block */}
          {startFormatted && (
            <div className="summary-date-block">
              <div className="date-box">
                <span className="date-day-num">{startFormatted.day}</span>
                <span className="date-month-yr">{startFormatted.monthYr}</span>
                <span className="date-day-name">{startFormatted.weekday}</span>
              </div>
              <div className="date-arrow">→</div>
              {endFormatted ? (
                <div className="date-box" style={{ textAlign: 'right' }}>
                  <span className="date-day-num">{endFormatted.day}</span>
                  <span className="date-month-yr">{endFormatted.monthYr}</span>
                  <span className="date-day-name">{endFormatted.weekday}</span>
                </div>
              ) : (
                <div className="date-box" style={{ textAlign: 'right' }}>
                  <span className="date-day-num">--</span>
                  <span className="date-month-yr">Select stay</span>
                  <span className="date-day-name">--</span>
                </div>
              )}
            </div>
          )}

          {/* Itinerary Vertical Timeline */}
          {receipt?.itinerary?.events && receipt.itinerary.events.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#575757', marginBottom: '8px' }}>
                Itinerary
              </h3>
              
              <div className="itinerary-timeline" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                <div className="itinerary-line"></div>
                {receipt.itinerary.events.slice(0, 3).map((event, idx) => {
                  const comp = event.components?.[0];
                  if (!comp) return null;
                  
                  return (
                    <div key={idx} className="itinerary-event">
                      <div className="itinerary-dot"></div>
                      <div className="itinerary-details">
                        <div className="itinerary-meta">{event.label}</div>
                        <div className="itinerary-event-title">
                          <TypeIcon type={comp.type} />
                          <span>{comp.accommodation?.name || comp.airline || comp.model || event.sublabel}</span>
                        </div>
                        {getItinerarySubtitle(comp) && (
                          <div className="itinerary-event-sublabel">{getItinerarySubtitle(comp)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {receipt.itinerary.events.length > 3 && (
                <div
                  className="summary-link"
                  onClick={() => handleOpenModal('itinerary')}
                  style={{ display: 'inline-block', fontSize: '13px', marginTop: '8px', fontWeight: '600' }}
                >
                  View full itinerary ({receipt.itinerary.events.length} events)
                </div>
              )}
            </div>
          )}

          {/* Price area */}
          {receipt && (
            <div className="summary-prices">
              {receipt.lines.map((line, idx) => {
                if (line.__typename === 'ReceiptLineAmount') {
                  return (
                    <div key={idx} className={`price-line ${line.format === 'IMPORTANT' ? 'important' : ''}`}>
                      <span>{line.label}</span>
                      <span>{line.amount !== undefined ? formatMoney(line.amount, currency) : ''}</span>
                    </div>
                  );
                }
                if (line.__typename === 'ReceiptLineText') {
                  return (
                    <div key={idx} className="price-line subtext">
                      <span>{line.label}</span>
                      <span>{line.text}</span>
                    </div>
                  );
                }
                // Plain line
                return (
                  <div key={idx} className="price-line font-medium" style={{ borderBottom: line.format === 'LINEBREAK' ? '1px solid #ddd' : 'none', paddingBottom: line.format === 'LINEBREAK' ? '4px' : '0' }}>
                    <span>{line.label}</span>
                    <span>Included</span>
                  </div>
                );
              })}

              <div className="summary-total">
                <span className="total-label">Total price</span>
                <span className="total-amount">{formatMoney(totalMinor, currency)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop sidebar wrapper */}
      <div className="summary-container">
        {renderUnifiedSummary()}
      </div>

      {/* Mobile sticky summary bar */}
      {receipt && (
        <div className="mobile-summary-bar">
          <div className="mobile-price-preview">
            <span className="mobile-price-amount">
              {formatMoney(receipt.totalPrice, offer?.currency || 'GBP')}
            </span>
            <span className="mobile-price-label">Live total</span>
          </div>
          <button className="btn btn-primary" onClick={() => setDrawerOpen(true)} style={{ padding: '8px 16px', fontSize: '13px' }}>
            View Details
          </button>
        </div>
      )}

      {/* Mobile drawer backdrop */}
      <div className={`mobile-summary-drawer ${drawerOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}>
        <div className="mobile-summary-drawer-content">
          <div className="mobile-drawer-header">
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Booking Summary</h2>
            <button className="mobile-drawer-close" onClick={() => setDrawerOpen(false)}>×</button>
          </div>
          <div className="mobile-drawer-body">
            {renderUnifiedSummary()}
          </div>
        </div>
      </div>
    </>
  );
}
