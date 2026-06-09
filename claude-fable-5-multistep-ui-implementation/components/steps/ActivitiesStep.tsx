'use client'

import React, { useEffect, useState } from 'react'
import { useBookingActions, useBookingState } from '@/lib/store'
import { SkeletonCards } from '../Loading'
import { Modal } from '../Modal'
import { GalleryCarousel } from '../Gallery'
import { PriceBlock } from '../PriceBlock'
import { StepFooter } from '../StepFooter'
import { formatDateLong, formatDuration, tourTypeLabel } from '@/lib/format'
import type { LeisureGroup, LeisureUnit } from '@/lib/types'

export function ActivitiesStep() {
  const state = useBookingState()
  const actions = useBookingActions()
  const { activities, activitiesLoading, payload, offerMeta } = state
  const currency = offerMeta?.currency ?? 'GBP'
  const [detailsUnit, setDetailsUnit] = useState<LeisureUnit | null>(null)

  useEffect(() => {
    actions.ensureActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (activitiesLoading || !activities) {
    return (
      <div className="step-panel">
        <h1 className="step-heading">Your activities</h1>
        <SkeletonCards count={2} />
      </div>
    )
  }

  const included = activities.leisures.filter((g) => !g.optional)
  const optional = activities.leisures.filter((g) => g.optional)
  const selectedLeisureIds = new Set((payload.products ?? []).filter((p) => p.id.startsWith('L:')).map((p) => p.id))

  return (
    <div className="step-panel">
      <h1 className="step-heading">Your activities</h1>

      {!activities.leisures.length ? (
        <p className="empty-note">There are no activities to choose for this trip.</p>
      ) : (
        <>
          {included.map((group) => (
            <IncludedGroup
              key={group.id}
              group={group}
              currency={currency}
              selectedLeisureIds={selectedLeisureIds}
              onSelect={(unitId) =>
                actions.setLeisureSelection(
                  group.units.map((u) => u.id),
                  unitId,
                )
              }
              onDetails={setDetailsUnit}
            />
          ))}

          {optional.map((group) => (
            <OptionalGroup
              key={group.id}
              group={group}
              currency={currency}
              basePrice={activities.basePrice}
              selectedLeisureIds={selectedLeisureIds}
              onSelect={(unitId) =>
                actions.setLeisureSelection(
                  group.units.map((u) => u.id),
                  unitId,
                )
              }
              onDetails={setDetailsUnit}
            />
          ))}
        </>
      )}

      {detailsUnit ? (
        <Modal title={detailsUnit.name ?? 'Activity details'} onClose={() => setDetailsUnit(null)} wide>
          <GalleryCarousel
            images={[detailsUnit.image?.url ?? null, ...detailsUnit.images.map((im) => im.url)]}
            alt={detailsUnit.name ?? 'Activity'}
          />
          <ActivityMeta unit={detailsUnit} />
          {detailsUnit.description ? <p className="modal-text">{detailsUnit.description}</p> : null}
          {detailsUnit.additionalInformation ? <p className="modal-text">{detailsUnit.additionalInformation}</p> : null}
        </Modal>
      ) : null}

      <StepFooter continueDisabled={state.receiptLoading} />
    </div>
  )
}

function ActivityMeta({ unit }: { unit: LeisureUnit }) {
  const duration = formatDuration(unit.duration)
  const tourType = tourTypeLabel(unit.groupType)
  if (!duration && !tourType && !unit.venue?.name) return null
  return (
    <p className="modal-meta">
      {[duration, tourType, unit.venue?.name].filter(Boolean).join(' · ')}
    </p>
  )
}

function ActivityCard({
  unit,
  isActive,
  isBaseline,
  delta,
  currency,
  onClick,
  onDetails,
}: {
  unit: LeisureUnit
  isActive: boolean
  isBaseline: boolean
  delta: number | null
  currency: string
  onClick: () => void
  onDetails: (unit: LeisureUnit) => void
}) {
  const duration = formatDuration(unit.duration)
  const tourType = tourTypeLabel(unit.groupType)
  return (
    <div
      className={`option-card activity-card${isActive ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
    >
      {unit.image?.url ? (
        <div className="option-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unit.image.url} alt="" className="option-img" loading="lazy" />
        </div>
      ) : null}
      <div className="option-content">
        <h3 className="option-title">{unit.name}</h3>
        <p className="option-meta">
          {duration ? <span>{duration}</span> : null}
          {tourType ? <span className="badge">{tourType}</span> : null}
        </p>
        {unit.description ? <p className="option-desc">{unit.description}</p> : null}
        <button
          type="button"
          className="text-link"
          onClick={(e) => {
            e.stopPropagation()
            onDetails(unit)
          }}
        >
          Activity details
        </button>
      </div>
      <PriceBlock isBaseline={isBaseline} delta={delta} total={unit.price} currency={currency} />
    </div>
  )
}

function IncludedGroup({
  group,
  currency,
  selectedLeisureIds,
  onSelect,
  onDetails,
}: {
  group: LeisureGroup
  currency: string
  selectedLeisureIds: Set<string>
  onSelect: (unitId: string) => void
  onDetails: (unit: LeisureUnit) => void
}) {
  // Backend-selected variation is the default active card and the baseline.
  const baseline = group.units.find((u) => u.selected) ?? group.units[0] ?? null
  const fromPayload = group.units.find((u) => selectedLeisureIds.has(u.id)) ?? null
  const active = fromPayload ?? baseline

  return (
    <section className="activity-group">
      <h2 className="section-heading">
        {group.date ? formatDateLong(group.date) : 'Included activity'}
      </h2>
      <div className="option-list">
        {group.units.map((unit) => (
          <ActivityCard
            key={unit.id}
            unit={unit}
            isActive={unit === active}
            isBaseline={baseline != null && unit === baseline}
            delta={baseline?.price != null && unit.price != null ? unit.price - baseline.price : null}
            currency={currency}
            onClick={() => {
              if (unit !== active) onSelect(unit.id)
            }}
            onDetails={onDetails}
          />
        ))}
      </div>
    </section>
  )
}

function OptionalGroup({
  group,
  currency,
  basePrice,
  selectedLeisureIds,
  onSelect,
  onDetails,
}: {
  group: LeisureGroup
  currency: string
  basePrice: number | null
  selectedLeisureIds: Set<string>
  onSelect: (unitId: string | null) => void
  onDetails: (unit: LeisureUnit) => void
}) {
  const active = group.units.find((u) => selectedLeisureIds.has(u.id)) ?? null

  return (
    <section className="activity-group">
      <h2 className="section-heading">
        {group.date ? formatDateLong(group.date) : 'Optional activity'}
      </h2>
      <div className="option-list">
        {group.units.map((unit) => (
          <ActivityCard
            key={unit.id}
            unit={unit}
            isActive={unit === active}
            isBaseline={false}
            delta={basePrice != null && unit.price != null ? unit.price - basePrice : null}
            currency={currency}
            onClick={() => {
              if (unit !== active) onSelect(unit.id)
            }}
            onDetails={onDetails}
          />
        ))}
        <button
          type="button"
          className={`board-option no-thanks${active == null ? ' is-selected' : ''}`}
          onClick={() => {
            if (active != null) onSelect(null)
          }}
        >
          <span className="board-option-body">
            <span className="board-option-name">No thanks</span>
            <span className="board-option-desc">Skip the activities on this day</span>
          </span>
        </button>
      </div>
    </section>
  )
}
