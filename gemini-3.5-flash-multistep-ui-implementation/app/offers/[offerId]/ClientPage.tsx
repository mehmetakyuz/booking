'use client';

import React from 'react';
import { BookingProvider, useBooking } from '@/lib/state';
import TopRail from '@/components/TopRail';
import SummarySidebar, { TypeIcon } from '@/components/SummarySidebar';
import Modal from '@/components/Modal';

// Steps imports
import DatesStep from '@/components/Steps/DatesStep';
import RoomsStep from '@/components/Steps/RoomsStep';
import ActivitiesStep from '@/components/Steps/ActivitiesStep';
import FlightsStep from '@/components/Steps/FlightsStep';
import CarsStep from '@/components/Steps/CarsStep';
import CheckoutStep from '@/components/Steps/CheckoutStep';

function MainLayout() {
  const { state, actions } = useBooking();
  const { currentStep, steps, modalOpen, offer, receipt } = state;

  const activeStep = steps.find(s => s.id === currentStep);

  const renderActiveStepComponent = () => {
    if (!activeStep) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading steps...</div>;

    switch (activeStep.component) {
      case 'DatesStep':
        return <DatesStep />;
      case 'RoomsStep':
        return <RoomsStep />;
      case 'ActivitiesStep':
        return <ActivitiesStep />;
      case 'FlightsStep':
        return <FlightsStep />;
      case 'CarsStep':
        return <CarsStep />;
      case 'CheckoutStep':
        return <CheckoutStep />;
      default:
        return <div style={{ padding: '24px' }}>Step component not found.</div>;
    }
  };

  return (
    <div className="booking-shell">
      {/* Branded Top Rail */}
      <TopRail />

      {/* Main Responsive Grid Layout */}
      <main className="main-container">
        {/* Left Column Active Step Card Container */}
        <section className="step-panel">
          {renderActiveStepComponent()}
        </section>

        {/* Right Column Sticky Sidebar Container */}
        <SummarySidebar />
      </main>

      {/* 1. What's Included Modal */}
      <Modal
        isOpen={modalOpen === 'included'}
        onClose={actions.closeModal}
        title="What's Included"
      >
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
          {offer?.includedListWithDescriptions?.map((item, idx) => (
            <li key={idx}>
              <strong>{item.name}</strong>
              {item.description && <p style={{ color: '#575757', marginTop: '2px' }}>{item.description}</p>}
            </li>
          ))}
        </ul>
      </Modal>

      {/* 2. What's Excluded Modal */}
      <Modal
        isOpen={modalOpen === 'excluded'}
        onClose={actions.closeModal}
        title="What's Excluded"
      >
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          {offer?.excludedList?.map((item, idx) => (
            <li key={idx} style={{ color: '#d90032' }}>{item}</li>
          ))}
        </ul>
      </Modal>

      {/* 3. Trip Information Modal */}
      <Modal
        isOpen={modalOpen === 'info'}
        onClose={actions.closeModal}
        title="Trip Information"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
          {offer?.informationList?.map((item) => (
            <div key={item.id} style={{ borderBottom: '1px dashed #dfdfdf', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#575757', textTransform: 'uppercase', fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                {item.label}
              </span>
              <span style={{ color: '#17171a', fontWeight: '500' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* 4. Full Itinerary Modal */}
      <Modal
        isOpen={modalOpen === 'itinerary'}
        onClose={actions.closeModal}
        title="Your Full Itinerary"
      >
        <div className="itinerary-timeline" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="itinerary-line"></div>
          {receipt?.itinerary?.events.map((event, idx) => {
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
                  {comp.type === 'accommodation' && comp.unit && (
                    <div className="itinerary-event-sublabel">
                      {comp.unit.name} · {comp.board?.name || 'Meal plan'}
                      <div style={{ fontSize: '11px', color: '#8b8b8b', marginTop: '2px' }}>
                        Stay: {comp.stayNights} nights · Check-in: {comp.checkinDate} · Check-out: {comp.checkoutDate}
                      </div>
                    </div>
                  )}
                  {comp.type === 'flight' && (
                    <div className="itinerary-event-sublabel">
                      Flight Code: {comp.flightCode} · Cabin: {comp.cabinClass}
                      <div style={{ fontSize: '11px', color: '#8b8b8b', marginTop: '2px' }}>
                        Route: {comp.departureCity} ({comp.departureAirport}) → {comp.arrivalCity} ({comp.arrivalAirport})
                      </div>
                    </div>
                  )}
                  {comp.type === 'car' && (
                    <div className="itinerary-event-sublabel">
                      Specs: Pickup at {comp.pickupLocation} · Dropoff at {comp.dropoffLocation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

export default function ClientPage({ offerId }: { offerId: string }) {
  return (
    <BookingProvider offerId={offerId}>
      <MainLayout />
    </BookingProvider>
  );
}
