'use client'

import { Message } from '@/lib/booking/types'

export function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="assistant-label">{message.role === 'assistant' ? 'Booking assistant' : 'You'}</div>
      <div className={`bubble ${message.role}${message.type === 'selection' ? ' is-selection' : ''}`}>{message.content}</div>
    </div>
  )
}
