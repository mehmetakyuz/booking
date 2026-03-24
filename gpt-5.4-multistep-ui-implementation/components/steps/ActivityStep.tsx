'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { getBackendDefault } from '@/lib/booking/selection'
import { ActivityOption } from '@/lib/booking/types'
import { formatPrice, formatPriceDelta } from '@/lib/utils/price'
import { getNextStepLabel, PanelLoadingState, StepFooter, StepShell } from '@/components/steps/shared'

function formatDayLabel(value?: string | null) {
  if (!value) return 'Unscheduled'
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}

function formatDurationLabel(value?: string | null) {
  if (!value) return ''

  const match = value.match(/^P(?:T(?:(\d+)H)?(?:(\d+)M)?)$/)
  if (!match) return value

  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const parts: string[] = []

  if (hours) {
    parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  }

  if (minutes) {
    parts.push(`${minutes} min${minutes === 1 ? '' : 's'}`)
  }

  return parts.join(' ') || value
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  GROUP_TOUR: 'Group tour',
  PRIVATE_TOUR: 'Private tour',
  SELF_GUIDED: 'Self-guided',
  TICKET_ONLY: 'Ticket only',
}

function formatGroupTypeLabel(value?: string | null) {
  if (!value) return ''
  return GROUP_TYPE_LABELS[value] ?? value
}

function truncateText(value?: string | null, maxLength = 96) {
  if (!value) return ''
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trimEnd()}…`
}

function getActivitySummary(activity: ActivityOption) {
  const parts = [
    activity.duration ? formatDurationLabel(activity.duration) : '',
    activity.startTime ? `${activity.startTime}${activity.endTime ? ` - ${activity.endTime}` : ''}` : '',
    truncateText(activity.description),
  ].filter(Boolean)

  return parts.join(' · ')
}

type ActivityGroup = {
  key: string
  title: string
  optional: boolean
  items: ActivityOption[]
}

function getDefaultItem(group: ActivityGroup, payloadProducts: Array<{ id: string }>) {
  const payloadSelection = payloadProducts.find((product) => group.items.some((item) => item.id === product.id))
  return group.optional
    ? group.items.find((item) => item.id === payloadSelection?.id)
    : group.items.find((item) => item.id === payloadSelection?.id) ?? getBackendDefault(group.items)
}

export function ActivityStep() {
  const {
    state: { activities, activitiesBasePrice, activitiesLoading, currentStepIndex, payload, receipt, steps },
    actions,
  } = useBooking()

  const groupedActivities = useMemo(() => {
    const groups = new Map<string, ActivityGroup>()

    activities.forEach((activity) => {
      const key = activity.optional
        ? `${activity.name}::optional`
        : `${activity.groupId}::included`
      const existing = groups.get(key)
      if (existing) {
        existing.items.push(activity)
        existing.optional = existing.optional && activity.optional
        return
      }
      groups.set(key, {
        key,
        title: activity.name,
        optional: activity.optional,
        items: [activity],
      })
    })

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((left, right) => {
          const dateOrder = (left.date ?? '').localeCompare(right.date ?? '')
          if (dateOrder !== 0) return dateOrder
          return left.name.localeCompare(right.name)
        }),
      }))
      .sort((left, right) => Number(left.optional) - Number(right.optional))
  }, [activities])

  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string>>(
    Object.fromEntries(
      groupedActivities.map((group) => [group.key, getDefaultItem(group, payload.products)?.id ?? '']),
    ),
  )
  const [activeDayByGroup, setActiveDayByGroup] = useState<Record<string, string>>(
    Object.fromEntries(
      groupedActivities.map((group) => [group.key, getDefaultItem(group, payload.products)?.date ?? '']),
    ),
  )
  const [detailsId, setDetailsId] = useState('')
  const [detailsGalleryIndex, setDetailsGalleryIndex] = useState(0)
  const [selectionBusy, setSelectionBusy] = useState(false)
  const detailsActivity = activities.find((activity) => activity.id === detailsId) ?? null
  const detailsGallery = useMemo(
    () =>
      detailsActivity
        ? [detailsActivity.imageUrl, ...detailsActivity.gallery.map((image) => image.url)]
            .filter(Boolean)
            .filter((value, index, items) => items.indexOf(value) === index)
        : [],
    [detailsActivity],
  )
  const detailsGalleryImage = detailsGallery[Math.min(detailsGalleryIndex, Math.max(detailsGallery.length - 1, 0))] ?? ''

  useEffect(() => {
    setSelectedByGroup(
      Object.fromEntries(
        groupedActivities.map((group) => [group.key, getDefaultItem(group, payload.products)?.id ?? '']),
      ),
    )
    setActiveDayByGroup(
      Object.fromEntries(
        groupedActivities.map((group) => [group.key, getDefaultItem(group, payload.products)?.date ?? '']),
      ),
    )
  }, [groupedActivities, payload.products])

  const selectedIds = groupedActivities
    .map((group) => selectedByGroup[group.key])
    .filter(Boolean)

  async function applyActivitySelection(nextByGroup: Record<string, string>) {
    setSelectedByGroup(nextByGroup)
    setSelectionBusy(true)
    try {
      await actions.previewActivities(
        groupedActivities.map((group) => nextByGroup[group.key]).filter(Boolean),
      )
    } finally {
      setSelectionBusy(false)
    }
  }

  return (
    <StepShell
      eyebrow={`Step ${currentStepIndex + 1}`}
      title="Add activities"
    >
      {activitiesLoading ? (
        <PanelLoadingState detail="Available activities are loading in this panel." title="Loading activities…" />
      ) : null}
      {selectionBusy ? <div className="helper-text">Updating activities and pricing…</div> : null}
      {!activitiesLoading && groupedActivities.length ? (
        <div className="activity-groups">
          {groupedActivities.map((group) => {
              const selectedId = selectedByGroup[group.key]
              const defaultItem = getDefaultItem(group, payload.products)
              const selectedItem = selectedId
                ? group.items.find((item) => item.id === selectedId) ?? null
                : group.optional
                  ? null
                  : defaultItem ?? null
            const dayValues = Array.from(new Set(group.items.map((item) => item.date ?? '')))
            const chipSelectedDay = activeDayByGroup[group.key] || selectedItem?.date || ''
            const visibleDay = chipSelectedDay || dayValues[0] || ''
            const visibleItems = visibleDay ? group.items.filter((item) => (item.date ?? '') === visibleDay) : []
            const baselineIncludedId = defaultItem?.id ?? ''
            const baselineIncludedPrice = defaultItem?.price ?? 0
            const optionalBaselinePrice = activitiesBasePrice || receipt?.totalPrice || 0

            return (
              <section className="activity-group" key={group.key}>
                <div className="activity-group-header">
                  <div>
                    <h3 className="section-heading">{group.title}</h3>
                    <p className="muted">
                      {group.optional
                        ? 'Optional activity'
                        : group.items.length > 1
                          ? 'Included activity · choose one variation'
                          : 'Included activity'}
                    </p>
                  </div>
                  <span className={`activity-status${group.optional ? '' : ' is-included'}`}>
                    {group.optional ? (selectedId ? 'Added' : 'Optional') : 'Included'}
                  </span>
                </div>

                <div className="chip-row">
                  {group.optional ? (
                    <button
                      className={`chip${selectedId ? '' : ' is-selected'}`}
                      disabled={selectionBusy}
                      onClick={() => {
                        setActiveDayByGroup((value) => ({ ...value, [group.key]: '' }))
                        void applyActivitySelection({
                          ...selectedByGroup,
                          [group.key]: '',
                        })
                      }}
                      type="button"
                    >
                      No thanks
                    </button>
                  ) : null}
                  {dayValues.map((dayValue) => (
                    <button
                      className={`chip${chipSelectedDay === dayValue ? ' is-selected' : ''}`}
                      disabled={selectionBusy}
                      key={`${group.key}-${dayValue || 'unscheduled'}`}
                      onClick={() => {
                        setActiveDayByGroup((value) => ({ ...value, [group.key]: dayValue }))
                        const itemsForDay = group.items.filter((item) => (item.date ?? '') === dayValue)
                        if (!group.optional) {
                          const nextItem = getBackendDefault(itemsForDay)
                          if (nextItem) {
                            void applyActivitySelection({
                              ...selectedByGroup,
                              [group.key]: nextItem.id,
                            })
                          }
                        } else if (itemsForDay.length === 1) {
                          void applyActivitySelection({
                            ...selectedByGroup,
                            [group.key]: itemsForDay[0]?.id ?? '',
                          })
                        }
                      }}
                      type="button"
                    >
                      {formatDayLabel(dayValue || null)}
                    </button>
                  ))}
                </div>

                {visibleItems.length ? (
                  <div className="activity-variation-list">
                    {visibleItems.map((activity) => {
                      const isSelected = selectedId === activity.id || (!selectedId && !group.optional && selectedItem?.id === activity.id)
                      const isIncludedBaseline = !group.optional && activity.id === baselineIncludedId
                      return (
                        <article
                          className={`activity-card${group.optional ? '' : ' is-included'}${isSelected ? ' is-selected' : ''}`}
                          key={activity.id}
                          onClick={() =>
                            void applyActivitySelection({
                              ...selectedByGroup,
                              [group.key]: activity.id,
                            })
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              void applyActivitySelection({
                                ...selectedByGroup,
                                [group.key]: activity.id,
                              })
                            }
                          }}
                        >
                          <div className="activity-card-media">
                            {activity.imageUrl ? (
                              <img alt={activity.name} className="activity-card-image" src={activity.imageUrl} />
                            ) : (
                              <div className="activity-card-image activity-card-image-fallback" />
                            )}
                          </div>
                          <div className="activity-card-copy">
                            <div className="activity-card-top">
                              <div>
                                <strong>{activity.name}</strong>
                                <p className="muted">{getActivitySummary(activity)}</p>
                              </div>
                              <div className="option-price-block">
                                <span className={`option-price-delta${isIncludedBaseline ? ' is-included' : ''}`}>
                                  {group.optional
                                    ? formatPriceDelta(activity.price, optionalBaselinePrice, '+£0')
                                    : isIncludedBaseline
                                      ? 'Included'
                                      : formatPriceDelta(activity.price, baselineIncludedPrice, '+£0')}
                                </span>
                                <span className="option-price-note">{formatPrice(activity.price)} total</span>
                              </div>
                            </div>
                            <div className="activity-meta">
                              {activity.date ? <span>{formatDayLabel(activity.date)}</span> : null}
                              {activity.startTime ? <span>{activity.startTime}{activity.endTime ? ` - ${activity.endTime}` : ''}</span> : null}
                              {activity.duration ? <span>{formatDurationLabel(activity.duration)}</span> : null}
                              {activity.venueName ? <span>{activity.venueName}</span> : null}
                              {activity.groupType ? <span>{formatGroupTypeLabel(activity.groupType)}</span> : null}
                            </div>
                            <div className="activity-actions">
                              <button
                                className="link-button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setDetailsGalleryIndex(0)
                                  setDetailsId(activity.id)
                                }}
                                type="button"
                              >
                                View activity details
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      ) : !activitiesLoading ? (
        <div className="info-banner">Activities are already included for this trip.</div>
      ) : null}

      <StepFooter
        backLabel="Back"
        continueLabel={getNextStepLabel(steps, currentStepIndex)}
        onBack={actions.goBack}
        onContinue={() => {
          void actions.confirmActivities(selectedIds)
        }}
      >
        <button
          className="link-button"
          onClick={() => {
            void actions.confirmActivities(
              groupedActivities
                .filter((group) => !group.optional)
                .map((group) => selectedByGroup[group.key])
                .filter(Boolean),
            )
          }}
          type="button"
        >
          Skip this step
        </button>
      </StepFooter>

      {detailsActivity ? (
        <div aria-modal="true" className="hero-modal-backdrop" onClick={() => setDetailsId('')} role="dialog">
          <div className="hero-modal accommodation-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hero-modal-header">
              <h2>{detailsActivity.name}</h2>
              <button aria-label="Close modal" className="modal-close-button" onClick={() => setDetailsId('')} type="button">
                <span aria-hidden="true">×</span>
              </button>
            </div>
            {detailsGalleryImage ? (
              <div className="details-modal-gallery-shell">
                <img alt={detailsActivity.name} className="accommodation-modal-image" src={detailsGalleryImage} />
                {detailsGallery.length > 1 ? (
                  <>
                    <button
                      aria-label={`Previous image for ${detailsActivity.name}`}
                      className="gallery-nav gallery-nav-prev"
                      onClick={() => setDetailsGalleryIndex((value) => (value === 0 ? detailsGallery.length - 1 : value - 1))}
                      type="button"
                    >
                      ‹
                    </button>
                    <button
                      aria-label={`Next image for ${detailsActivity.name}`}
                      className="gallery-nav gallery-nav-next"
                      onClick={() => setDetailsGalleryIndex((value) => (value === detailsGallery.length - 1 ? 0 : value + 1))}
                      type="button"
                    >
                      ›
                    </button>
                    <div className="gallery-dots details-modal-gallery-dots">
                      {detailsGallery.map((image, index) => (
                        <button
                          aria-label={`Show image ${index + 1} for ${detailsActivity.name}`}
                          className={`gallery-dot${index === detailsGalleryIndex ? ' is-active' : ''}`}
                          key={`${detailsActivity.id}-${image}-${index}`}
                          onClick={() => setDetailsGalleryIndex(index)}
                          type="button"
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="accommodation-modal-copy">
              {detailsActivity.description ? <p>{detailsActivity.description}</p> : null}
              <div className="activity-meta">
                {detailsActivity.date ? <span>{formatDayLabel(detailsActivity.date)}</span> : null}
                {detailsActivity.startTime ? <span>{detailsActivity.startTime}{detailsActivity.endTime ? ` - ${detailsActivity.endTime}` : ''}</span> : null}
                {detailsActivity.duration ? <span>{formatDurationLabel(detailsActivity.duration)}</span> : null}
                {detailsActivity.venueName ? <span>{detailsActivity.venueName}</span> : null}
              </div>
              {detailsActivity.additionalInformation ? (
                <div>
                  <h3>Additional information</h3>
                  <p>{detailsActivity.additionalInformation}</p>
                </div>
              ) : null}
              {detailsActivity.postBookingInformation ? (
                <div>
                  <h3>After booking</h3>
                  <p>{detailsActivity.postBookingInformation}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </StepShell>
  )
}
