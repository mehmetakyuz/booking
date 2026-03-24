import { BookingState, CarExtra, CheckoutData, FlightOption, ReceiptData, StepId } from '@/lib/booking/types'

export type BookingAction =
  | { type: 'PATCH_STATE'; patch: Partial<BookingState> }
  | { type: 'SET_STEP_INDEX'; index: number }
  | { type: 'COMPLETE_STEP'; stepId: StepId }
  | { type: 'SET_RECEIPT_LOADING'; value: boolean }
  | { type: 'SET_RECEIPT'; receipt: ReceiptData | null }
  | { type: 'SET_FLIGHTS'; flights: FlightOption[] }
  | { type: 'SET_CAR_EXTRAS'; carId: string; extras: CarExtra[] }
  | { type: 'SET_CHECKOUT'; checkout: CheckoutData | null }
  | { type: 'SET_MOBILE_RECEIPT'; value: boolean }

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'PATCH_STATE':
      return { ...state, ...action.patch }
    case 'SET_STEP_INDEX':
      return { ...state, currentStepIndex: action.index }
    case 'COMPLETE_STEP':
      return state.completedStepIds.includes(action.stepId)
        ? state
        : { ...state, completedStepIds: [...state.completedStepIds, action.stepId] }
    case 'SET_RECEIPT_LOADING':
      return { ...state, receiptLoading: action.value }
    case 'SET_RECEIPT':
      return { ...state, receipt: action.receipt }
    case 'SET_FLIGHTS':
      return { ...state, flights: action.flights }
    case 'SET_CAR_EXTRAS':
      return {
        ...state,
        carExtrasByCarId: {
          ...state.carExtrasByCarId,
          [action.carId]: action.extras,
        },
      }
    case 'SET_CHECKOUT':
      return { ...state, checkout: action.checkout }
    case 'SET_MOBILE_RECEIPT':
      return { ...state, mobileReceiptOpen: action.value }
    default:
      return state
  }
}
