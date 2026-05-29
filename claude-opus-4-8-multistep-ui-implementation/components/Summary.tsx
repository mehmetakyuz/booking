"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, MapPin } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import Modal from "./Modal";
import { ItineraryFull } from "./Itinerary";
import { ReceiptLine } from "@/lib/booking/types";

function DateBlock({
  start,
  end,
}: {
  start?: string;
  end?: string;
}) {
  if (!start || !end) return null;
  const fmt = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return {
      day: date.getDate(),
      my: date.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      wd: date.toLocaleDateString("en-GB", { weekday: "long" }),
    };
  };
  const s = fmt(start);
  const e = fmt(end);
  return (
    <div className="date-block">
      <div className="date-block-side">
        <div className="date-block-day">{s.day}</div>
        <div className="date-block-my">{s.my}</div>
        <div className="date-block-wd">{s.wd}</div>
      </div>
      <ArrowRight className="date-block-arrow" size={20} />
      <div className="date-block-side">
        <div className="date-block-day">{e.day}</div>
        <div className="date-block-my">{e.my}</div>
        <div className="date-block-wd">{e.wd}</div>
      </div>
    </div>
  );
}

function PriceLine({ line, currency }: { line: ReceiptLine; currency: string }) {
  if (line.kind === "amount") {
    return (
      <div className="receipt-line">
        <span className="receipt-line-label">{line.label}</span>
        <span className="receipt-line-amount">
          {formatMoney(line.amount ?? 0, currency)}
        </span>
      </div>
    );
  }
  // Descriptive sibling / text rows.
  return (
    <div className="receipt-line receipt-line--sibling">
      <span className="receipt-line-label">{line.label || line.text}</span>
    </div>
  );
}

export default function Summary({ variant }: { variant?: "drawer" }) {
  const { state } = useBooking();
  const { offerMeta, receipt, receiptLoading, receiptError } = state;
  const currency = offerMeta?.currency ?? "GBP";

  const [modal, setModal] = useState<
    null | "included" | "excluded" | "info"
  >(null);

  if (!offerMeta) return null;

  return (
    <div className={`summary${variant === "drawer" ? " summary--drawer" : ""}`}>
      {offerMeta.image ? (
        <div className="summary-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={offerMeta.image} alt={offerMeta.shortTitle} />
        </div>
      ) : null}

      <div className="summary-content">
        <h2 className="summary-title">{offerMeta.shortTitle}</h2>
        {offerMeta.location ? (
          <div className="summary-location">
            <MapPin size={14} /> {offerMeta.location}
          </div>
        ) : null}

        <div className="summary-actions">
          {offerMeta.includedList.length ? (
            <button className="link-action" onClick={() => setModal("included")}>
              What&rsquo;s included
            </button>
          ) : null}
          {offerMeta.excludedList.length ? (
            <button className="link-action" onClick={() => setModal("excluded")}>
              What&rsquo;s excluded
            </button>
          ) : null}
          {offerMeta.informationList.length ? (
            <button className="link-action" onClick={() => setModal("info")}>
              Trip information
            </button>
          ) : null}
        </div>

        {receiptError ? (
          <div className="summary-error">
            <AlertCircle size={16} />
            <span>{receiptError}</span>
          </div>
        ) : null}

        {receipt && receipt.startDate && receipt.endDate ? (
          <DateBlock start={receipt.startDate} end={receipt.endDate} />
        ) : null}

        <div className={`summary-receipt${receiptLoading ? " is-loading" : ""}`}>
          {receiptLoading ? (
            <div className="receipt-overlay">
              <span className="spinner" />
            </div>
          ) : null}

          {receipt ? (
            <>
              <div className="receipt-lines">
                {receipt.lines.map((line, i) => (
                  <PriceLine key={i} line={line} currency={currency} />
                ))}
              </div>

              {receipt.events.length ? (
                <div
                  className={`summary-itinerary${
                    variant === "drawer" ? "" : " summary-itinerary--scroll"
                  }`}
                >
                  <div className="summary-itinerary-head">Your itinerary</div>
                  <ItineraryFull events={receipt.events} />
                </div>
              ) : null}

              <div className="receipt-total">
                <span>Total</span>
                <span className="receipt-total-amount">
                  {formatMoney(receipt.totalPrice, currency)}
                </span>
              </div>
            </>
          ) : (
            <p className="muted summary-empty">
              Choose your dates to see live pricing.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={modal === "included"}
        onClose={() => setModal(null)}
        title="What's included"
      >
        <ul className="info-list">
          {offerMeta.includedList.map((item, i) => (
            <li key={i}>
              <strong>{item.name}</strong>
              {item.description ? <p>{item.description}</p> : null}
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={modal === "excluded"}
        onClose={() => setModal(null)}
        title="What's excluded"
      >
        <ul className="info-list">
          {offerMeta.excludedList.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={modal === "info"}
        onClose={() => setModal(null)}
        title="Trip information"
      >
        <div className="info-blocks">
          {offerMeta.informationList.map((item) => (
            <div key={item.id} className="info-block">
              <h3>{item.label}</h3>
              <div
                className="info-html"
                dangerouslySetInnerHTML={{ __html: item.value }}
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
