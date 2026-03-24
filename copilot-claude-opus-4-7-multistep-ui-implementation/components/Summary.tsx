"use client";

import { useMemo, useState } from "react";
import { useBooking } from "./BookingContext";
import { formatPrice } from "@/lib/payload";
import type { ItineraryComponent, ReceiptLine } from "@/lib/types";
import { Modal } from "./Modal";
import { itineraryIconFor } from "./icons/Icons";

function formatDatePart(dateStr: string | null | undefined): { day: string; month: string; year: string; weekday: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: String(d.getUTCDate()),
    month: d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }),
    year: String(d.getUTCFullYear()),
    weekday: d.toLocaleString("en-GB", { weekday: "short", timeZone: "UTC" }),
  };
}

function ReceiptLineRow({ line }: { line: ReceiptLine }) {
  if (line.__typename === "ReceiptLineText") {
    return <div className="receipt-line-text">{line.text || line.label}</div>;
  }
  const sibling = line.format === "SIBLING";
  const important = line.format === "IMPORTANT";
  return (
    <div className={["receipt-line", sibling && "receipt-line--sibling", important && "receipt-line--important"].filter(Boolean).join(" ")}>
      <span className="receipt-line-label">{line.label}</span>
      {line.__typename === "ReceiptLineAmount" && line.amount != null && (
        <span className="receipt-line-amount">{formatPrice(line.amount)}</span>
      )}
    </div>
  );
}

function ItineraryComponentRow({ c }: { c: ItineraryComponent }) {
  const Icon = itineraryIconFor(c.type);
  const label = c.type === "activity" && c.label ? c.label : c.label;
  let sub = c.sublabel ?? undefined;
  if (c.type === "accommodation" && c.checkinDate && c.checkoutDate) {
    sub = `${c.checkinDate} → ${c.checkoutDate}${c.stayNights ? ` · ${c.stayNights} nights` : ""}`;
  }
  if (c.type === "flight" && c.leg?.segments?.length) {
    const first = c.leg.segments[0];
    const last = c.leg.segments[c.leg.segments.length - 1];
    sub = `${first.departure?.airport.iataCode} → ${last.arrival?.airport.iataCode}`;
  }
  return (
    <div className="itinerary-component">
      <Icon className="itinerary-component-icon" />
      <div className="itinerary-component-detail">
        <div className="itinerary-component-label">{label || c.type}</div>
        {sub && <div className="itinerary-component-sublabel">{sub}</div>}
      </div>
    </div>
  );
}

export function Summary() {
  const { state } = useBooking();
  const { offer, receipt, receiptLoading, receiptError } = state;
  const [modal, setModal] = useState<null | "included" | "excluded" | "info" | "itinerary">(null);

  if (!offer) return null;

  const start = formatDatePart(receipt?.startDate);
  const end = formatDatePart(receipt?.endDate);

  const itineraryPreview = useMemo(() => {
    if (!receipt) return [];
    return receipt.itinerary.slice(0, 3);
  }, [receipt]);

  const instalmentsPlanCount = receipt?.instalmentsPayments?.length ?? 0;
  void instalmentsPlanCount;

  return (
    <aside className="summary">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {offer.image?.url && <img className="summary-image" src={offer.image.url} alt={offer.title} />}
      <div className="summary-body">
        <h2 className="summary-title">{offer.shortTitle || offer.title}</h2>
        {offer.destination && <div className="summary-location">{offer.destination}</div>}

        <div className="summary-actions">
          {offer.includedList && offer.includedList.length > 0 && (
            <button className="link-button" type="button" onClick={() => setModal("included")}>What's included</button>
          )}
          {offer.excludedList && offer.excludedList.length > 0 && (
            <button className="link-button" type="button" onClick={() => setModal("excluded")}>What's excluded</button>
          )}
          {offer.informationList && offer.informationList.length > 0 && (
            <button className="link-button" type="button" onClick={() => setModal("info")}>Trip information</button>
          )}
        </div>

        {start && end && (
          <div className="summary-date">
            <div className="summary-date-col">
              <span className="summary-date-day">{start.day}</span>
              <span className="summary-date-monthyear">{start.month} {start.year}</span>
              <span className="summary-date-weekday">{start.weekday}</span>
            </div>
            <span className="summary-date-arrow" aria-hidden>→</span>
            <div className="summary-date-col">
              <span className="summary-date-day">{end.day}</span>
              <span className="summary-date-monthyear">{end.month} {end.year}</span>
              <span className="summary-date-weekday">{end.weekday}</span>
            </div>
            {receipt?.nights != null && <span className="summary-nights">{receipt.nights} nights</span>}
          </div>
        )}

        <div className="receipt-panel">
          {receiptLoading && (
            <div className="receipt-loading-overlay"><div className="loader-spinner" /></div>
          )}
          {receiptError && (
            <div className="receipt-errors">
              <div className="receipt-error">{receiptError}</div>
            </div>
          )}
          {!receipt && !receiptLoading && !receiptError && (
            <div className="receipt-placeholder">Select your dates to see a live price.</div>
          )}
          {receipt && (
            <>
              <div className="receipt-lines">
                {receipt.lines.map((l, i) => <ReceiptLineRow key={i} line={l} />)}
              </div>
              <div className="receipt-total">
                <span className="receipt-total-label">Total</span>
                <span className="receipt-total-prices">
                  {receipt.oldPrice && receipt.oldPrice !== receipt.totalPrice && (
                    <span className="receipt-total-old">{formatPrice(receipt.oldPrice)}</span>
                  )}
                  <span className="receipt-total-price">{formatPrice(receipt.totalPrice)}</span>
                </span>
              </div>
              {itineraryPreview.length > 0 && (
                <div className="receipt-itinerary-preview">
                  <div className="itinerary-timeline">
                    {itineraryPreview.map((ev, i) => (
                      <div className="itinerary-preview-row" key={i}>
                        <div className="itinerary-preview-date">{ev.date || ev.sublabel}</div>
                        <div className="itinerary-preview-label">
                          <span className="itinerary-preview-icons">
                            {ev.components.slice(0, 3).map((c, j) => {
                              const Icon = itineraryIconFor(c.type);
                              return <Icon className="itinerary-preview-icon" key={j} />;
                            })}
                          </span>
                          {ev.components[0]?.label || ev.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="summary-preview-link">
                    <button className="link-button" type="button" onClick={() => setModal("itinerary")}>View full itinerary</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modal === "included" && (
        <Modal title="What's included" onClose={() => setModal(null)}>
          <ul className="modal-bullet-list">
            {(offer.includedList || []).map((it, i) => (
              <li key={i}>
                <strong>{it.name}</strong>
                {it.description && <div>{it.description}</div>}
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {modal === "excluded" && (
        <Modal title="What's excluded" onClose={() => setModal(null)}>
          <ul className="modal-bullet-list">
            {(offer.excludedList || []).map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </Modal>
      )}
      {modal === "info" && (
        <Modal title="Trip information" onClose={() => setModal(null)}>
          <ul className="modal-info-list">
            {(offer.informationList || []).map((it, i) => (
              <li className="modal-info-item" key={i}>
                <div className="modal-info-label">{it.name}</div>
                <div className="modal-info-value" dangerouslySetInnerHTML={{ __html: it.description }} />
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {modal === "itinerary" && receipt && (
        <Modal title="Full itinerary" onClose={() => setModal(null)}>
          <div className="modal-itinerary">
            {receipt.itinerary.map((ev, i) => (
              <div className="itinerary-event" key={i}>
                <div className="itinerary-event-date">{ev.date}</div>
                {ev.label && <div className="itinerary-event-label">{ev.label}</div>}
                <div className="itinerary-event-components">
                  {ev.components.map((c, j) => <ItineraryComponentRow key={j} c={c} />)}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </aside>
  );
}
