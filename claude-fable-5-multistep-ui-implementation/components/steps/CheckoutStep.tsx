'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useBookingActions, useBookingState } from '@/lib/store'
import { PanelLoader } from '../Loading'
import { formatDateLong, formatMoney } from '@/lib/format'
import { renderMarkdown } from '@/lib/markdown'
import type { PersonInput } from '@/lib/types'

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email address',
  phone: 'Phone number',
  gender: 'Gender',
  birthDate: 'Date of birth',
  nationality: 'Nationality',
  country: 'Country',
  city: 'City',
  zipcode: 'Postcode',
  streetNumber: 'Address',
  idNumber: 'Passport / ID number',
  idValidity: 'ID expiry date',
  idIssuingCountry: 'ID issuing country',
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

export function CheckoutStep() {
  const state = useBookingState()
  const actions = useBookingActions()
  const { checkoutMeta, checkoutMetaLoading, receipt, receiptLoading, payload, offerMeta } = state
  const currency = offerMeta?.currency ?? 'GBP'

  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    actions.ensureCheckoutMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Backend default payment method is the initial selection.
  useEffect(() => {
    if (!paymentMethod && checkoutMeta?.paymentMethods.length) {
      const def = checkoutMeta.paymentMethods.find((m) => m.default) ?? checkoutMeta.paymentMethods[0]
      setPaymentMethod(def.id)
    }
  }, [checkoutMeta, paymentMethod])

  const numOfInstalments = payload.numOfInstalments ?? 1

  const adults = useMemo(
    () => payload.people.map((p, i) => ({ person: p, index: i })).filter(({ person }) => person.age == null),
    [payload.people],
  )

  if (checkoutMetaLoading || !checkoutMeta) {
    return (
      <div className="step-panel">
        <h1 className="step-heading">Confirm &amp; pay</h1>
        <PanelLoader label="Preparing your checkout…" />
      </div>
    )
  }

  const schedules = receipt?.instalmentsPayments ?? []
  const scheduleIndex = Math.min(Math.max(numOfInstalments - 1, 0), Math.max(schedules.length - 1, 0))
  const selectedSchedule = schedules[scheduleIndex] ?? []
  const instalmentChoices = Math.max(checkoutMeta.maxNrOfInstalments, 1)

  async function handleSubmit() {
    setFormError(null)
    const missing: string[] = []
    for (const field of checkoutMeta!.customerFields) {
      const v = (payload.people[0] as Record<string, unknown>)[field]
      if (!v) missing.push(`${fieldLabel(field)} (lead traveller)`)
    }
    adults.slice(1).forEach(({ person }, n) => {
      for (const field of checkoutMeta!.participantFields) {
        const v = (person as Record<string, unknown>)[field]
        if (!v) missing.push(`${fieldLabel(field)} (traveller ${n + 2})`)
      }
    })
    if (missing.length) {
      setFormError(`Please complete: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}`)
      return
    }
    if (checkoutMeta!.termsCheck && !termsAccepted) {
      setFormError('Please accept the terms and conditions to continue.')
      return
    }
    setSubmitting(true)
    const result = await actions.submitOrder(paymentMethod)
    if (!result.ok) {
      setFormError(result.message ?? 'Your booking could not be completed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="step-panel checkout-panel">
      <h1 className="step-heading">Confirm &amp; pay</h1>

      <section className="checkout-section">
        <h2 className="section-heading">Lead traveller</h2>
        <PersonForm
          person={payload.people[0] ?? {}}
          fields={checkoutMeta.customerFields}
          countries={checkoutMeta.countries}
          onChange={(fields) => actions.updateLeadCustomer(fields)}
        />
      </section>

      {adults.slice(1).map(({ person, index }, n) => (
        <section className="checkout-section" key={index}>
          <h2 className="section-heading">Traveller {n + 2}</h2>
          <PersonForm
            person={person}
            fields={checkoutMeta.participantFields}
            countries={checkoutMeta.countries}
            onChange={(fields) => actions.updateParticipant(index, fields)}
          />
        </section>
      ))}

      {instalmentChoices > 1 ? (
        <section className="checkout-section">
          <h2 className="section-heading">How would you like to pay?</h2>
          <div className="instalment-buttons">
            {Array.from({ length: instalmentChoices }).map((_, i) => {
              const n = i + 1
              return (
                <button
                  key={n}
                  type="button"
                  className={`instalment-btn${numOfInstalments === n ? ' is-selected' : ''}`}
                  disabled={receiptLoading}
                  onClick={() => actions.setInstalments(n)}
                >
                  {n === 1 ? 'Pay in full' : `${n} instalments`}
                </button>
              )
            })}
          </div>
          {selectedSchedule.length ? (
            <div className="payment-breakdown">
              {selectedSchedule.map((p, i) => (
                <div key={i} className={`payment-breakdown-row${i === 0 ? ' is-due-now' : ''}`}>
                  <span>
                    {i === 0 ? 'Due now' : p.payBeforeDate ? `Due by ${formatDateLong(p.payBeforeDate)}` : 'Due later'}
                  </span>
                  <span>{formatMoney(p.amount, currency)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="checkout-section">
        <h2 className="section-heading">Payment method</h2>
        <div className="payment-methods">
          {checkoutMeta.paymentMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`payment-method${paymentMethod === m.id ? ' is-selected' : ''}`}
              onClick={() => setPaymentMethod(m.id)}
            >
              {m.image?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image.url} alt="" className="payment-method-logo" />
              ) : null}
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </section>

      {checkoutMeta.euDirectiveText ? (
        <section className="checkout-section">
          <div className="eu-directive" dangerouslySetInnerHTML={{ __html: checkoutMeta.euDirectiveText }} />
        </section>
      ) : null}

      <section className="checkout-section">
        <h2 className="section-heading">Terms &amp; conditions</h2>
        <div className="terms-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(checkoutMeta.termsMarkdown) }} />
        {checkoutMeta.termsCheck ? (
          <label className="terms-accept">
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
            <span>I have read and accept the terms and conditions</span>
          </label>
        ) : null}
      </section>

      {formError ? <div className="summary-error">{formError}</div> : null}

      <div className="checkout-submit">
        <button type="button" className="btn btn-tertiary" onClick={actions.goBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={submitting || receiptLoading || !receipt}
          onClick={handleSubmit}
        >
          {submitting ? 'Processing…' : `Confirm and pay ${selectedSchedule.length ? formatMoney(selectedSchedule[0]?.amount ?? receipt?.totalPrice ?? null, currency) : formatMoney(receipt?.totalPrice ?? null, currency)}`}
        </button>
      </div>
    </div>
  )
}

function PersonForm({
  person,
  fields,
  countries,
  onChange,
}: {
  person: PersonInput
  fields: string[]
  countries: { code: string; name: string; nationality: string | null }[]
  onChange: (fields: Record<string, string>) => void
}) {
  return (
    <div className="person-form">
      {fields.map((field) => {
        const value = ((person as Record<string, unknown>)[field] as string) ?? ''
        if (field === 'gender') {
          return (
            <label className="form-field" key={field}>
              <span className="form-label">{fieldLabel(field)}</span>
              <select className="form-input" value={value} onChange={(e) => onChange({ [field]: e.target.value })}>
                <option value="">Select…</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </label>
          )
        }
        if (field === 'country' || field === 'idIssuingCountry' || field === 'nationality') {
          return (
            <label className="form-field" key={field}>
              <span className="form-label">{fieldLabel(field)}</span>
              <select className="form-input" value={value} onChange={(e) => onChange({ [field]: e.target.value })}>
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {field === 'nationality' ? c.nationality || c.name : c.name}
                  </option>
                ))}
              </select>
            </label>
          )
        }
        const type =
          field === 'email' ? 'email' : field === 'phone' ? 'tel' : field === 'birthDate' || field === 'idValidity' ? 'date' : 'text'
        return (
          <label className="form-field" key={field}>
            <span className="form-label">{fieldLabel(field)}</span>
            <input
              className="form-input"
              type={type}
              value={value}
              onChange={(e) => onChange({ [field]: e.target.value })}
            />
          </label>
        )
      })}
    </div>
  )
}
