import { NextRequest, NextResponse } from 'next/server'

const GRAPHQL_URL = process.env.GRAPHQL_URL ?? 'https://co.uk.sales.secretescapes.com/api/graphql/'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sessionId = request.headers.get('x-tb-sessionid')

  const upstream = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'x-tb-sessionid': sessionId } : {}),
    },
    body,
    cache: 'no-store',
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  })
}
