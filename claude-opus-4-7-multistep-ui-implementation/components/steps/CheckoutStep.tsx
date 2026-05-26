"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useBooking } from "@/lib/booking/context";
import { dateParts, formatMoney } from "@/lib/booking/format";
import { checkoutFieldMeta } from "@/lib/booking/labels";
import { Country, PersonInput } from "@/lib/booking/types";
import { LoadingBlock, Spinner } from "@/components/ui/Spinner";

function Field({
  fieldKey,
  value,
  countries,
  onChange,
}: {
  fieldKey: string;
  value: unknown;
  countries: Country[];
  onChange: (v: string) => void;
}) {
  const meta = checkoutFieldMeta(fieldKey);
  const v = (value as string) ?? "";
  const full = meta.type === "select-country" || fieldKey === "email";
  return (
    <div className={full ? "field field--full" : "field"}>
      <label>{meta.label}</label>
      {meta.type === "select-country" ? (
        <select value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      ) : meta.type === "select-gender" ? (
        <select value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      ) : (
        <input type={meta.type} value={v} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function PersonForm({
  title,
  person,
  index,
  fields,
  countries,
}: {
  title: string;
  person: PersonInput;
  index: number;
  fields: string[];
  countries: Country[];
}) {
  const { actions } = useBooking();
  return (
    <div className="checkout-section">
      <h2 className="checkout-section__title">{title}</h2>
      <div className="field-grid">
        {fields.map((f) => (
          <Field
            key={f}
            fieldKey={f}
            value={person[f]}
            countries={countries}
            onChange={(val) => actions.updatePerson(index, { [f]: val })}
          />
        ))}
      </div>
    </div>
  );
}

export function CheckoutStep() {
  const { state, actions } = useBooking();
  const { checkoutMeta, paymentMethods, paymentMethod, receipt, checkoutLoading, offer } =
    state;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checkoutMeta && !checkoutLoading) actions.loadCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checkoutLoading || !checkoutMeta) {
    return (
      <div className="step-panel">
        <LoadingBlock label="Preparing checkout…" />
      </div>
    );
  }

  const currency = offer.currency;
  const numInstalments = state.payload.numOfInstalments ?? 1;
  const schedules = receipt?.instalmentSchedules ?? [];
  const planCount = Math.max(schedules.length, checkoutMeta.maxInstalments || 1);
  const activeSchedule = schedules[numInstalments - 1] ?? schedules[0] ?? [];

  const submit = async () => {
    setError(null);
    const url = await actions.submitOrder();
    if (url) {
      window.location.href = url;
    } else {
      setError(state.receiptError ?? "We couldn't complete your booking. Please try again.");
    }
  };

  return (
    <div className="step-panel">
      <div className="step-header">
        <h1>Confirm &amp; pay</h1>
        <p>Add traveller details and choose how you&apos;d like to pay.</p>
      </div>

      <PersonForm
        title="Lead traveller"
        person={state.payload.people[0] ?? {}}
        index={0}
        fields={checkoutMeta.customerFields.length ? checkoutMeta.customerFields : ["firstName", "lastName", "email", "phone"]}
        countries={checkoutMeta.countries}
      />

      {state.payload.people.slice(1).map((p, i) =>
        checkoutMeta.participantFields.length ? (
          <PersonForm
            key={i + 1}
            title={`Traveller ${i + 2}`}
            person={p}
            index={i + 1}
            fields={checkoutMeta.participantFields}
            countries={checkoutMeta.countries}
          />
        ) : null,
      )}

      {planCount > 1 && (
        <div className="checkout-section">
          <h2 className="checkout-section__title">Payment plan</h2>
          <div className="instalment-group">
            {Array.from({ length: planCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={
                  n === numInstalments
                    ? "instalment-btn instalment-btn--selected"
                    : "instalment-btn"
                }
                onClick={() => actions.setInstalments(n)}
              >
                <div className="instalment-btn__title">
                  {n === 1 ? "Pay in full" : `${n} instalments`}
                </div>
              </button>
            ))}
          </div>

          {activeSchedule.length > 0 && (
            <div className="pay-schedule">
              {activeSchedule.map((row, i) => {
                const dp = dateParts(row.payBeforeDate);
                return (
                  <div
                    key={i}
                    className={
                      i === 0 ? "pay-schedule__row pay-schedule__row--now" : "pay-schedule__row"
                    }
                  >
                    <span>
                      {i === 0
                        ? "Due now"
                        : dp
                          ? `Due ${dp.day} ${dp.month} ${dp.year}`
                          : "Due later"}
                    </span>
                    <span>{formatMoney(row.amount, currency)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {paymentMethods.length > 0 && (
        <div className="checkout-section">
          <h2 className="checkout-section__title">Payment method</h2>
          <div className="subcard-row">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                className={
                  pm.id === paymentMethod
                    ? "payment-method payment-method--selected"
                    : "payment-method"
                }
                onClick={() => actions.setPaymentMethod(pm.id)}
              >
                {pm.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pm.logo} alt={pm.name} />
                )}
                <span>
                  <span className="subcard__name">{pm.name}</span>
                  {pm.shortDescription && (
                    <span className="subcard__desc">{pm.shortDescription}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {checkoutMeta.termsMarkdown && (
        <div className="checkout-section">
          <h2 className="checkout-section__title">Terms &amp; conditions</h2>
          <div className="markdown-content">
            <ReactMarkdown>{checkoutMeta.termsMarkdown}</ReactMarkdown>
          </div>
        </div>
      )}

      {checkoutMeta.euDirectiveText && (
        <div className="checkout-section">
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: checkoutMeta.euDirectiveText }}
          />
        </div>
      )}

      {error && <div className="summary-error">{error}</div>}

      <div className="checkout-section">
        <button
          className="btn btn--primary btn--block"
          onClick={submit}
          disabled={state.submitting || !receipt}
        >
          {state.submitting ? (
            <Spinner small />
          ) : (
            `Confirm and pay ${formatMoney(receipt?.totalPrice ?? null, currency)}`
          )}
        </button>
      </div>
    </div>
  );
}
