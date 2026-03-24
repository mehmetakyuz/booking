'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/booking/format'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createOrder, fetchCountries } from '@/lib/booking/api'

export function CheckoutStep() {
  const { state, actions } = useBooking()
  const [countries, setCountries] = useState<{ code: string; name: string; dialCode?: string }[]>([])
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)

  useEffect(() => {
    if (!state.checkoutMeta && !state.async.checkoutLoading) actions.loadCheckoutMeta()
    fetchCountries(state.payload.sessionId).then(setCountries).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const meta = state.checkoutMeta
  const currency = state.payload.offerMeta?.currency ?? 'GBP'

  useEffect(() => {
    if (!meta || paymentMethodId) return
    const def = meta.paymentMethods.find((p) => p.default) ?? meta.paymentMethods[0]
    if (def) setPaymentMethodId(def.id)
  }, [meta, paymentMethodId])

  const selectedInstalments = state.payload.numOfInstalments ?? 1
  const maxInstalments = meta?.maxNrOfInstalments ?? 1
  const instalmentsOptions = useMemo(
    () => Array.from({ length: maxInstalments }, (_, i) => i + 1),
    [maxInstalments],
  )

  const schedulesList = state.receipt?.instalmentsPayments as unknown as
    | { amount: number | null; payBeforeDate: string | null }[][]
    | undefined
  const schedule = schedulesList?.[selectedInstalments - 1]
  const dueNow = schedule?.[0]
  const dueLater = schedule?.slice(1)

  async function submit() {
    if (!state.receipt?.totalPrice || !paymentMethodId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const props = [
        ...(state.payload.properties ?? []),
        { name: 'restore_url', value: typeof window !== 'undefined' ? window.location.href : '' },
      ]
      const patched = { ...state.payload, properties: props }
      actions.patch({ properties: props })
      const result = await createOrder(
        patched,
        state.receipt.totalPrice,
        parseInt(paymentMethodId, 10),
      )
      if (result.errors?.length) {
        setSubmitError(result.errors[0].message)
        return
      }
      if (result.paymentResult?.continueUrl) {
        window.location.href = result.paymentResult.continueUrl
      }
    } catch (e) {
      setSubmitError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (state.async.checkoutLoading || !meta) {
    return (
      <div className="step-panel">
        <div className="panel-loading">
          <Spinner size={32} label="Loading checkout…" />
        </div>
      </div>
    )
  }

  const customerFields = meta.customerSalesflowDisplayFields ?? []
  const termsMarkdown = meta.termsAndConditions?.markdown ?? meta.termsAndConditions?.text ?? ''

  return (
    <div className="step-panel step-panel--checkout">
      <header className="step-panel-head">
        <h1 className="step-heading">Confirm &amp; pay</h1>
      </header>

      <section className="checkout-section">
        <h2 className="checkout-section-title">Lead passenger</h2>
        <div className="checkout-grid">
          {customerFields.map((field) => {
            const type = pickInputType(field)
            return (
              <label key={field} className="checkout-field">
                <span className="checkout-field-label">{fieldLabel(field)}</span>
                {field.toLowerCase().includes('country') && countries.length ? (
                  <select
                    className="checkout-input"
                    value={formValues[field] ?? ''}
                    onChange={(e) => setFormValues((v) => ({ ...v, [field]: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="checkout-input"
                    type={type}
                    value={formValues[field] ?? ''}
                    onChange={(e) => setFormValues((v) => ({ ...v, [field]: e.target.value }))}
                  />
                )}
              </label>
            )
          })}
        </div>
      </section>

      <section className="checkout-section">
        <h2 className="checkout-section-title">Payment</h2>
        <div className="payment-method-list">
          {meta.paymentMethods.map((pm) => {
            const isActive = paymentMethodId === pm.id
            return (
              <button
                key={pm.id}
                type="button"
                className={'payment-method' + (isActive ? ' payment-method--active' : '')}
                onClick={() => setPaymentMethodId(pm.id)}
              >
                {pm.image?.url ? (
                  <img src={pm.image.url} alt={pm.name} height={36} />
                ) : null}
                <span>
                  <strong>{pm.name}</strong>
                  {pm.shortDescription ? (
                    <span className="payment-method-sub">{pm.shortDescription}</span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>

        {maxInstalments > 1 ? (
          <div className="instalments">
            <div className="instalments-label">Pay in</div>
            <div className="instalments-buttons" role="radiogroup">
              {instalmentsOptions.map((n) => {
                const isActive = n === selectedInstalments
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={'btn btn--secondary btn--sm' + (isActive ? ' btn--active' : '')}
                    onClick={() => actions.setInstalments(n)}
                  >
                    {n === 1 ? 'Pay in full' : `${n} instalments`}
                  </button>
                )
              })}
            </div>
            {schedule ? (
              <div className="instalments-schedule">
                {dueNow ? (
                  <div className="instalments-row">
                    <span>Due now</span>
                    <strong>{formatMoney(dueNow.amount ?? 0, currency)}</strong>
                  </div>
                ) : null}
                {dueLater?.map((row, i) => (
                  <div className="instalments-row" key={i}>
                    <span>{row.payBeforeDate ? `Due by ${row.payBeforeDate}` : 'Later'}</span>
                    <strong>{formatMoney(row.amount ?? 0, currency)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="checkout-section">
        <h2 className="checkout-section-title">Terms &amp; conditions</h2>
        {termsMarkdown ? (
          <div className="terms-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{termsMarkdown}</ReactMarkdown>
          </div>
        ) : null}
        {meta.euDirectiveText ? (
          <div
            className="eu-directive"
            dangerouslySetInnerHTML={{ __html: meta.euDirectiveText }}
          />
        ) : null}
      </section>

      <div className="checkout-submit">
        {submitError ? <p className="error-text">{submitError}</p> : null}
        <Button variant="primary" block onClick={submit} disabled={submitting || !state.receipt}>
          {submitting ? 'Processing…' : 'Confirm and pay'}
        </Button>
      </div>
    </div>
  )
}

function fieldLabel(field: string) {
  const map: Record<string, string> = {
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    birthdate: 'Date of birth',
    nationality: 'Nationality',
    title: 'Title',
    address: 'Address',
    city: 'City',
    postcode: 'Postcode',
    country: 'Country',
  }
  return map[field] ?? field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

function pickInputType(field: string): string {
  const f = field.toLowerCase()
  if (f.includes('email')) return 'email'
  if (f.includes('phone')) return 'tel'
  if (f.includes('birth')) return 'date'
  return 'text'
}
