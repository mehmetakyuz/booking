'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { CheckoutField, CountryOption, PaymentMethod, PaymentMethodGroup, CouponSource } from '@/lib/booking/types'

export default function CheckoutStep() {
  const { state, actions } = useBooking()
  const { checkout, checkoutForm, travellers } = state
  const totalPeople = travellers.adults + travellers.childrenAges.length

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ── Load checkout data on mount ── */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    actions.loadCheckout().then(() => {
      if (!cancelled) setLoading(false)
    }).catch((err: unknown) => {
      if (!cancelled) {
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Failed to load checkout')
      }
    })
    return () => { cancelled = true }
  }, [actions])

  /* ── Set default payment method once checkout loads ── */
  useEffect(() => {
    if (!checkout || checkoutForm.paymentMethodId) return
    const allMethods = [
      ...checkout.paymentMethods,
      ...checkout.paymentMethodGroups.flatMap((g) => g.paymentMethods),
    ]
    const defaultMethod = allMethods.find((m) => m.default) ?? allMethods[0]
    if (defaultMethod) {
      actions.updateCheckoutMeta({ paymentMethodId: defaultMethod.id })
    }
  }, [checkout, checkoutForm.paymentMethodId, actions])

  /* ── Helpers ── */
  function handleLeadFieldChange(key: string, value: string) {
    actions.updateCheckoutField('leadPassenger', key, value)
  }

  function handleParticipantFieldChange(index: number, key: string, value: string) {
    actions.updateCheckoutField('participants', key, value, index)
  }

  function handleSubmit() {
    setSubmitting(true)
    setError(null)
    actions.submitOrder().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Order submission failed')
      setSubmitting(false)
    })
  }

  /* ── Check required fields filled ── */
  function areRequiredFieldsFilled(): boolean {
    if (!checkout) return false

    for (const field of checkout.leadFields) {
      if (field.required && !checkoutForm.leadPassenger[field.key]?.trim()) {
        return false
      }
    }

    if (checkout.participantFields.length > 0 && totalPeople > 1) {
      for (let i = 0; i < totalPeople - 1; i++) {
        const participant = checkoutForm.participants[i] ?? {}
        for (const field of checkout.participantFields) {
          if (field.required && !participant[field.key]?.trim()) {
            return false
          }
        }
      }
    }

    return true
  }

  const canSubmit = checkoutForm.acceptedTerms && areRequiredFieldsFilled() && !submitting

  /* ── Loading overlay ── */
  if (loading) {
    return (
      <div className="step-panel">
        <div className="loader-overlay">
          <div className="loader" />
        </div>
      </div>
    )
  }

  if (!checkout) {
    return (
      <div className="step-panel">
        <div className="step-panel-header">
          <h2>Confirm &amp; pay</h2>
        </div>
        <div className="step-panel-content">
          <p>Unable to load checkout data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="step-panel">
      <div className="step-panel-header">
        <h2>Confirm &amp; pay</h2>
      </div>

      <div className="step-panel-content">
        {error && <div className="form-error">{error}</div>}

        {/* ── Lead passenger ── */}
        <h3 className="section-heading">Your details</h3>
        {checkout.leadFields.map((field) => (
          <FormField
            key={field.key}
            field={field}
            value={checkoutForm.leadPassenger[field.key] ?? ''}
            onChange={(v) => handleLeadFieldChange(field.key, v)}
            countries={field.key === 'phone' ? checkout.countries : undefined}
            phoneCountryCode={checkoutForm.phoneCountryCode}
            onPhoneCountryCodeChange={(code) =>
              actions.updateCheckoutMeta({ phoneCountryCode: code })
            }
          />
        ))}

        {/* ── Additional participants ── */}
        {checkout.participantFields.length > 0 &&
          totalPeople > 1 &&
          Array.from({ length: totalPeople - 1 }, (_, i) => (
            <div key={i}>
              <h3 className="section-heading">Traveller {i + 2}</h3>
              {checkout.participantFields.map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={checkoutForm.participants[i]?.[field.key] ?? ''}
                  onChange={(v) => handleParticipantFieldChange(i, field.key, v)}
                />
              ))}
            </div>
          ))}

        {/* ── Special requests ── */}
        {checkout.specialWishesSupported && (
          <>
            <h3 className="section-heading">Special requests</h3>
            <div className="form-field">
              <label className="form-label">Any special requests?</label>
              <textarea
                className="form-input"
                rows={3}
                value={checkoutForm.specialRequests}
                onChange={(e) =>
                  actions.updateCheckoutMeta({ specialRequests: e.target.value })
                }
                placeholder="e.g. dietary requirements, accessibility needs..."
              />
            </div>
          </>
        )}

        {/* ── Payment methods ── */}
        <h3 className="section-heading">Payment</h3>
        <PaymentMethodSelector
          methods={checkout.paymentMethods}
          groups={checkout.paymentMethodGroups}
          selectedId={checkoutForm.paymentMethodId}
          onSelect={(id) => actions.updateCheckoutMeta({ paymentMethodId: id })}
        />

        {/* ── Instalments ── */}
        {checkout.maxNrOfInstalments > 1 && (
          <InstalmentSelector
            max={checkout.maxNrOfInstalments}
            current={state.payload.numOfInstalments}
            onChange={(n) => actions.updateInstalments(n)}
          />
        )}

        {/* ── Coupons ── */}
        {checkout.couponSources.length > 0 && (
          <>
            <h3 className="section-heading">Coupons</h3>
            {checkout.couponSources.map((source) => (
              <CouponInput
                key={source.source}
                source={source}
                value={checkoutForm.couponCodes[source.source] ?? ''}
                onValueChange={(v) => {
                  const couponCodes = { ...checkoutForm.couponCodes, [source.source]: v }
                  // Update couponCodes via patching checkoutForm through updateCheckoutField workaround
                  // We store coupon input values locally
                }}
                onApply={() => actions.applyCoupon(source.source)}
              />
            ))}
          </>
        )}

        {/* ── Terms ── */}
        {checkout.termsMarkdown && (
          <div
            className="terms-text"
            dangerouslySetInnerHTML={{ __html: checkout.termsMarkdown }}
          />
        )}

        {checkout.euDirectiveText && (
          <div
            className="terms-text"
            dangerouslySetInnerHTML={{ __html: checkout.euDirectiveText }}
          />
        )}

        {checkout.termsLinks.length > 0 && (
          <div className="terms-links">
            {checkout.termsLinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.type}
              </a>
            ))}
          </div>
        )}

        <div className="form-field">
          <label className="form-label checkbox-label">
            <input
              type="checkbox"
              checked={checkoutForm.acceptedTerms}
              onChange={(e) =>
                actions.updateCheckoutMeta({ acceptedTerms: e.target.checked })
              }
            />
            I accept the terms and conditions
          </label>
        </div>
      </div>

      <div className="step-panel-actions">
        <button type="button" className="btn-secondary" onClick={() => actions.goBack()}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? 'Processing...' : 'Confirm and pay'}
        </button>
      </div>
    </div>
  )
}

/* ── FormField ── */

function FormField({
  field,
  value,
  onChange,
  countries,
  phoneCountryCode,
  onPhoneCountryCodeChange,
}: {
  field: CheckoutField
  value: string
  onChange: (value: string) => void
  countries?: CountryOption[]
  phoneCountryCode?: string
  onPhoneCountryCodeChange?: (code: string) => void
}) {
  const isPhone = field.key === 'phone' && countries && countries.length > 0

  return (
    <div className="form-field">
      <label className="form-label">
        {field.label}
        {field.required && <span className="required-mark"> *</span>}
      </label>
      {isPhone ? (
        <div className="phone-field">
          <select
            className="form-input phone-country-code"
            value={phoneCountryCode ?? ''}
            onChange={(e) => onPhoneCountryCodeChange?.(e.target.value)}
          >
            <option value="">Code</option>
            {countries!.map((c) =>
              c.dialCode ? (
                <option key={c.code} value={c.dialCode}>
                  {c.code} (+{c.dialCode})
                </option>
              ) : null,
            )}
          </select>
          <input
            type="tel"
            className="form-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        </div>
      ) : (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      )}
    </div>
  )
}

/* ── PaymentMethodSelector ── */

function PaymentMethodSelector({
  methods,
  groups,
  selectedId,
  onSelect,
}: {
  methods: PaymentMethod[]
  groups: PaymentMethodGroup[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  // Ungrouped methods (those not marked inGroup)
  const ungrouped = methods.filter((m) => !m.inGroup)

  return (
    <div className="payment-methods">
      {ungrouped.map((method) => (
        <div
          key={method.id}
          className={`option-card${selectedId === method.id ? ' selected' : ''}`}
          onClick={() => onSelect(method.id)}
        >
          {method.imageUrl && (
            <img src={method.imageUrl} alt={method.name} className="payment-logo" />
          )}
          <span className="payment-name">{method.name}</span>
          {method.shortDescription && (
            <span className="payment-description">{method.shortDescription}</span>
          )}
        </div>
      ))}

      {groups.map((group, gi) => (
        <div key={gi} className="payment-group">
          <div className="payment-group-header">
            {group.logoUrl && (
              <img src={group.logoUrl} alt={group.name} className="payment-logo" />
            )}
            <span className="payment-group-name">{group.name}</span>
            {group.shortDescription && (
              <span className="payment-description">{group.shortDescription}</span>
            )}
          </div>
          {group.paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`option-card${selectedId === method.id ? ' selected' : ''}`}
              onClick={() => onSelect(method.id)}
            >
              {method.imageUrl && (
                <img src={method.imageUrl} alt={method.name} className="payment-logo" />
              )}
              <span className="payment-name">{method.name}</span>
              {method.shortDescription && (
                <span className="payment-description">{method.shortDescription}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ── InstalmentSelector ── */

function InstalmentSelector({
  max,
  current,
  onChange,
}: {
  max: number
  current: number
  onChange: (n: number) => void
}) {
  const options = Array.from({ length: max }, (_, i) => i + 1)

  return (
    <div className="instalment-selector">
      <h4 className="section-subheading">Payment plan</h4>
      <div className="button-group">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            className={`button-group-item${current === n ? ' active' : ''}`}
            onClick={() => onChange(n)}
          >
            {n === 1 ? 'Pay in full' : `${n} instalments`}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── CouponInput ── */

function CouponInput({
  source,
  value: _value,
  onValueChange: _onValueChange,
  onApply,
}: {
  source: CouponSource
  value: string
  onValueChange: (v: string) => void
  onApply: () => void
}) {
  const [code, setCode] = useState('')

  return (
    <div className="coupon-field">
      <div className="form-field">
        <label className="form-label">{source.source}</label>
        <div className="coupon-input-row">
          <input
            type="text"
            className="form-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter coupon code"
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (code.trim()) onApply()
            }}
          >
            Apply
          </button>
        </div>
        {source.disclaimer && (
          <span className="coupon-disclaimer">{source.disclaimer}</span>
        )}
      </div>
    </div>
  )
}
