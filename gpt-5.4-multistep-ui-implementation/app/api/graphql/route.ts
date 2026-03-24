import { NextRequest, NextResponse } from 'next/server'
import { requireServerEnv } from '@/lib/server-env'

export async function POST(request: NextRequest) {
  const endpoint = requireServerEnv('GRAPHQL_URL')
  const sessionId = request.headers.get('x-tb-sessionid')

  const body = await request.text()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'x-tb-sessionid': sessionId } : {}),
    },
    body,
    cache: 'no-store',
  })

  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
