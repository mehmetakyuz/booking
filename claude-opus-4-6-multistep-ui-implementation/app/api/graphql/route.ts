import { NextRequest, NextResponse } from 'next/server'
import { getGraphQLUrl } from '@/lib/server-env'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const upstream = getGraphQLUrl()

  // Forward session header
  const sessionId = request.headers.get('x-tb-sessionid')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sessionId) headers['x-tb-sessionid'] = sessionId

  const res = await fetch(upstream, {
    method: 'POST',
    headers,
    body,
  })

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
