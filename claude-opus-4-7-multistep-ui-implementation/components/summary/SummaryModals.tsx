'use client'

import { Modal } from '@/components/ui/Modal'
import type { OfferMeta } from '@/lib/booking/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ModalKind = 'included' | 'excluded' | 'info' | null

interface Props {
  offer: OfferMeta
  active: ModalKind
  onClose: () => void
}

export function SummaryModals({ offer, active, onClose }: Props) {
  return (
    <>
      <Modal open={active === 'included'} onClose={onClose} title="What’s included">
        <ul className="modal-bullet-list">
          {(offer.includedList ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Modal>
      <Modal open={active === 'excluded'} onClose={onClose} title="What’s excluded">
        <ul className="modal-bullet-list">
          {(offer.excludedList ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Modal>
      <Modal open={active === 'info'} onClose={onClose} title="Trip information" wide>
        <dl className="modal-info-list">
          {(offer.informationList ?? []).map((info) => (
            <div key={info.id} className="modal-info-item">
              <dt className="modal-info-label">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{info.label ?? info.type}</ReactMarkdown>
              </dt>
              <dd className="modal-info-value">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{info.value}</ReactMarkdown>
              </dd>
            </div>
          ))}
        </dl>
      </Modal>
    </>
  )
}
