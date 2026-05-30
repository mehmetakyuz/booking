'use client';

import React from 'react';
import { useBooking } from '@/lib/state';
import OccupancySelector from '../OccupancySelector';
import Dropdown from '../Dropdown';
import Calendar from '../Calendar';
import { formatMoney } from '@/lib/utils';

export default function DatesStep() {
  const { state, actions } = useBooking();
  const { calendar, calendarLoading, payload, receipt, receiptLoading, receiptError, steps } = state;

  const currency = state.offer?.currency || 'GBP';

  // Airport options
  const airportOptions = (calendar?.departureAirports || []).map(a => ({
    value: a.value,
    label: a.price ? `${a.label} (${formatMoney(a.price, currency)})` : a.label
  }));

  const activeAirport = payload.departureAirports?.[0] || '';

  const handleAirportChange = (val: string) => {
    actions.setAirport(val);
  };

  // Nights options (pills)
  const nightsOptions = calendar?.nights || [];
  
  // Package groups (cards comparison)
  const packageGroups = calendar?.packageGroups || [];

  const nextStepDef = steps.find(s => s.id === state.currentStep + 1);

  return (
    <div className="content-card" style={{ padding: '24px' }}>
      {calendarLoading && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
        </div>
      )}

      <div className="step-header">
        <h1 className="step-title">Dates &amp; Travellers</h1>
        <p className="step-subtitle">Configure your stay, airports, and select vacation dates.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Row 1: Travellers & Airport */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <OccupancySelector />

          <div className="form-group">
            <label className="form-label">Departure Airport</label>
            <Dropdown
              value={activeAirport}
              onChange={handleAirportChange}
              options={airportOptions}
              placeholder="Any airport"
            />
          </div>
        </div>

        {/* Row 2: Package Group Card List */}
        {packageGroups.length > 0 && (
          <div>
            <label className="form-label">Package Option</label>
            <div className="selectable-group-list">
              {packageGroups.map((group) => {
                // If packageGroup is empty string, check against payload.packageGroup
                const isSelected = payload.packageGroup === group.value;

                return (
                  <div
                    key={group.value}
                    className={`group-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => actions.setPackageGroup(group.value)}
                  >
                    <span className="group-card-name">{group.label}</span>
                    {group.price !== undefined && (
                      <span className="group-card-price">
                        {formatMoney(group.price, currency)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 3: Nights Selection (Pills) */}
        {nightsOptions.length > 0 && (
          <div>
            <label className="form-label">Length of stay</label>
            <div className="stay-pills-list" style={{ marginTop: '8px' }}>
              {/* Flexible option "All nights" */}
              <button
                type="button"
                className={`stay-pill ${payload.nights === null ? 'selected' : ''}`}
                onClick={() => actions.setNights(null)}
              >
                All nights
              </button>

              {/* Fixed options */}
              {nightsOptions.map((nightOption) => {
                const num = parseInt(nightOption.value);
                const isSelected = payload.nights === num;
                return (
                  <button
                    key={nightOption.value}
                    type="button"
                    className={`stay-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => actions.setNights(num)}
                  >
                    {nightOption.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar Section */}
        <div style={{ borderTop: '1px solid #dfdfdf', paddingTop: '16px' }}>
          <label className="form-label">Select Departure Date</label>
          <Calendar />
          
          <p
            style={{
              fontSize: '12px',
              color: '#8b8b8b',
              marginTop: '12px',
              textAlign: 'center',
              lineHeight: '1.4'
            }}
          >
            Prices are estimated, calculated per person based on the selected traveller count (minimum 2 adults sharing). Included flight and package prices may vary.
          </p>
        </div>

        {/* Navigation Continue */}
        <div className="nav-buttons" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!receipt || !!receiptError || receiptLoading}
            onClick={actions.confirmDates}
          >
            {nextStepDef ? `Step 2. ${nextStepDef.label}` : 'Continue'} →
          </button>
        </div>
      </div>
    </div>
  );
}
