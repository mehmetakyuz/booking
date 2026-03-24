'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { LeisureGroup, LeisureUnit } from '@/lib/booking/types'
import { formatMoney, formatDelta, formatDuration, groupTypeLabel } from '@/lib/booking/format'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { StepFooter } from './StepFooter'

interface OptionalBucket {
  title: string
  groups: LeisureGroup[]
}

function bucketOptionalByTitle(groups: LeisureGroup[]): OptionalBucket[] {
  const map = new Map<string, OptionalBucket>()
  for (const g of groups) {
    const title = g.units?.[0]?.name ?? g.productId
    if (!map.has(title)) map.set(title, { title, groups: [] })
    map.get(title)!.groups.push(g)
  }
  return Array.from(map.values())
}

export function ActivitiesStep() {
  const { state, actions } = useBooking()
  const [detailsFor, setDetailsFor] = useState<LeisureUnit | null>(null)

  useEffect(() => {
    if (!state.activities && !state.async.activitiesLoading) actions.loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activities = state.activities ?? []
  const included = activities.filter((g) => !g.optional)
  const optional = activities.filter((g) => g.optional)
  const optionalBuckets = useMemo(() => bucketOptionalByTitle(optional), [optional])

  const canContinue = !state.async.activitiesLoading && !state.async.receiptLoading

  return (
    <div className="step-panel">
      <header className="step-panel-head">
        <h1 className="step-heading">Activities</h1>
      </header>

      {state.async.activitiesLoading ? (
        <div className="panel-loading">
          <Spinner size={32} label="Loading activities…" />
        </div>
      ) : (
        <>
          {included.length ? (
            <section className="rooms-section">
              <h2 className="rooms-section-title">Included</h2>
              {included.map((g) => (
                <IncludedGroup
                  key={g.productId}
                  group={g}
                  onOpenDetails={setDetailsFor}
                  onSelect={(uId) => actions.toggleLeisureChoice(g.productId, uId)}
                  selectedIds={state.payload.products ?? []}
                />
              ))}
            </section>
          ) : null}

          {optionalBuckets.length ? (
            <section className="rooms-section">
              <h2 className="rooms-section-title">Optional add-ons</h2>
              {optionalBuckets.map((b) => (
                <OptionalBucketCard
                  key={b.title}
                  bucket={b}
                  onOpenDetails={setDetailsFor}
                  onSelect={(group, uId) => actions.toggleLeisureChoice(group.productId, uId)}
                  selectedIds={state.payload.products ?? []}
                />
              ))}
            </section>
          ) : null}

          {!included.length && !optional.length ? (
            <p className="empty-state">No activities for this stay.</p>
          ) : null}
        </>
      )}

      <StepFooter
        onContinue={() => {
          if (canContinue) actions.goToStep(state.currentStep + 1)
        }}
        continueDisabled={!canContinue}
      />

      <ActivityDetailsModal unit={detailsFor} onClose={() => setDetailsFor(null)} />
    </div>
  )
}

function IncludedGroup({
  group,
  onOpenDetails,
  onSelect,
  selectedIds,
}: {
  group: LeisureGroup
  onOpenDetails: (u: LeisureUnit) => void
  onSelect: (unitProductId: string) => void
  selectedIds: { id: string }[]
}) {
  const baselineUnit = group.units.find((u) => u.selected) ?? group.units[0]
  const baselinePrice = baselineUnit?.price ?? 0
  const currentUnit =
    group.units.find((u) => selectedIds.some((p) => p.id === u.productId)) ?? baselineUnit

  return (
    <ul className="option-list">
      {group.units.map((u) => {
        const isActive = u.productId === currentUnit?.productId
        const isBaseline = u.productId === baselineUnit?.productId
        const delta = (u.price ?? 0) - baselinePrice
        return (
          <li
            key={u.productId}
            className={'option-card' + (isActive ? ' option-card--active' : '')}
          >
            <button
              type="button"
              className="option-card-image"
              onClick={() => onSelect(u.productId)}
              aria-label={`Select ${u.name}`}
            >
              {u.image?.url ? <img src={u.image.url} alt="" /> : null}
            </button>
            <div className="option-card-body">
              <div className="option-card-content">
                <h3 className="option-card-name">{u.name}</h3>
                <p className="option-card-meta">
                  {u.duration ? formatDuration(u.duration) : ''}
                  {u.duration && u.groupType ? ' · ' : ''}
                  {u.groupType ? groupTypeLabel(u.groupType) : ''}
                </p>
                {u.description ? (
                  <p className="option-card-subtitle option-card-subtitle--clamp">{u.description}</p>
                ) : null}
                <button
                  type="button"
                  className="link-button btn-sm"
                  onClick={() => onOpenDetails(u)}
                >
                  View details
                </button>
              </div>
              <div className="option-card-price">
                <span className="option-card-delta">
                  {isBaseline ? 'Included' : formatDelta(delta)}
                </span>
                <span className="option-card-total">{formatMoney(u.price)}</span>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function OptionalBucketCard({
  bucket,
  onOpenDetails,
  onSelect,
  selectedIds,
}: {
  bucket: OptionalBucket
  onOpenDetails: (u: LeisureUnit) => void
  onSelect: (group: LeisureGroup, unitProductId: string | null) => void
  selectedIds: { id: string }[]
}) {
  const [dayIdx, setDayIdx] = useState(0)
  const active = bucket.groups[dayIdx]
  const unit = active?.units?.[0]
  const isSelected = !!active?.units?.some((u) => selectedIds.some((p) => p.id === u.productId))

  if (!unit) return null
  return (
    <article className={'option-card option-card--optional' + (isSelected ? ' option-card--active' : '')}>
      <button
        type="button"
        className="option-card-image"
        onClick={() => {
          const next = active.units.length === 1 ? active.units[0].productId : active.units[0].productId
          onSelect(active, isSelected ? null : next)
        }}
        aria-label={isSelected ? 'Remove activity' : 'Add activity'}
      >
        {unit.image?.url ? <img src={unit.image.url} alt="" /> : null}
      </button>
      <div className="option-card-body">
        <div className="option-card-content">
          <h3 className="option-card-name">{unit.name}</h3>
          <p className="option-card-meta">
            {unit.duration ? formatDuration(unit.duration) : ''}
            {unit.duration && unit.groupType ? ' · ' : ''}
            {unit.groupType ? groupTypeLabel(unit.groupType) : ''}
          </p>
          {unit.description ? (
            <p className="option-card-subtitle option-card-subtitle--clamp">{unit.description}</p>
          ) : null}
          <div className="optional-actions">
            {bucket.groups.length > 1 ? (
              <div className="day-chips" role="radiogroup" aria-label="Day">
                {bucket.groups.map((g, i) => (
                  <button
                    type="button"
                    key={g.productId}
                    role="radio"
                    aria-checked={i === dayIdx}
                    className={'chip' + (i === dayIdx ? ' chip--active' : '')}
                    onClick={() => setDayIdx(i)}
                  >
                    {g.date ?? `Day ${i + 1}`}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className={isSelected ? 'btn btn--tertiary btn--sm' : 'btn btn--secondary btn--sm'}
              onClick={() =>
                onSelect(
                  active,
                  isSelected
                    ? null
                    : active.units[0].productId,
                )
              }
            >
              {isSelected ? 'No thanks' : 'Add to trip'}
            </button>
            <button
              type="button"
              className="link-button btn-sm"
              onClick={() => onOpenDetails(unit)}
            >
              View details
            </button>
          </div>
        </div>
        <div className="option-card-price">
          <span className="option-card-delta">{formatDelta(active?.price ?? 0)}</span>
          <span className="option-card-total">{formatMoney(active?.price ?? 0)}</span>
        </div>
      </div>
    </article>
  )
}

function ActivityDetailsModal({
  unit,
  onClose,
}: {
  unit: LeisureUnit | null
  onClose: () => void
}) {
  const [imgIdx, setImgIdx] = useState(0)
  if (!unit) return null
  const images = unit.images?.length ? unit.images : unit.image ? [unit.image] : []
  const img = images[imgIdx]
  return (
    <Modal open={!!unit} onClose={onClose} wide title={unit.name}>
      {images.length ? (
        <div className="modal-gallery">
          {img?.url ? <img className="modal-gallery-img" src={img.url} alt="" /> : null}
          {images.length > 1 ? (
            <div className="modal-gallery-controls">
              <button
                type="button"
                className="modal-gallery-btn"
                onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                aria-label="Previous image"
              >
                ‹
              </button>
              <span className="modal-gallery-count">
                {imgIdx + 1} / {images.length}
              </span>
              <button
                type="button"
                className="modal-gallery-btn"
                onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                aria-label="Next image"
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="modal-meta">
        {unit.duration ? formatDuration(unit.duration) : ''}
        {unit.duration && unit.groupType ? ' · ' : ''}
        {unit.groupType ? groupTypeLabel(unit.groupType) : ''}
      </p>
      {unit.description ? <p className="modal-description">{unit.description}</p> : null}
      {unit.additionalInformation ? (
        <p className="modal-description">{unit.additionalInformation}</p>
      ) : null}
    </Modal>
  )
}
