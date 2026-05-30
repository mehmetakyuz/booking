'use client';

import React, { useEffect, useRef } from 'react';
import { useBooking } from '@/lib/state';
import { formatMoney, getCarExtraTypeLabel } from '@/lib/utils';
import { CarOption, CarExtraOption } from '@/lib/types';

export default function CarsStep() {
  const { state, actions } = useBooking();
  const { cars, carsLoading, carsStage, carsError, carExtras, carExtrasLoading, payload, receipt, steps } = state;

  const currency = state.offer?.currency || 'GBP';

  const selectedCarId = payload.products?.find(p => p.id.startsWith('C:'))?.id || '';
  const selectedExtraIds = new Set((payload.products || []).filter(p => p.id.startsWith('CE:')).map(p => p.id));

  // Auto poll car search on mount if idle
  useEffect(() => {
    if (carsStage === 'idle') {
      actions.triggerCarSearch();
    }
  }, [carsStage, actions]);

  const handleSelectCar = async (carId: string) => {
    await actions.setCarSelection(carId);
  };

  const handleToggleExtra = async (extra: CarExtraOption) => {
    const isSelected = selectedExtraIds.has(extra.id);
    await actions.toggleCarExtra(selectedCarId, extra.id, !isSelected);
  };

  const getDeltaPriceDisplay = (carPrice: number, isBaseline: boolean) => {
    if (isBaseline) {
      return <span className="price-delta included">Included</span>;
    }
    const delta = carPrice;
    if (delta === 0) return <span className="price-delta">+£0</span>;

    return (
      <span className="price-delta">
        {delta > 0 ? '+' : ''}
        {formatMoney(delta, currency)}
      </span>
    );
  };

  // Render Loader / Search Status
  if (carsStage === 'searching') {
    return (
      <div className="content-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loader-spinner" style={{ margin: '0 auto 20px auto', width: '48px', height: '48px' }}></div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          Searching Rental Cars...
        </h2>
        <p style={{ color: '#575757', fontSize: '14px' }}>
          We are searching for rental car options available at your destination.
        </p>
      </div>
    );
  }

  // Render Fail / Empty state
  if (carsStage === 'failed' || carsStage === 'empty') {
    return (
      <div className="content-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', color: '#8b8b8b', marginBottom: '16px' }}>🚗</div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#d90032' }}>
          No Rental Cars Available
        </h2>
        <p style={{ color: '#575757', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
          We couldn&apos;t find any rental cars matching your booking details.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => actions.goToStep(1)}>
          Return to Dates
        </button>
      </div>
    );
  }

  const baselineCar = cars?.find(c => c.selected) || cars?.[0];
  const activeCar = cars?.find(c => c.id === selectedCarId) || baselineCar;

  const nextStepDef = steps.find(s => s.id === state.currentStep + 1);

  return (
    <div className="content-card" style={{ padding: '24px' }}>
      {carsLoading && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
        </div>
      )}

      <div className="step-header">
        <h1 className="step-title">Car Hire</h1>
        <p className="step-subtitle">Select your rental vehicle and configure optional extras.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Vehicles list */}
        <div>
          <h2 className="form-label" style={{ marginBottom: '12px' }}>1. Choose Vehicle</h2>
          <div className="option-cards-list">
            {cars?.map((car) => {
              const isSelected = selectedCarId === car.id || (!selectedCarId && activeCar?.id === car.id);
              const isBaseline = baselineCar?.id === car.id;
              const imageSrc = car.image || '/logo-light.svg';
              const totalEst = receipt ? receipt.totalPrice + (isBaseline ? 0 : car.price) : 0;

              return (
                <div
                  key={car.id}
                  className={`option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectCar(car.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="option-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc} alt={car.model} className="option-card-image" />
                  </div>

                  <div className="option-card-content">
                    <div className="option-card-header">
                      <div>
                        <h3 className="option-card-title">{car.model}</h3>
                        <p style={{ fontSize: '12px', color: '#8b8b8b', marginTop: '2px' }}>
                          Pickup: {car.pickupLocation?.name || 'Terminal'} · Dropoff: {car.dropoffLocation?.name || 'Terminal'}
                        </p>
                        
                        {car.specifications && car.specifications.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {car.specifications.map((spec, idx) => (
                              <span key={idx} className="facility-chip" style={{ margin: 0, padding: '1px 6px', fontSize: '11px' }}>
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="option-card-price-block">
                        {getDeltaPriceDisplay(car.price, isBaseline)}
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

        {/* Car Extras List */}
        {activeCar && (
          <div style={{ borderTop: '1px solid #dfdfdf', paddingTop: '20px' }}>
            <h2 className="form-label" style={{ marginBottom: '12px' }}>2. Optional Extras</h2>
            
            {carExtrasLoading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div className="loader-spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ fontSize: '13px', color: '#8b8b8b', marginTop: '8px' }}>Retrieving vehicle extras...</p>
              </div>
            ) : carExtras && carExtras.length > 0 ? (
              <div className="option-cards-list">
                {carExtras.map((extra) => {
                  const isSelected = selectedExtraIds.has(extra.id);
                  const extraPrice = extra.price?.amount || 0;

                  return (
                    <div
                      key={extra.id}
                      className={`option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleExtra(extra)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="option-card-content" style={{ padding: '12px 16px' }}>
                        <div className="option-card-header" style={{ margin: 0 }}>
                          <div style={{ flexGrow: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4 className="option-card-title">{extra.name}</h4>
                              <span
                                className="facility-chip"
                                style={{ margin: 0, padding: '1px 6px', fontSize: '10px', backgroundColor: extra.prePayable ? '#e5f5f1' : '#f5f5f5' }}
                              >
                                {extra.prePayable ? 'Pay now' : 'Pay at desk'}
                              </span>
                            </div>
                            
                            {extra.extraType && (
                              <p style={{ fontSize: '11px', color: '#0098a8', marginTop: '2px', fontWeight: '600' }}>
                                {getCarExtraTypeLabel(extra.extraType)}
                              </p>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '12px' }}>
                              {extra.policyDocUrl && (
                                <a
                                  href={extra.policyDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="summary-link"
                                >
                                  Policy Doc
                                </a>
                              )}
                              {extra.keyFactsUrl && (
                                <a
                                  href={extra.keyFactsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="summary-link"
                                >
                                  Key Facts
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="option-card-price-block">
                            <span className="price-delta">
                              +{formatMoney(extraPrice, extra.currency || currency)}
                            </span>
                            {receipt && (
                              <div className="price-total-hint">
                                Total: {formatMoney(receipt.totalPrice + (isSelected ? 0 : extraPrice), currency)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#8b8b8b' }}>No optional extras available for this vehicle.</p>
            )}
          </div>
        )}

        {/* Navigation CTAs */}
        <div className="nav-buttons">
          <button type="button" className="btn btn-secondary" onClick={actions.prevStep}>
            ← Back
          </button>
          <button type="button" className="btn btn-primary" onClick={actions.nextStep}>
            {nextStepDef ? `Step 6. ${nextStepDef.label}` : 'Continue'} →
          </button>
        </div>
      </div>
    </div>
  );
}
