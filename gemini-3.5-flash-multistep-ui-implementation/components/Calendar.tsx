'use client';

import React, { useState, useEffect } from 'react';
import { useBooking } from '@/lib/state';
import { formatMoney } from '@/lib/utils';
import { CalendarDate, CalendarMonth } from '@/lib/types';

export default function Calendar() {
  const { state, actions } = useBooking();
  const { calendar, payload, offer } = state;

  const [currentMonthIdx, setCurrentMonthIdx] = useState(0);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const months: CalendarMonth[] = calendar?.months || [];
  const activeMonth = months[currentMonthIdx];

  // Sync month index to selected date if restored
  useEffect(() => {
    if (payload.selectedDate && months.length > 0) {
      const selectedMonth = new Date(payload.selectedDate).getMonth();
      const selectedYear = new Date(payload.selectedDate).getFullYear();
      const idx = months.findIndex(m => {
        // Simple name mapping or date check
        const d = m.dates[0] ? new Date(m.dates[0].date) : null;
        return d && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
      if (idx !== -1) {
        setCurrentMonthIdx(idx);
      }
    }
  }, [payload.selectedDate, months]);

  if (!activeMonth || activeMonth.dates.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: '#8b8b8b' }}>
        No calendar dates available.
      </div>
    );
  }

  // Find the startDate details if selected
  const isFlexible = payload.nights === null; // Null means "All nights" flexible
  const startDate = payload.selectedDate;

  // Locate the actual CalendarDate object for selected startDate
  let startDateObj: CalendarDate | null = null;
  if (startDate) {
    for (const m of months) {
      const found = m.dates.find(d => d.date === startDate);
      if (found) {
        startDateObj = found;
        break;
      }
    }
  }

  // Determine if a date is selected, in-range, or checkout candidate
  const getDateState = (dStr: string) => {
    const isStart = dStr === startDate;
    
    // For flexible checkout dates
    let isCheckoutCandidate = false;
    let priceDelta: number | null = null;
    let checkoutNightsValue: number | null = null;

    if (isFlexible && startDate && startDateObj) {
      const startT = new Date(startDate).getTime();
      const currentT = new Date(dStr).getTime();
      const diffDays = Math.round((currentT - startT) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        const match = startDateObj.nights?.find(n => n.nights === diffDays);
        if (match) {
          isCheckoutCandidate = true;
          priceDelta = match.price - startDateObj.price;
          checkoutNightsValue = diffDays;
        }
      }
    }

    // Determine check-out end date
    const isEnd = !isFlexible && startDate && payload.nights
      ? (() => {
          const d = new Date(startDate);
          d.setDate(d.getDate() + payload.nights);
          return d.toISOString().split('T')[0] === dStr;
        })()
      : false;

    // Check if in range
    const isInRange = !isFlexible && startDate && payload.nights
      ? (() => {
          const startT = new Date(startDate).getTime();
          const currentT = new Date(dStr).getTime();
          const d = new Date(startDate);
          d.setDate(d.getDate() + payload.nights);
          const endT = d.getTime();
          return currentT > startT && currentT < endT;
        })()
      : false;

    return {
      isStart,
      isEnd,
      isInRange,
      isCheckoutCandidate,
      priceDelta,
      checkoutNightsValue
    };
  };

  // Generate calendar grid cells (including empty padding for start of month)
  const firstDateStr = activeMonth.dates[0].date;
  const firstDate = new Date(firstDateStr);
  const startDayOfWeek = firstDate.getDay(); // 0 is Sunday, 1 is Monday...

  const handlePrevMonth = () => {
    if (currentMonthIdx > 0) setCurrentMonthIdx(currentMonthIdx - 1);
  };

  const handleNextMonth = () => {
    if (currentMonthIdx < months.length - 1) setCurrentMonthIdx(currentMonthIdx + 1);
  };

  const handleDateClick = async (calDate: CalendarDate) => {
    if (!calDate.available) return;

    if (isFlexible) {
      // Flexible nights mode
      if (!startDate) {
        // Step 1: select check-in
        await actions.selectDate(calDate.date, null);
      } else {
        // Step 2: select check-out candidate
        const { isCheckoutCandidate, checkoutNightsValue } = getDateState(calDate.date);
        if (isCheckoutCandidate && checkoutNightsValue) {
          await actions.selectDate(startDate, checkoutNightsValue);
        } else {
          // If clicked non-checkout date or same date, reset or start new
          await actions.selectDate(calDate.date, null);
        }
      }
    } else {
      // Fixed nights mode
      await actions.selectDate(calDate.date, payload.nights);
    }
  };

  const handleClear = async () => {
    await actions.clearDatesSelection();
  };

  // Check if calendar click hits background to reset flexible mode
  const handleCalendarContainerClick = (e: React.MouseEvent) => {
    if (isFlexible && startDate && e.target === e.currentTarget) {
      actions.clearDatesSelection();
    }
  };

  // Weekday labels
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      className="calendar-container"
      onClick={handleCalendarContainerClick}
      style={{ userSelect: 'none', padding: '16px 0' }}
    >
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-chevron"
          onClick={handlePrevMonth}
          disabled={currentMonthIdx === 0}
        >
          ‹
        </button>
        <span className="calendar-month-label">
          {activeMonth.name} {activeMonth.year}
        </span>
        <button
          type="button"
          className="calendar-chevron"
          onClick={handleNextMonth}
          disabled={currentMonthIdx === months.length - 1}
        >
          ›
        </button>
      </div>

      <div className="calendar-weekdays">
        {weekdays.map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {/* Render empty padded cells */}
        {Array.from({ length: startDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="calendar-day-cell disabled" style={{ visibility: 'hidden' }} />
        ))}

        {/* Render actual days */}
        {activeMonth.dates.map((calDate) => {
          const {
            isStart,
            isEnd,
            isInRange,
            isCheckoutCandidate,
            priceDelta,
            checkoutNightsValue
          } = getDateState(calDate.date);

          const dateObj = new Date(calDate.date);
          const dayNum = dateObj.getDate();

          let cellClass = 'calendar-day-cell';
          let isDisabled = !calDate.available;
          
          if (isStart || isEnd) {
            cellClass += ' selected';
          } else if (isInRange) {
            cellClass += ' in-range';
          }

          // In flexible mode, if start is selected, anything that is NOT start and NOT checkout candidate is disabled
          if (isFlexible && startDate) {
            if (!isStart && !isCheckoutCandidate) {
              isDisabled = true;
            }
          }

          if (isDisabled) {
            cellClass += ' disabled';
          }

          // Tooltip checks
          const isHovered = hoveredDate === calDate.date;
          const showTooltip = isHovered && !isDisabled && (isStart || (isFlexible && isCheckoutCandidate));
          const tooltipText = isStart ? 'Check-in' : 'Check-out';

          return (
            <button
              key={calDate.date}
              type="button"
              className={cellClass}
              disabled={isDisabled}
              onClick={() => handleDateClick(calDate)}
              onMouseEnter={() => setHoveredDate(calDate.date)}
              onMouseLeave={() => setHoveredDate(null)}
              style={{ position: 'relative' }}
            >
              <span>{dayNum}</span>
              
              {/* Display price tags */}
              {!isDisabled && !isStart && !isEnd && (
                <span className="calendar-day-price">
                  {isFlexible && startDate && priceDelta !== null ? (
                    priceDelta >= 0
                      ? `+${formatMoney(priceDelta, offer?.currency || 'GBP')}`
                      : `-${formatMoney(Math.abs(priceDelta), offer?.currency || 'GBP')}`
                  ) : (
                    formatMoney(calDate.price, offer?.currency || 'GBP')
                  )}
                </span>
              )}

              {/* Lightweight tooltip for checkin/checkout roles */}
              {showTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%) translateY(-4px)',
                    backgroundColor: '#17171a',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                  }}
                >
                  {tooltipText}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Clear selection sitting underneath the calendar */}
      {startDate && (
        <div className="clear-selection-container">
          <button type="button" className="btn btn-tertiary" onClick={handleClear} style={{ fontSize: '12px' }}>
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
