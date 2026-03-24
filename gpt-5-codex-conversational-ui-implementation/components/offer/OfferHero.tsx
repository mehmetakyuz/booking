'use client'

import { useBooking } from '@/lib/booking/context'

function price(amount: number) {
  return `£${(amount / 100).toFixed(0)}`
}

export function OfferHero() {
  const {
    state: { offer },
  } = useBooking()

  return (
    <header className="hero">
      <div className="hero-inner">
        <img alt={offer.shortTitle} className="hero-image" src={offer.imageUrl} />
        <div>
          <div className="display" style={{ fontSize: 22, fontWeight: 700 }}>
            {offer.shortTitle}
          </div>
          <div>{offer.title}</div>
          <div className="muted tiny">{offer.location}</div>
        </div>
        <div className="hero-price" style={{ textAlign: 'right' }}>
          <div className="muted tiny">From</div>
          <div className="price" style={{ fontSize: 24 }}>
            {price(offer.price)} pp
          </div>
          {offer.oldPrice > 0 ? (
            <div className="muted tiny" style={{ textDecoration: 'line-through' }}>
              {price(offer.oldPrice)} pp
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
