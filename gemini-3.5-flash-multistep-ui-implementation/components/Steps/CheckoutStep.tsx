'use client';

import React, { useState, useEffect } from 'react';
import { useBooking } from '@/lib/state';
import { formatMoney } from '@/lib/utils';
import { CountryOption, PersonInput } from '@/lib/types';

// Simple regex markdown-to-HTML parser helper to avoid installing marked library
function renderSimpleMarkdown(md: string) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Bullet points
    .replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>')
    // Newlines
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  return `<p>${html}</p>`.replace(/<p>\s*<\/p>/g, '');
}

export default function CheckoutStep() {
  const { state, actions } = useBooking();
  const { checkoutMeta, checkoutLoading, payload, receipt, receiptLoading } = state;

  const currency = state.offer?.currency || 'GBP';

  // Lead passenger local form state
  const [customerForm, setCustomerForm] = useState<Record<string, string>>({
    title: 'MR',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: 'GB',
    gender: 'MALE'
  });

  // Participant local forms list state
  const participantCount = payload.people.length - 1;
  const [participantForms, setParticipantForms] = useState<Array<Record<string, string>>>(
    Array.from({ length: participantCount }).map(() => ({
      title: 'MR',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      nationality: 'GB',
      gender: 'MALE'
    }))
  );

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Load checkout metadata on mount
  useEffect(() => {
    if (checkoutMeta?.paymentMethods && checkoutMeta.paymentMethods.length > 0) {
      const selected = checkoutMeta.paymentMethods.find(p => p.selected) || checkoutMeta.paymentMethods[0];
      setSelectedPaymentMethod(selected.id);
    }
  }, [checkoutMeta]);

  const handleCustomerChange = (field: string, val: string) => {
    setCustomerForm(prev => ({ ...prev, [field]: val }));
  };

  const handleParticipantChange = (idx: number, field: string, val: string) => {
    const updated = [...participantForms];
    updated[idx] = { ...updated[idx], [field]: val };
    setParticipantForms(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) return;
    await actions.submitCheckout(customerForm, participantForms, selectedPaymentMethod);
  };

  const renderField = (
    field: { name: string; label: string; type: string; required: boolean; options?: Array<{ value: string; label: string }> },
    value: string,
    onChange: (val: string) => void
  ) => {
    if (field.type === 'select' && field.options) {
      return (
        <div className="form-group" key={field.name}>
          <label className="form-label" style={{ fontSize: '12px' }}>{field.label}</label>
          <select
            className="checkout-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="form-group" key={field.name}>
        <label className="form-label" style={{ fontSize: '12px' }}>{field.label}</label>
        <input
          type={field.type}
          className="checkout-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      </div>
    );
  };

  // Check if form is fully valid
  const isFormValid = () => {
    // Validate lead passenger fields
    const leadFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'];
    for (const f of leadFields) {
      if (!customerForm[f]) return false;
    }

    // Validate participants
    for (const form of participantForms) {
      const fields = ['firstName', 'lastName', 'dateOfBirth'];
      for (const f of fields) {
        if (!form[f]) return false;
      }
    }

    return agreedToTerms && selectedPaymentMethod !== '';
  };

  // Determine instalment schedules
  const maxInstalments = receipt?.instalmentsPayments?.length || 1;
  const instalmentPlanIndex = (payload.numOfInstalments || 1) - 1;
  const selectedSchedule = receipt?.instalmentsPayments?.[instalmentPlanIndex] || receipt?.instalmentsPayments?.[0] || [];

  const handleInstallmentClick = async (instalmentNum: number) => {
    await actions.setNumOfInstalments(instalmentNum);
  };

  return (
    <div className="content-card" style={{ padding: '24px' }}>
      {(checkoutLoading || receiptLoading) && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
        </div>
      )}

      <div className="step-header">
        <h1 className="step-title">Confirm &amp; Pay</h1>
        <p className="step-subtitle">Verify details, customize payment terms, and complete booking.</p>
      </div>

      <form className="checkout-form" onSubmit={handleSubmit}>
        {/* Lead Passenger */}
        <div className="checkout-section">
          <h2 className="checkout-section-title">Lead Passenger</h2>
          <div className="form-row-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {checkoutMeta?.fields.map(field => {
              return renderField(field, customerForm[field.name] || '', (val) => handleCustomerChange(field.name, val));
            })}
          </div>
        </div>

        {/* Additional Passengers */}
        {participantForms.map((form, idx) => {
          // Participant fields (filter out email and phone)
          const participantFields = checkoutMeta?.fields.filter(f => f.name !== 'email' && f.name !== 'phone') || [];

          return (
            <div className="checkout-section" key={idx}>
              <h2 className="checkout-section-title">Passenger {idx + 2}</h2>
              <div className="form-row-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {participantFields.map(field => {
                  return renderField(field, form[field.name] || '', (val) => handleParticipantChange(idx, field.name, val));
                })}
              </div>
            </div>
          );
        })}

        {/* Payment scheduling & Installments */}
        {maxInstalments > 1 && (
          <div className="checkout-section">
            <h2 className="checkout-section-title">Choose Payment Schedule</h2>
            <div className="installments-btn-group">
              {Array.from({ length: maxInstalments }).map((_, idx) => {
                const instalmentNum = idx + 1;
                const isSelected = (payload.numOfInstalments || 1) === instalmentNum;
                
                let desc = 'Pay in full now';
                if (instalmentNum > 1) {
                  desc = `${instalmentNum} instalments`;
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`installment-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleInstallmentClick(instalmentNum)}
                  >
                    <span className="installment-btn-num">{instalmentNum}x</span>
                    <span className="installment-btn-desc">{desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Display payment breakdown */}
            {selectedSchedule.length > 0 && (
              <div style={{ marginTop: '16px', border: '1px solid #dfdfdf', borderRadius: '4px', padding: '12px 16px', backgroundColor: '#fcfcfc' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: '#575757', marginBottom: '8px' }}>
                  Scheduled Payments
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedSchedule.map((payment, pidx) => {
                    const isDueNow = pidx === 0;
                    const dateFormatted = payment.payBeforeDate
                      ? new Date(payment.payBeforeDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Today';

                    return (
                      <div key={pidx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: pidx < selectedSchedule.length - 1 ? '1px dashed #eee' : 'none', paddingBottom: '4px' }}>
                        <span>
                          {isDueNow ? <strong>Due Now</strong> : `Instalment ${pidx + 1}`}
                          <span style={{ fontSize: '11px', color: '#8b8b8b', marginLeft: '6px' }}>({dateFormatted})</span>
                        </span>
                        <span style={{ fontWeight: isDueNow ? 'bold' : 'normal', color: isDueNow ? '#ff791a' : 'inherit' }}>
                          {formatMoney(payment.amount, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Methods selection */}
        {checkoutMeta?.paymentMethods && checkoutMeta.paymentMethods.length > 0 && (
          <div className="checkout-section">
            <h2 className="checkout-section-title">Payment Method</h2>
            <div className="payment-methods-group">
              {checkoutMeta.paymentMethods.map((pm) => {
                const isSelected = selectedPaymentMethod === pm.id;
                
                return (
                  <div
                    key={pm.id}
                    className={`payment-method-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPaymentMethod(pm.id)}
                  >
                    <span>{pm.name}</span>
                    {pm.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pm.logo} alt={pm.name} className="payment-method-logo" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EU Directives (HTML) */}
        {checkoutMeta?.euDirectiveHtml && (
          <div
            className="checkout-section"
            style={{ fontSize: '12px', color: '#575757', lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: checkoutMeta.euDirectiveHtml }}
          />
        )}

        {/* Terms & Conditions (Markdown rendered to HTML) */}
        {checkoutMeta?.termsMarkdown && (
          <div
            className="checkout-section"
            style={{
              maxHeight: '150px',
              overflowY: 'auto',
              border: '1px solid #dfdfdf',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '11px',
              color: '#575757',
              backgroundColor: '#f9f9f9',
              lineHeight: '1.6'
            }}
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(checkoutMeta.termsMarkdown) }}
          />
        )}

        {/* Agreed to Terms Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
          <input
            type="checkbox"
            id="terms-check"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="terms-check" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            I agree to the terms and conditions and package travel directives listed above.
          </label>
        </div>

        {/* Submit Actions */}
        <div className="nav-buttons">
          <button type="button" className="btn btn-secondary" onClick={actions.prevStep}>
            ← Back
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isFormValid() || receiptLoading}
            style={{ padding: '12px 32px' }}
          >
            Confirm and Pay
          </button>
        </div>
      </form>
    </div>
  );
}
