'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'

export function OfferHero({ mobile = false }: { mobile?: boolean }) {
  const {
    state: { offer, offerMeta },
  } = useBooking()
  const [openPanel, setOpenPanel] = useState<'included' | 'excluded' | 'info' | null>(null)

  const modalTitle = useMemo(() => {
    if (openPanel === 'included') return "What's included"
    if (openPanel === 'excluded') return "What's excluded"
    if (openPanel === 'info') return 'Trip information'
    return ''
  }, [openPanel])

  useEffect(() => {
    if (!openPanel) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPanel(null)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPanel])

  return (
    <>
      <section className={`hero${mobile ? ' is-mobile' : ''}`}>
        <div className="hero-inner">
          <img alt={offer.shortTitle} className="hero-image" src={offer.imageUrl} />
          <div className="hero-copy">
            <p className="hero-kicker">{offer.location}</p>
            <h1>{offer.shortTitle}</h1>
            <p>{offer.title}</p>
            <p className="helper-text">
              Based on {offerMeta.packagePriceAmountOfAdults} adult{offerMeta.packagePriceAmountOfAdults === 1 ? '' : 's'} sharing
            </p>
            <div className="hero-links">
              <button className="link-button" onClick={() => setOpenPanel('included')} type="button">
                What's included
              </button>
              <button className="link-button" onClick={() => setOpenPanel('excluded')} type="button">
                What's excluded
              </button>
              <button className="link-button" onClick={() => setOpenPanel('info')} type="button">
                Trip information
              </button>
            </div>
          </div>
        </div>
      </section>

      {openPanel ? (
        <div aria-modal="true" className="hero-modal-backdrop" onClick={() => setOpenPanel(null)} role="dialog">
          <div className="hero-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hero-modal-header">
              <h2>{modalTitle}</h2>
              <button aria-label="Close modal" className="modal-close-button" onClick={() => setOpenPanel(null)} type="button">
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {openPanel === 'included' ? (
              <ul className="hero-modal-list">
                {offer.includedList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            {openPanel === 'excluded' ? (
              <ul className="hero-modal-list">
                {offer.excludedList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            {openPanel === 'info' ? (
              <div className="hero-modal-info">
                {offer.informationList.map((item) => (
                  <section className="hero-info-item" key={item.id}>
                    {item.label ? <h3 dangerouslySetInnerHTML={{ __html: item.label }} /> : null}
                    <div dangerouslySetInnerHTML={{ __html: item.value || '' }} />
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
