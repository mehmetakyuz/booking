'use client'

import { useEffect, useRef } from 'react'
import { CurrentStepPanel } from '@/components/chat/CurrentStepPanel'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { useBooking } from '@/lib/booking/context'

export function ChatThread() {
  const {
    state: { messages },
  } = useBooking()
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <div className="chat-thread">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <CurrentStepPanel />
      <div ref={endRef} />
    </div>
  )
}
