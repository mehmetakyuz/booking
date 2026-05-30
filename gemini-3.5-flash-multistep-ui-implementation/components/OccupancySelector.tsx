'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBooking } from '@/lib/state';

export default function OccupancySelector() {
  const { state, actions } = useBooking();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rules = state.offer?.occupancyRules || {
    minAdults: 1,
    maxAdults: 4,
    minChildren: 0,
    maxChildren: 3,
    maxTravellers: 6
  };

  // Derive initial local counts from payload
  const currentAdults = state.payload.groups.find(g => g.type === 'ADULT')?.passengerIndices.length || 2;
  const currentChildGroups = state.payload.groups.filter(g => g.type === 'CHILD');
  const currentChildren = currentChildGroups.length;
  const currentChildAges = currentChildGroups.map(g => g.age || 0);

  // Local state for edits
  const [adults, setAdults] = useState(currentAdults);
  const [children, setChildren] = useState(currentChildren);
  const [childAges, setChildAges] = useState<number[]>(currentChildAges);

  // Sync state if payload changes externally (e.g. url restore)
  useEffect(() => {
    setAdults(currentAdults);
    setChildren(currentChildren);
    setChildAges(currentChildAges);
  }, [state.payload.groups]);

  // Click outside to close without applying
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset local state to current payload
        setAdults(currentAdults);
        setChildren(currentChildren);
        setChildAges(currentChildAges);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentAdults, currentChildren, currentChildAges]);

  const handleAdultChange = (delta: number) => {
    const newVal = adults + delta;
    const totalTravellers = newVal + children;
    if (newVal >= rules.minAdults && newVal <= rules.maxAdults && totalTravellers <= rules.maxTravellers) {
      setAdults(newVal);
    }
  };

  const handleChildChange = (delta: number) => {
    const newVal = children + delta;
    const totalTravellers = adults + newVal;
    if (newVal >= rules.minChildren && newVal <= rules.maxChildren && totalTravellers <= rules.maxTravellers) {
      setChildren(newVal);
      if (delta > 0) {
        setChildAges([...childAges, 6]); // default age 6
      } else {
        setChildAges(childAges.slice(0, -1));
      }
    }
  };

  const handleChildAgeChange = (idx: number, age: number) => {
    const updated = [...childAges];
    updated[idx] = age;
    setChildAges(updated);
  };

  const handleApply = async () => {
    await actions.setPartyComposition(adults, childAges);
    setIsOpen(false);
  };

  const displayLabel = () => {
    let label = `${currentAdults} adult${currentAdults > 1 ? 's' : ''}`;
    if (currentChildren > 0) {
      label += `, ${currentChildren} child${currentChildren > 1 ? 'ren' : ''}`;
    }
    return label;
  };

  return (
    <div className="dropdown-wrapper" ref={containerRef}>
      <div className="form-label">Travellers</div>
      <div
        className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ userSelect: 'none' }}
      >
        <span>{displayLabel()}</span>
        <span className="dropdown-arrow"></span>
      </div>

      {isOpen && (
        <div
          className="dropdown-panel"
          style={{
            padding: '16px',
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Adults Stepper */}
          <div className="stepper-row">
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Adults</div>
              <div style={{ fontSize: '11px', color: '#8b8b8b' }}>Ages 18+</div>
            </div>
            <div className="stepper-controls">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleAdultChange(-1)}
                disabled={adults <= rules.minAdults}
              >
                -
              </button>
              <span className="stepper-val">{adults}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleAdultChange(1)}
                disabled={adults >= rules.maxAdults || adults + children >= rules.maxTravellers}
              >
                +
              </button>
            </div>
          </div>

          {/* Children Stepper */}
          <div className="stepper-row">
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Children</div>
              <div style={{ fontSize: '11px', color: '#8b8b8b' }}>Ages 0-17</div>
            </div>
            <div className="stepper-controls">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleChildChange(-1)}
                disabled={children <= rules.minChildren}
              >
                -
              </button>
              <span className="stepper-val">{children}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleChildChange(1)}
                disabled={children >= rules.maxChildren || adults + children >= rules.maxTravellers}
              >
                +
              </button>
            </div>
          </div>

          {/* Child Ages selectors */}
          {children > 0 && (
            <div className="child-ages-container">
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#575757' }}>Child Ages</div>
              <div className="child-age-select-grid">
                {childAges.map((age, idx) => (
                  <div key={idx} className="child-age-select-item">
                    <span style={{ fontSize: '10px', color: '#8b8b8b' }}>Child {idx + 1}</span>
                    <select
                      className="child-age-select"
                      value={age}
                      onChange={(e) => handleChildAgeChange(idx, parseInt(e.target.value))}
                    >
                      {Array.from({ length: 18 }).map((_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apply Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApply}
            style={{ width: '100%', marginTop: '4px', padding: '8px 12px', fontSize: '12px' }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
