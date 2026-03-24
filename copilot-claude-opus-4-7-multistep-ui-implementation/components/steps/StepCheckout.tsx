"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useBooking } from "../BookingContext";
import { formatPrice } from "@/lib/payload";
import { createOrder } from "@/lib/api";
import type { PersonInput } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  birthDate: "Date of birth",
  gender: "Gender",
  nationality: "Nationality",
  country: "Country",
  idType: "ID type",
  idNumber: "ID number",
  idValidity: "ID valid until",
  idIssuingCountry: "ID issuing country",
  streetNumber: "Address",
  zipcode: "Postcode",
  city: "City",
};

function Field({ name, value, onChange, countries }: {
  name: string; value: string; onChange: (v: string) => void;
  countries: { code: string; name: string }[];
}) {
  const label = FIELD_LABELS[name] || name;
  let type = "text";
  if (name === "email") type = "email";
  else if (name === "phone") type = "tel";
  else if (name === "birthDate" || name === "idValidity") type = "date";

  if (name === "nationality" || name === "country" || name === "idIssuingCountry") {
    return (
      <label className="form-field">
        <span>{label}</span>
        <select value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Select…</option>
          {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>
    );
  }
  if (name === "gender") {
    return (
      <label className="form-field">
        <span>{label}</span>
        <select value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Select…</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </label>
    );
  }
  if (name === "idType") {
    return (
      <label className="form-field">
        <span>{label}</span>
        <select value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Select…</option>
          <option value="PASSPORT">Passport</option>
          <option value="ID_CARD">ID card</option>
          <option value="DRIVERS_LICENSE">Driver's licence</option>
        </select>
      </label>
    );
  }
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required />
    </label>
  );
}

function PersonForm({ title, fields, value, onChange, countries }: {
  title: string; fields: string[]; value: PersonInput; onChange: (p: PersonInput) => void;
  countries: { code: string; name: string }[];
}) {
  return (
    <div className="person-form">
      <h3 className="person-form-title">{title}</h3>
      <div className="person-form-grid">
        {fields.map(f => (
          <Field
            key={f}
            name={f}
            value={(value as any)[f] || ""}
            onChange={v => onChange({ ...value, [f]: v })}
            countries={countries}
          />
        ))}
      </div>
    </div>
  );
}

export function StepCheckout() {
  const { state, setInstalments, setPaymentMethod, goBack, dispatch } = useBooking();
  const meta = state.checkoutMeta;
  const receipt = state.receipt;
  const [customer, setCustomer] = useState<PersonInput>(state.payload.customer || {});
  const [participants, setParticipants] = useState<PersonInput[]>(state.payload.people);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setParticipants(state.payload.people); }, [state.payload.people]);

  const selectedPlan = useMemo(() => {
    if (!receipt?.instalmentsPayments?.length) return null;
    const idx = Math.max(0, (state.payload.numOfInstalments || 1) - 1);
    return receipt.instalmentsPayments[Math.min(idx, receipt.instalmentsPayments.length - 1)];
  }, [receipt, state.payload.numOfInstalments]);

  if (state.checkoutMetaLoading || !meta || !receipt) {
    return <div className="step"><div className="loader">Preparing your booking…</div></div>;
  }

  const customerFields = meta.customerSalesflowDisplayFields?.length ? meta.customerSalesflowDisplayFields : ["firstName", "lastName", "email", "phone"];
  const participantFields = meta.participantSalesflowDisplayFields?.length ? meta.participantSalesflowDisplayFields : ["firstName", "lastName"];
  const adultCount = state.payload.people.filter(p => p.age == null).length;

  const onSubmit = async () => {
    setError(null);
    if (!accepted) { setError("Please accept the terms & conditions."); return; }
    setSubmitting(true);
    try {
      const payload = { ...state.payload, customer, people: participants };
      dispatch({ type: "patch-payload", patch: { customer, people: participants } });
      const result = await createOrder(payload, receipt.totalPrice, []);
      if (result.errors && result.errors.length) {
        setError(result.errors.map((e: any) => e.message).join("; "));
        setSubmitting(false);
        return;
      }
      if (result.continueUrl) {
        window.location.href = result.continueUrl;
      } else {
        setError("Payment could not be initiated.");
        setSubmitting(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSubmitting(false);
    }
  };

  const paymentMethods = meta.paymentMethods.length ? meta.paymentMethods : receipt.paymentMethods;
  const maxInstalments = meta.maxNrOfInstalments || 1;

  return (
    <div className="step step-checkout">
      <h1 className="step-title">Confirm & pay</h1>
      <p className="step-lede">Almost there — just your details and payment.</p>

      <section className="checkout-section">
        <PersonForm
          title="Lead traveller"
          fields={customerFields}
          value={customer}
          onChange={setCustomer}
          countries={meta.countries}
        />
      </section>

      {participantFields.length > 0 && (
        <section className="checkout-section">
          <h2 className="section-title">Traveller details</h2>
          {participants.map((p, i) => (
            <PersonForm
              key={i}
              title={p.age == null ? `Adult ${i + 1}` : `Child (age ${p.age})`}
              fields={participantFields}
              value={p}
              onChange={updated => setParticipants(list => list.map((x, j) => j === i ? { ...updated, age: x.age } : x))}
              countries={meta.countries}
            />
          ))}
          {adultCount === 0 && <p>No adult passengers required.</p>}
        </section>
      )}

      {maxInstalments > 1 && (
        <section className="checkout-section">
          <h2 className="section-title">Payment schedule</h2>
          <div className="chip-row">
            {Array.from({ length: maxInstalments }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                className={`chip ${(state.payload.numOfInstalments || 1) === n ? "active" : ""}`}
                onClick={() => void setInstalments(n)}
              >{n === 1 ? "Pay in full" : `${n} instalments`}</button>
            ))}
          </div>
          {selectedPlan && selectedPlan.length > 0 && (
            <div className="instalment-schedule">
              {selectedPlan.map((p, i) => (
                <div className="instalment-row" key={i}>
                  <span>{i === 0 ? "Due now" : (p.payBeforeDate || `Payment ${i + 1}`)}</span>
                  <span>{formatPrice(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="checkout-section">
        <h2 className="section-title">Payment method</h2>
        <div className="payment-method-list">
          {paymentMethods.map(pm => (
            <label key={pm.id} className={`payment-method ${state.payload.paymentMethod === pm.id ? "active" : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value={pm.id}
                checked={state.payload.paymentMethod === pm.id}
                onChange={() => setPaymentMethod(pm.id)}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {pm.image?.url && <img src={pm.image.url} alt={pm.name} className="payment-method-logo" />}
              <div>
                <div className="payment-method-name">{pm.name}</div>
                {pm.shortDescription && <div className="payment-method-desc">{pm.shortDescription}</div>}
              </div>
            </label>
          ))}
        </div>
      </section>

      {meta.termsMarkdown && (
        <section className="checkout-section terms">
          <h2 className="section-title">Terms & conditions</h2>
          <div className="markdown-box">
            <ReactMarkdown>{meta.termsMarkdown}</ReactMarkdown>
          </div>
        </section>
      )}
      {meta.euDirectiveText && (
        <section className="checkout-section terms">
          <div className="markdown-box" dangerouslySetInnerHTML={{ __html: meta.euDirectiveText }} />
        </section>
      )}

      <label className="checkbox-row">
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
        <span>I've read and accept the terms & conditions.</span>
      </label>

      {error && <div className="checkout-error">{error}</div>}

      <div className="step-footer">
        <button type="button" className="btn btn-ghost" onClick={goBack}>← Back</button>
        <button type="button" className="btn btn-primary btn-large" onClick={onSubmit} disabled={submitting || !accepted}>
          {submitting ? "Processing…" : `Pay ${formatPrice(receipt.totalPrice)}`}
        </button>
      </div>
    </div>
  );
}
