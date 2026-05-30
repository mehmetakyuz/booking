'use client';

import React, { useState } from 'react';
import { useBooking } from '@/lib/state';
import { formatMoney, parseISODuration, getLeisureGroupTypeLabel } from '@/lib/utils';
import Modal from '../Modal';
import { LeisureOption, LeisureUnitOption } from '@/lib/types';

// Slidable gallery component
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
    <div className="gallery-carousel" style={{ height: '220px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gallery[slideIdx].url}
        alt={`Activity view ${slideIdx + 1}`}
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
        </>
      )}
    </div>
  );
}

export default function ActivitiesStep() {
  const { state, actions } = useBooking();
  const { activities, activitiesLoading, activitiesBaselinePrice, payload, receipt, steps } = state;

  const [detailActivity, setDetailActivity] = useState<LeisureOption | null>(null);

  const currency = state.offer?.currency || 'GBP';

  const activeProductIds = (payload.products || []).map(p => p.id);

  // Split activities into Included and Optional
  const includedActs = activities?.filter(a => !a.optional) || [];
  const optionalActs = activities?.filter(a => a.optional) || [];

  const handleSelectUnit = async (leisure: LeisureOption, unit: LeisureUnitOption) => {
    // If optional: ensure all other units of the same optional group (day) are deselected
    if (leisure.optional) {
      const otherUnitIds = (leisure.units || []).map(u => u.id);
      
      // Remove other units first
      let cleanProducts = (payload.products || []).filter(p => !otherUnitIds.includes(p.id));
      
      // Add this unit
      const newPayload = {
        ...payload,
        products: [...cleanProducts, { id: unit.id }]
      };
      
      await actions.toggleLeisureSelection(leisure.id, unit.id, true);
    } else {
      // Included: toggle/select
      const otherUnitIds = (leisure.units || []).map(u => u.id);
      let cleanProducts = (payload.products || []).filter(p => !otherUnitIds.includes(p.id));
      const newPayload = {
        ...payload,
        products: [...cleanProducts, { id: unit.id }]
      };
      await actions.toggleLeisureSelection(leisure.id, unit.id, true);
    }
  };

  const handleDeselectDay = async (leisure: LeisureOption) => {
    // Deselect all units for this day slot (No thanks)
    const unitIds = (leisure.units || []).map(u => u.id);
    let cleanProducts = (payload.products || []).filter(p => !unitIds.includes(p.id));
    
    // Call set state
    actions.setAccommodationSelection(state.payload.offerId, '', ''); // trigger re-eval or update payload
    // Wait, let's just trigger a dummy action or modify payload directly!
    // Since actions provides toggleLeisureSelection, we can toggle off all units
    for (const unitId of unitIds) {
      if (activeProductIds.includes(unitId)) {
        await actions.toggleLeisureSelection(leisure.id, unitId, false);
      }
    }
  };

  const getDeltaPriceDisplay = (unitPrice: number, isBaseline: boolean) => {
    if (isBaseline) {
      return <span className="price-delta included">Included</span>;
    }
    const delta = unitPrice;
    if (delta === 0) return <span className="price-delta">+£0</span>;

    return (
      <span className="price-delta">
        {delta > 0 ? '+' : ''}
        {formatMoney(delta, currency)}
      </span>
    );
  };

  const nextStepDef = steps.find(s => s.id === state.currentStep + 1);

  return (
    <div className="content-card" style={{ padding: '24px' }}>
      {activitiesLoading && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
        </div>
      )}

      <div className="step-header">
        <h1 className="step-title">Activities &amp; Excursions</h1>
        <p className="step-subtitle">Review included excursions or enhance your trip with daily activities.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Included Leisure */}
        {includedActs.length > 0 && (
          <div>
            <h2 className="form-label" style={{ marginBottom: '12px' }}>Included Activities</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {includedActs.map((act) => {
                const defaultUnit = act.units?.find(u => u.selected) || act.units?.[0];
                const activeUnit = act.units?.find(u => activeProductIds.includes(u.id)) || defaultUnit;

                return (
                  <div key={act.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>{act.name}</h3>
                    
                    <div className="option-cards-list">
                      {act.units?.map((unit) => {
                        const isSelected = activeUnit?.id === unit.id;
                        const isBaseline = defaultUnit?.id === unit.id;
                        const totalEst = receipt ? receipt.totalPrice + (isBaseline ? 0 : unit.price) : 0;

                        return (
                          <div
                            key={unit.id}
                            className={`option-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectUnit(act, unit)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="option-card-media">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={act.image?.url || '/logo-light.svg'} alt={act.name} className="option-card-image" />
                            </div>

                            <div className="option-card-content">
                              <div className="option-card-header">
                                <div>
                                  <h4 className="option-card-title">{unit.name}</h4>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    {unit.duration && (
                                      <span className="facility-chip" style={{ margin: 0, padding: '1px 6px' }}>
                                        {parseISODuration(unit.duration)}
                                      </span>
                                    )}
                                    {unit.groupType && (
                                      <span className="facility-chip" style={{ margin: 0, padding: '1px 6px' }}>
                                        {getLeisureGroupTypeLabel(unit.groupType)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="option-card-price-block">
                                  {getDeltaPriceDisplay(unit.price, isBaseline)}
                                  {receipt && (
                                    <div className="price-total-hint">
                                      Total: {formatMoney(totalEst, currency)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="option-card-footer">
                                <span
                                  className="summary-link"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailActivity(act);
                                  }}
                                  style={{ fontSize: '12px' }}
                                >
                                  View details
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional Leisure Grouped by Day Slot */}
        {optionalActs.length > 0 && (
          <div style={{ borderTop: '1px solid #dfdfdf', paddingTop: '20px' }}>
            <h2 className="form-label" style={{ marginBottom: '12px' }}>Optional Activities</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {optionalActs.map((act) => {
                const selectedUnit = act.units?.find(u => activeProductIds.includes(u.id)) || null;
                const isNoThanksActive = selectedUnit === null;

                // Format day header
                const dayHeader = act.date
                  ? new Date(act.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
                  : 'Optional Day Slot';

                return (
                  <div key={act.id} style={{ border: '1px solid #dfdfdf', borderRadius: '4px', padding: '16px', backgroundColor: '#fdffdf' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{dayHeader}</span>
                      
                      {/* No Thanks Option */}
                      <button
                        type="button"
                        className={`stay-pill ${isNoThanksActive ? 'selected' : ''}`}
                        onClick={() => handleDeselectDay(act)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        No thanks
                      </button>
                    </div>

                    <div className="option-cards-list">
                      {act.units?.map((unit) => {
                        const isSelected = selectedUnit?.id === unit.id;
                        const totalEst = receipt ? receipt.totalPrice + (isSelected ? 0 : unit.price) : 0;

                        return (
                          <div
                            key={unit.id}
                            className={`option-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectUnit(act, unit)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="option-card-media">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={act.image?.url || '/logo-light.svg'} alt={act.name} className="option-card-image" />
                            </div>

                            <div className="option-card-content">
                              <div className="option-card-header">
                                <div>
                                  <h4 className="option-card-title">{unit.name}</h4>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    {unit.duration && (
                                      <span className="facility-chip" style={{ margin: 0, padding: '1px 6px' }}>
                                        {parseISODuration(unit.duration)}
                                      </span>
                                    )}
                                    {unit.groupType && (
                                      <span className="facility-chip" style={{ margin: 0, padding: '1px 6px' }}>
                                        {getLeisureGroupTypeLabel(unit.groupType)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="option-card-price-block">
                                  {getDeltaPriceDisplay(unit.price, false)}
                                  {receipt && (
                                    <div className="price-total-hint">
                                      Total: {formatMoney(totalEst, currency)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="option-card-footer">
                                <span
                                  className="summary-link"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailActivity(act);
                                  }}
                                  style={{ fontSize: '12px' }}
                                >
                                  View details
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
            {nextStepDef ? `Step 4. ${nextStepDef.label}` : 'Continue'} →
          </button>
        </div>
      </div>

      {/* Activity Details Modal */}
      {detailActivity && (
        <Modal
          isOpen={!!detailActivity}
          onClose={() => setDetailActivity(null)}
          title={detailActivity.name}
        >
          {detailActivity.gallery && detailActivity.gallery.length > 0 ? (
            <GalleryCarousel gallery={detailActivity.gallery} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detailActivity.image?.url || '/logo-light.svg'}
              alt={detailActivity.name}
              style={{ width: '100%', height: '220px', objectFit: 'cover' }}
            />
          )}

          <div style={{ marginTop: '16px', fontSize: '14px', lineHeight: '1.6', color: '#575757' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#17171a', marginBottom: '6px' }}>Description</h3>
            <p>{detailActivity.description || 'Enjoy a premium representative local excursion in your secret escapes stay.'}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
