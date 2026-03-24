'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useBooking } from '@/lib/booking/context'
import { formatPriceWithPence } from '@/lib/utils/price'
import { PanelLoadingState, StepFooter, StepShell } from '@/components/steps/shared'

export function CheckoutStep() {
  const {
    state: { checkout, checkoutForm, currentStepIndex, payload, receipt },
    actions,
  } = useBooking()
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    void actions.ensureCheckoutLoaded()
  }, [actions])

  const allPaymentMethods = useMemo(
    () => [...(checkout?.paymentMethods ?? []), ...(checkout?.paymentMethodGroups.flatMap((group) => group.paymentMethods) ?? [])],
    [checkout],
  )

  if (!checkout) {
    return (
      <StepShell eyebrow={`Step ${currentStepIndex + 1}`} title="Complete your booking">
        <PanelLoadingState detail="Checkout metadata is loading in this panel." title="Loading checkout details…" />
      </StepShell>
    )
  }

  return (
    <StepShell
      eyebrow={`Step ${currentStepIndex + 1}`}
      title="Complete your booking"
    >
      <div className="checkout-flow">
        {submitError ? <div className="error-banner">{submitError}</div> : null}
        {checkout.namesMustMatchId ? <div className="info-banner">Names must match your ID or passport.</div> : null}
        {checkout.mainDriverRequired ? <div className="info-banner">Lead passenger must be the main driver.</div> : null}

        <section className="checkout-section">
          <div className="checkout-section-header">
            <h3 className="section-heading">Lead passenger</h3>
          </div>
          <div className="field-grid checkout-fields">
            {checkout.leadFields.map((field) => (
              <label className="field checkout-field" key={field.key}>
                <span>{field.label}</span>
                <input
                  type={field.type}
                  value={checkoutForm.leadPassenger[field.key] ?? ''}
                  onChange={(event) => actions.updateCheckoutField('leadPassenger', field.key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        {checkout.participantFields.length ? (
          <section className="checkout-section">
            <div className="checkout-section-header">
              <h3 className="section-heading">Co-travellers</h3>
            </div>
            <div className="checkout-travellers">
              {checkoutForm.participants.map((participant, index) => (
                <div className="checkout-traveller-block" key={`participant-${index}`}>
                  <p className="checkout-traveller-title">Traveller {index + 2}</p>
                  <div className="field-grid checkout-fields">
                    {checkout.participantFields.map((field) => (
                      <label className="field checkout-field" key={`${field.key}-${index}`}>
                        <span>{field.label}</span>
                        <input
                          type={field.type}
                          value={participant[field.key] ?? ''}
                          onChange={(event) => actions.updateCheckoutField('participants', field.key, event.target.value, index)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {checkout.couponSources.length ? (
          <section className="checkout-section">
            <div className="checkout-section-header">
              <h3 className="section-heading">Promo codes</h3>
            </div>
            <div className="checkout-inline-list">
              {checkout.couponSources.map((source) => (
                <label className="field checkout-field" key={source.source}>
                  <span>{source.source}</span>
                  <div className="inline-field checkout-inline-field">
                    <input
                      value={checkoutForm.couponCodes[source.source] ?? ''}
                      onChange={(event) => actions.updateCheckoutField('couponCodes', source.source, event.target.value)}
                      placeholder={source.disclaimer}
                      type="text"
                    />
                    <button className="button button-secondary" onClick={() => actions.applyCoupon(source.source)} type="button">
                      Apply
                    </button>
                  </div>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        <section className="checkout-section">
          <div className="checkout-section-header">
            <h3 className="section-heading">Payment method</h3>
          </div>
          <div className="checkout-choice-list">
            {allPaymentMethods.map((method) => (
              <label className="checkout-choice-row" key={method.id}>
                <input
                  checked={checkoutForm.paymentMethodId === method.id}
                  onChange={() => actions.updateCheckoutMeta({ paymentMethodId: method.id })}
                  type="radio"
                />
                {method.imageUrl ? (
                  <img alt={method.name} className="checkout-payment-logo" src={method.imageUrl} />
                ) : null}
                <span>{method.name}</span>
              </label>
            ))}
          </div>
        </section>

        {checkout.maxNrOfInstalments > 1 && receipt?.instalmentPayments.length ? (
          <section className="checkout-section">
            <div className="checkout-section-header">
              <h3 className="section-heading">Instalments</h3>
            </div>
            <div className="checkout-compact-stack">
              <div className="checkout-instalment-group" role="group" aria-label="Instalment options">
                {Array.from({ length: checkout.maxNrOfInstalments }, (_, index) => index + 1).map((value) => (
                  <button
                    className={`checkout-instalment-button${payload.numOfInstalments === value ? ' is-selected' : ''}`}
                    key={value}
                    onClick={() => {
                      void actions.updateInstalments(value)
                    }}
                    type="button"
                  >
                    {value === 1 ? 'Pay in full' : `${value} instalments`}
                  </button>
                ))}
              </div>
              <p className="helper-text">
                {receipt.instalmentPayments.map((payment) => `${formatPriceWithPence(payment.amount)} before ${payment.payBeforeDate}`).join(' · ')}
              </p>
            </div>
          </section>
        ) : null}

        {checkout.specialWishesSupported ? (
          <section className="checkout-section">
            <div className="checkout-section-header">
              <h3 className="section-heading">Special requests</h3>
            </div>
            <textarea
              rows={4}
              value={checkoutForm.specialRequests}
              onChange={(event) => actions.updateCheckoutMeta({ specialRequests: event.target.value })}
            />
          </section>
        ) : null}

        <section className="checkout-section">
          <div className="checkout-section-header">
            <h3 className="section-heading">Terms and conditions</h3>
          </div>
          <div className="checkout-prose">
            {checkout.termsMarkdown ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{checkout.termsMarkdown}</ReactMarkdown>
            ) : (
              <p>{checkout.termsText || 'Terms are supplied by the API.'}</p>
            )}
          </div>
          <label className="checkout-choice-row checkout-choice-row--terms">
            <input
              checked={checkoutForm.acceptedTerms}
              onChange={(event) => actions.updateCheckoutMeta({ acceptedTerms: event.target.checked })}
              type="checkbox"
            />
            <span>I accept the terms and conditions</span>
          </label>
        </section>

        {checkout.euDirectiveText ? (
          <section className="checkout-section">
            <div className="checkout-section-header">
              <h3 className="section-heading">EU directive</h3>
            </div>
            <div
              className="checkout-prose"
              dangerouslySetInnerHTML={{ __html: checkout.euDirectiveText }}
            />
          </section>
        ) : null}
      </div>

      <StepFooter
        canContinue={checkoutForm.acceptedTerms}
        continueBusy={busy}
        continueLabel="Confirm and pay"
        onBack={actions.goBack}
        onContinue={async () => {
          setBusy(true)
          setSubmitError('')
          try {
            const continueUrl = await actions.submitOrder(window.location.href)
            window.location.assign(continueUrl)
          } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Unable to continue to payment.')
          } finally {
            setBusy(false)
          }
        }}
      />
    </StepShell>
  )
}
