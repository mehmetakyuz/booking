'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { ActivityOption } from '@/lib/booking/types'

/* ── Constants ── */

const GROUP_TYPE_LABELS: Record<string, string> = {
  GROUP_TOUR: 'Group tour',
  PRIVATE_TOUR: 'Private tour',
  SELF_GUIDED: 'Self-guided',
}

/* ── Duration parsing ── */

function parseDuration(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Try ISO 8601 duration: PT2H30M, PT1H, PT45M, etc.
  const iso = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (iso) {
    const hours = parseInt(iso[1] || '0', 10)
    const minutes = parseInt(iso[2] || '0', 10)
    return formatHoursMinutes(hours, minutes)
  }

  // Try plain number (minutes)
  const num = Number(raw)
  if (!isNaN(num) && num > 0) {
    const hours = Math.floor(num / 60)
    const minutes = num % 60
    return formatHoursMinutes(hours, minutes)
  }

  return raw
}

function formatHoursMinutes(hours: number, minutes: number): string {
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`)
  if (parts.length === 0) return '0 mins'
  return parts.join(' ')
}

/* ── Price formatting ── */

function formatPrice(pence: number): string {
  return `\u00A3${(pence / 100).toFixed(0)}`
}

function formatPriceDelta(delta: number): string {
  if (delta === 0) return '+\u00A30'
  if (delta > 0) return `+${formatPrice(delta)}`
  return `-${formatPrice(Math.abs(delta))}`
}

/* ── Grouping helpers ── */

interface IncludedGroup {
  groupId: string
  activities: ActivityOption[]
}

interface OptionalGroup {
  name: string
  activities: ActivityOption[]
}

function groupIncluded(activities: ActivityOption[]): IncludedGroup[] {
  const map = new Map<string, ActivityOption[]>()
  for (const a of activities) {
    if (a.optional) continue
    const arr = map.get(a.groupId) || []
    arr.push(a)
    map.set(a.groupId, arr)
  }
  return Array.from(map.entries()).map(([groupId, acts]) => ({ groupId, activities: acts }))
}

function groupOptional(activities: ActivityOption[]): OptionalGroup[] {
  const map = new Map<string, ActivityOption[]>()
  for (const a of activities) {
    if (!a.optional) continue
    const arr = map.get(a.name) || []
    arr.push(a)
    map.set(a.name, arr)
  }
  return Array.from(map.entries()).map(([name, acts]) => ({ name, activities: acts }))
}

/* ── Component ── */

export default function ActivitiesStep() {
  const { state, actions } = useBooking()
  const { activities, activitiesBasePrice, steps, currentStepIndex } = state

  /* ── Loading on mount ── */
  const [loading, setLoading] = useState(false)
  const [detailModal, setDetailModal] = useState<ActivityOption | null>(null)

  useEffect(() => {
    if (state.activities.length === 0 && !state.activitiesLoading) {
      setLoading(true)
      actions.loadActivities().finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isLoading = loading || state.activitiesLoading

  /* ── Grouped data ── */
  const includedGroups = useMemo(() => groupIncluded(activities), [activities])
  const optionalGroups = useMemo(() => groupOptional(activities), [activities])

  /* ── Selection helpers ── */

  // For included groups: find the baseline (backend-selected) activity in each group
  const baselinePriceByGroup = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of includedGroups) {
      const baseline = g.activities.find((a) => a.selected)
      if (baseline) map.set(g.groupId, baseline.price)
    }
    return map
  }, [includedGroups])

  const handleIncludedSelect = useCallback(
    async (activity: ActivityOption, group: IncludedGroup) => {
      // Deselect current selection in this group, select this one
      for (const a of group.activities) {
        if (a.selected && a.id !== activity.id) {
          await actions.updateActivitySelection(a.id, false)
        }
      }
      await actions.updateActivitySelection(activity.id, true)
    },
    [actions],
  )

  const handleOptionalToggle = useCallback(
    async (activity: ActivityOption, group: OptionalGroup) => {
      if (activity.selected) {
        // Deselect
        await actions.updateActivitySelection(activity.id, false)
      } else {
        // If group has only one variation, selecting it is automatic via the click
        // Deselect any other selected in the same group first
        for (const a of group.activities) {
          if (a.selected && a.id !== activity.id) {
            await actions.updateActivitySelection(a.id, false)
          }
        }
        await actions.updateActivitySelection(activity.id, true)
      }
    },
    [actions],
  )

  const handleOptionalNoThanks = useCallback(
    async (group: OptionalGroup) => {
      for (const a of group.activities) {
        if (a.selected) {
          await actions.updateActivitySelection(a.id, false)
        }
      }
    },
    [actions],
  )

  /* ── Auto-select single-variation optional groups on first opt-in ── */
  // This is handled inline: if group has 1 variation and user clicks the card, it selects.

  /* ── Continue / Back ── */
  const [confirming, setConfirming] = useState(false)

  async function handleContinue() {
    setConfirming(true)
    try {
      await actions.confirmActivities()
    } finally {
      setConfirming(false)
    }
  }

  const nextStep = steps[currentStepIndex + 1]
  const continueLabel = nextStep
    ? `Step ${currentStepIndex + 2}. ${nextStep.label}`
    : 'Continue'

  /* ── Render ── */
  return (
    <div className="step-panel">
      <div className="step-panel-header">
        <h2 className="step-title serif">Activities</h2>
      </div>

      <div className="step-panel-content" style={{ position: 'relative' }}>
        {/* Loading overlay */}
        {isLoading && (
          <div className="loader-overlay">
            <div className="loader-spinner" />
          </div>
        )}

        {/* ── Included activities ── */}
        {!isLoading && includedGroups.length > 0 && (
          <section className="activities-section">
            <h3 className="section-subtitle">Already included in your package</h3>

            {includedGroups.map((group) => {
              const baselinePrice = baselinePriceByGroup.get(group.groupId) ?? 0

              return (
                <div key={group.groupId} className="activity-group">
                  {group.activities.map((activity) => {
                    const isBaseline = activity.selected && activity.price === baselinePrice
                    const delta = activity.price - baselinePrice

                    return (
                      <button
                        key={activity.id}
                        type="button"
                        className={`option-card${activity.selected ? ' selected' : ''}`}
                        onClick={() => handleIncludedSelect(activity, group)}
                      >
                        {activity.imageUrl && (
                          <div className="option-card-image">
                            <img src={activity.imageUrl} alt={activity.name} />
                          </div>
                        )}
                        <div className="option-card-body">
                          <div className="option-card-main">
                            <div className="option-card-name">{activity.name}</div>
                            {activity.venueName && (
                              <div className="option-card-venue">{activity.venueName}</div>
                            )}
                            <div className="option-card-meta">
                              {parseDuration(activity.duration) && (
                                <span>{parseDuration(activity.duration)}</span>
                              )}
                              {activity.startTime && <span>{activity.startTime}</span>}
                            </div>
                            {activity.groupType && GROUP_TYPE_LABELS[activity.groupType] && (
                              <span className="badge">{GROUP_TYPE_LABELS[activity.groupType]}</span>
                            )}
                            <button
                              type="button"
                              className="btn-text"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDetailModal(activity)
                              }}
                            >
                              View details
                            </button>
                          </div>
                          <div className="option-card-pricing">
                            <span className="option-card-delta">
                              {isBaseline ? 'Included' : formatPriceDelta(delta)}
                            </span>
                            <span className="option-card-total">{formatPrice(activity.price)}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </section>
        )}

        {/* ── Optional activities ── */}
        {!isLoading && optionalGroups.length > 0 && (
          <section className="activities-section">
            <h3 className="section-subtitle">Optional activities</h3>

            {optionalGroups.map((group) => {
              const anySelected = group.activities.some((a) => a.selected)

              return (
                <div key={group.name} className="activity-group">
                  {group.activities.map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      className={`option-card${activity.selected ? ' selected' : ''}`}
                      onClick={() => handleOptionalToggle(activity, group)}
                    >
                      {activity.imageUrl && (
                        <div className="option-card-image">
                          <img src={activity.imageUrl} alt={activity.name} />
                        </div>
                      )}
                      <div className="option-card-body">
                        <div className="option-card-main">
                          <div className="option-card-name">{activity.name}</div>
                          {activity.venueName && (
                            <div className="option-card-venue">{activity.venueName}</div>
                          )}
                          <div className="option-card-meta">
                            {parseDuration(activity.duration) && (
                              <span>{parseDuration(activity.duration)}</span>
                            )}
                            {activity.startTime && <span>{activity.startTime}</span>}
                          </div>
                          {activity.groupType && GROUP_TYPE_LABELS[activity.groupType] && (
                            <span className="badge">{GROUP_TYPE_LABELS[activity.groupType]}</span>
                          )}
                          <button
                            type="button"
                            className="btn-text"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetailModal(activity)
                            }}
                          >
                            View details
                          </button>
                        </div>
                        <div className="option-card-pricing">
                          <span className="option-card-delta">
                            {formatPrice(activity.price)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* No thanks button for optional groups */}
                  <button
                    type="button"
                    className={`option-card option-card-no-thanks${!anySelected ? ' selected' : ''}`}
                    onClick={() => handleOptionalNoThanks(group)}
                  >
                    <div className="option-card-body">
                      <div className="option-card-main">
                        <div className="option-card-name">No thanks</div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </section>
        )}

        {!isLoading && includedGroups.length === 0 && optionalGroups.length === 0 && (
          <p className="empty-state">No activities available for this package.</p>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="step-panel-actions">
        <button type="button" className="btn-secondary" onClick={actions.goBack}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={confirming}
          onClick={handleContinue}
        >
          {confirming ? 'Loading...' : continueLabel}
        </button>
      </div>

      {/* ── Detail modal ── */}
      {detailModal && (
        <ActivityDetailModal
          activity={detailModal}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  )
}

/* ── Activity detail modal ── */

function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: ActivityOption
  onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const gallery = activity.gallery ?? []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          &times;
        </button>

        <h3 className="modal-title">{activity.name}</h3>

        {/* Image gallery */}
        {gallery.length > 0 && (
          <div className="modal-gallery">
            {gallery.map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.title || activity.name}
                className="modal-gallery-image"
              />
            ))}
          </div>
        )}

        {activity.description && (
          <div className="modal-section">
            <p>{activity.description}</p>
          </div>
        )}

        <div className="modal-section modal-details-grid">
          {activity.venueName && (
            <div className="modal-detail-row">
              <span className="modal-detail-label">Venue</span>
              <span className="modal-detail-value">{activity.venueName}</span>
            </div>
          )}
          {activity.duration && (
            <div className="modal-detail-row">
              <span className="modal-detail-label">Duration</span>
              <span className="modal-detail-value">{parseDuration(activity.duration)}</span>
            </div>
          )}
          {activity.startTime && (
            <div className="modal-detail-row">
              <span className="modal-detail-label">Start time</span>
              <span className="modal-detail-value">{activity.startTime}</span>
            </div>
          )}
          {activity.endTime && (
            <div className="modal-detail-row">
              <span className="modal-detail-label">End time</span>
              <span className="modal-detail-value">{activity.endTime}</span>
            </div>
          )}
          {activity.groupType && GROUP_TYPE_LABELS[activity.groupType] && (
            <div className="modal-detail-row">
              <span className="modal-detail-label">Type</span>
              <span className="modal-detail-value">{GROUP_TYPE_LABELS[activity.groupType]}</span>
            </div>
          )}
        </div>

        {activity.additionalInformation && (
          <div className="modal-section">
            <h4>Additional information</h4>
            <p>{activity.additionalInformation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
