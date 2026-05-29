"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import { InstalmentPayment } from "@/lib/booking/types";

interface FieldDef {
  label: string;
  type: "text" | "email" | "tel" | "date" | "select";
  options?: { value: string; label: string }[];
}

const TITLE_OPTIONS = [
  { value: "MR", label: "Mr" },
  { value: "MRS", label: "Mrs" },
  { value: "MS", label: "Ms" },
  { value: "MISS", label: "Miss" },
];

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

function fieldDef(name: string, countries: { code: string; name: string }[]): FieldDef {
  switch (name) {
    case "firstName":
      return { label: "First name", type: "text" };
    case "lastName":
      return { label: "Last name", type: "text" };
    case "email":
      return { label: "Email address", type: "email" };
    case "phone":
      return { label: "Phone number", type: "tel" };
    case "birthDate":
      return { label: "Date of birth", type: "date" };
    case "title":
      return { label: "Title", type: "select", options: TITLE_OPTIONS };
    case "gender":
      return { label: "Gender", type: "select", options: GENDER_OPTIONS };
    case "nationality":
    case "country":
      return {
        label: name === "country" ? "Country" : "Nationality",
        type: "select",
        options: countries.map((c) => ({ value: c.code, label: c.name })),
      };
    default:
      return { label: name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), type: "text" };
  }
}

function formatPayDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function PaymentSchedule({
  schedule,
  currency,
}: {
  schedule: InstalmentPayment[];
  currency: string;
}) {
  if (!schedule.length) return null;
  const [dueNow, ...later] = schedule;
  return (
    <div className="pay-schedule">
      <div className="pay-row pay-row--now">
        <span>Due now</span>
        <strong>{formatMoney(dueNow.amount, currency)}</strong>
      </div>
      {later.map((p, i) => (
        <div className="pay-row" key={i}>
          <span>Due {formatPayDate(p.payBeforeDate)}</span>
          <span>{formatMoney(p.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CheckoutStep() {
  const { state, setInstalments, setLeadPassenger, submitOrder } = useBooking();
  const { checkoutMeta, checkoutLoading, receipt, payload } = state;
  const currency = state.offerMeta?.currency ?? "GBP";

  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checkoutMeta) return;
    if (paymentMethod) return;
    const def =
      checkoutMeta.paymentMethods.find((m) => m.default) ??
      checkoutMeta.paymentMethods[0];
    if (def) setPaymentMethod(def.id);
  }, [checkoutMeta, paymentMethod]);

  if (checkoutLoading || !checkoutMeta) {
    return (
      <div className="step-panel">
        <h1 className="step-title">Confirm &amp; pay</h1>
        <div className="panel-loading">
          <span className="spinner" />
          <p>Loading checkout…</p>
        </div>
      </div>
    );
  }

  const lead = payload.people[0] ?? {};
  const numInstalments = payload.numOfInstalments ?? 1;
  const scheduleIndex = Math.min(
    Math.max(numInstalments - 1, 0),
    (receipt?.instalmentsPayments.length ?? 1) - 1,
  );
  const selectedSchedule = receipt?.instalmentsPayments[scheduleIndex] ?? [];
  const maxInstalments = checkoutMeta.maxNrOfInstalments || 1;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await submitOrder({ paymentMethod: paymentMethod ?? undefined });
    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout">
      <h1 className="step-title">Confirm &amp; pay</h1>

      {/* Lead passenger */}
      <section className="checkout-section">
        <h2 className="checkout-heading">Lead passenger</h2>
        <div className="checkout-grid">
          {checkoutMeta.customerFields.map((name) => {
            const def = fieldDef(name, checkoutMeta.countries);
            const value = (lead as Record<string, unknown>)[name] ?? "";
            return (
              <label className="checkout-field" key={name}>
                <span>{def.label}</span>
                {def.type === "select" ? (
                  <select
                    value={String(value)}
                    onChange={(e) => setLeadPassenger({ [name]: e.target.value })}
                  >
                    <option value="">Select</option>
                    {def.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={def.type}
                    value={String(value)}
                    onChange={(e) => setLeadPassenger({ [name]: e.target.value })}
                  />
                )}
              </label>
            );
          })}
        </div>
        {checkoutMeta.passportRequired ? (
          <p className="checkout-note">Passport details will be required to complete your booking.</p>
        ) : null}
      </section>

      {/* Payment plan */}
      {maxInstalments > 1 ? (
        <section className="checkout-section">
          <h2 className="checkout-heading">Payment plan</h2>
          <div className="instalment-buttons">
            {Array.from({ length: maxInstalments }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`instalment-btn${numInstalments === n ? " is-selected" : ""}`}
                onClick={() => setInstalments(n)}
              >
                {n === 1 ? "Pay in full" : `${n} instalments`}
              </button>
            ))}
          </div>
          <PaymentSchedule schedule={selectedSchedule} currency={currency} />
        </section>
      ) : null}

      {/* Payment method */}
      <section className="checkout-section">
        <h2 className="checkout-heading">Payment method</h2>
        <div className="payment-methods">
          {checkoutMeta.paymentMethods.map((m) => (
            <button
              key={m.id}
              className={`payment-method${paymentMethod === m.id ? " is-selected" : ""}`}
              onClick={() => setPaymentMethod(m.id)}
            >
              {m.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.logo} alt={m.name} className="payment-logo" />
              ) : null}
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Terms */}
      {checkoutMeta.termsMarkdown ? (
        <section className="checkout-section">
          <h2 className="checkout-heading">Terms &amp; conditions</h2>
          <div className="terms-markdown">
            <ReactMarkdown>{checkoutMeta.termsMarkdown}</ReactMarkdown>
          </div>
        </section>
      ) : null}

      {checkoutMeta.euDirectiveText ? (
        <section className="checkout-section">
          <div
            className="eu-directive"
            dangerouslySetInnerHTML={{ __html: checkoutMeta.euDirectiveText }}
          />
        </section>
      ) : null}

      {error ? <div className="summary-error">{error}</div> : null}

      <div className="checkout-submit">
        <div className="checkout-total">
          <span>Total</span>
          <strong>{receipt ? formatMoney(receipt.totalPrice, currency) : "—"}</strong>
        </div>
        <button
          className="btn btn--primary btn--lg"
          disabled={submitting || !state.stayValid || !paymentMethod}
          onClick={handleSubmit}
        >
          {submitting ? "Processing…" : "Confirm and pay"}
        </button>
      </div>
    </div>
  );
}
