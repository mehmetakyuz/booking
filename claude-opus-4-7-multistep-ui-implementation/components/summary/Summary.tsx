"use client";

import { ArrowRight, Info, MapPin, X } from "lucide-react";
import { useState } from "react";
import { useBooking } from "@/lib/booking/context";
import { dateParts, formatMoney } from "@/lib/booking/format";
import { ReceiptData } from "@/lib/booking/types";
import { Modal } from "@/components/ui/Modal";
import { LoadingOverlay } from "@/components/ui/Spinner";
import { ItineraryTimeline } from "./ItineraryTimeline";

type InfoModal = "included" | "excluded" | "trip" | "itinerary" | null;

function DateBlock({ receipt }: { receipt: ReceiptData }) {
  const start = dateParts(receipt.startDate);
  const end = dateParts(receipt.endDate);
  if (!start || !end) return null;
  return (
    <div className="date-block">
      <div className="date-block__col">
        <div className="date-block__day">{start.day}</div>
        <div className="date-block__my">
          {start.month} {start.year}
        </div>
        <div className="date-block__wd">{start.weekday}</div>
      </div>
      <ArrowRight className="date-block__arrow" size={22} />
      <div className="date-block__col">
        <div className="date-block__day">{end.day}</div>
        <div className="date-block__my">
          {end.month} {end.year}
        </div>
        <div className="date-block__wd">{end.weekday}</div>
      </div>
    </div>
  );
}

export function Summary({ onCloseDrawer }: { onCloseDrawer?: () => void }) {
  const { state } = useBooking();
  const { offer, receipt, receiptLoading, receiptError } = state;
  const [modal, setModal] = useState<InfoModal>(null);
  const currency = offer.currency;

  return (
    <div className="summary relative">
      {receiptLoading && <LoadingOverlay label="Updating price…" />}

      {offer.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="summary__image" src={offer.image} alt={offer.title} />
      )}

      <div className="summary__body">
        {onCloseDrawer && (
          <button
            className="modal__close"
            onClick={onCloseDrawer}
            aria-label="Close summary"
          >
            <X size={18} />
          </button>
        )}

        <h2 className="summary__title">{offer.shortTitle || offer.title}</h2>
        {offer.location && (
          <div className="summary__location">
            <MapPin size={14} /> {offer.location}
          </div>
        )}

        <div className="summary__actions">
          {offer.included.length > 0 && (
            <button className="summary__action" onClick={() => setModal("included")}>
              <Info size={14} /> What&apos;s included
            </button>
          )}
          {offer.excluded.length > 0 && (
            <button className="summary__action" onClick={() => setModal("excluded")}>
              <Info size={14} /> What&apos;s excluded
            </button>
          )}
          {offer.informationList.length > 0 && (
            <button className="summary__action" onClick={() => setModal("trip")}>
              <Info size={14} /> Trip information
            </button>
          )}
        </div>

        {receiptError && <div className="summary-error">{receiptError}</div>}

        {receipt && receipt.startDate && <DateBlock receipt={receipt} />}

        {receipt ? (
          <>
            <div className="receipt-lines">
              {receipt.lines.map((line, i) => {
                if (line.format === "SIBLING" || line.type === "plain") {
                  return (
                    <div className="receipt-line receipt-line--sibling" key={i}>
                      <span>{line.label}</span>
                    </div>
                  );
                }
                if (line.type === "text") {
                  return (
                    <div className="receipt-line" key={i}>
                      <span>{line.label}</span>
                      <span>{line.text}</span>
                    </div>
                  );
                }
                return (
                  <div className="receipt-line" key={i}>
                    <span>{line.label}</span>
                    <span className="receipt-line__amount">
                      {formatMoney(line.amount ?? 0, currency)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="receipt-total">
              <span className="receipt-total__label">Booking total</span>
              <span>
                {receipt.oldPrice ? (
                  <span className="receipt-old">
                    {formatMoney(receipt.oldPrice, currency)}
                  </span>
                ) : null}
                <span className="receipt-total__value">
                  {formatMoney(receipt.totalPrice, currency)}
                </span>
              </span>
            </div>

            {receipt.events.length > 0 && (
              <>
                <ItineraryTimeline events={receipt.events} limit={3} />
                <button
                  className="btn btn--tertiary itinerary-preview-link"
                  onClick={() => setModal("itinerary")}
                >
                  View full itinerary
                </button>
              </>
            )}
          </>
        ) : (
          !receiptLoading && (
            <p style={{ color: "var(--grey-dark)", fontSize: 14 }}>
              Choose your travel dates to see your live price.
            </p>
          )
        )}
      </div>

      {modal === "included" && (
        <Modal title="What's included" onClose={() => setModal(null)}>
          {offer.included.map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <strong>{s.name}</strong>
              {s.description && (
                <p style={{ margin: "4px 0 0", color: "var(--grey-darkest)", fontSize: 14 }}>
                  {s.description}
                </p>
              )}
            </div>
          ))}
        </Modal>
      )}
      {modal === "excluded" && (
        <Modal title="What's excluded" onClose={() => setModal(null)}>
          <ul style={{ paddingLeft: 18, color: "var(--grey-darkest)", fontSize: 14 }}>
            {offer.excluded.map((e, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {e.title}
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {modal === "trip" && (
        <Modal title="Trip information" onClose={() => setModal(null)}>
          {offer.informationList.map((item) => (
            <div key={item.id} style={{ marginBottom: 12 }}>
              <strong>{item.label}</strong>
              <p style={{ margin: "4px 0 0", color: "var(--grey-darkest)", fontSize: 14 }}>
                {item.value}
              </p>
            </div>
          ))}
        </Modal>
      )}
      {modal === "itinerary" && receipt && (
        <Modal title="Your itinerary" onClose={() => setModal(null)}>
          <ItineraryTimeline events={receipt.events} />
        </Modal>
      )}
    </div>
  );
}
