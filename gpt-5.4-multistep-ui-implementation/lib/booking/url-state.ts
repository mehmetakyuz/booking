import { BookingPayload, BookingState, CheckoutFormState, StepId, TravellersState } from '@/lib/booking/types'

export interface BookingUrlSnapshot {
  v: 1
  stepId: StepId
  completedStepIds: StepId[]
  payload: Omit<BookingPayload, 'offerMeta'>
  travellers: TravellersState
  checkoutForm: CheckoutFormState
}

function toBase64Url(value: string) {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64url')
  }

  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'base64url').toString('utf8')
  }

  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeBookingUrlSnapshot(state: BookingState) {
  const activeStep = state.steps[state.currentStepIndex]
  const { offerMeta, ...payload } = state.payload

  const snapshot: BookingUrlSnapshot = {
    v: 1,
    stepId: activeStep?.id ?? 'occupancy',
    completedStepIds: state.completedStepIds,
    payload,
    travellers: state.travellers,
    checkoutForm: state.checkoutForm,
  }

  return toBase64Url(JSON.stringify(snapshot))
}

export function decodeBookingUrlSnapshot(value: string): BookingUrlSnapshot | null {
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as BookingUrlSnapshot
    if (parsed?.v !== 1 || !parsed.payload?.offerId || !parsed.stepId) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
