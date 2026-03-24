'use client'

import { ChatInput } from '@/components/chat/ChatInput'
import { ChatThread } from '@/components/chat/ChatThread'
import { ReceiptPanel } from '@/components/receipt/ReceiptPanel'
import { useBooking } from '@/lib/booking/context'

export function BookingExperience() {
  const {
    state,
    actions,
  } = useBooking()

  return (
    <>
      <main className="conversation-page-shell">
        <div className="conversation-layout-grid">
          <section className="conversation-chat-shell">
            <div className="conversation-chat-header">
              <div>
                <p className="step-eyebrow">Conversational booking</p>
                <h1 className="conversation-chat-title">{state.offer.shortTitle}</h1>
                <p className="conversation-chat-subtitle">{state.offer.location}</p>
              </div>
            </div>
            <ChatThread />
            {state.assistantBusy ? (
              <div className="conversation-assistant-status">
                <div className="helper-text">Working on your message…</div>
              </div>
            ) : null}
            <ChatInput />
          </section>
          <aside className="receipt-column conversation-receipt-column">
            <ReceiptPanel />
          </aside>
        </div>
      </main>

      <div className="mobile-summary-bar">
        <button className="button button-primary" onClick={() => actions.toggleMobileReceipt(true)} type="button">
          View summary
        </button>
      </div>

      {state.mobileReceiptOpen ? (
        <div className="mobile-drawer" onClick={() => actions.toggleMobileReceipt(false)}>
          <div className="mobile-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-drawer-header">
              <strong>Booking summary</strong>
              <button className="button button-secondary" onClick={() => actions.toggleMobileReceipt(false)} type="button">
                Close
              </button>
            </div>
            <ReceiptPanel mobile />
          </div>
        </div>
      ) : null}
    </>
  )
}
