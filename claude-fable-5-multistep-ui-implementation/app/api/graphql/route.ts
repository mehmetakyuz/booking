import { NextRequest, NextResponse } from 'next/server'

// Proxy to the upstream GraphQL API so the browser avoids CORS issues.
export async function POST(req: NextRequest) {
  const url = process.env.GRAPHQL_URL
  if (!url) {
    return NextResponse.json({ errors: [{ message: 'GRAPHQL_URL is not configured' }] }, { status: 500 })
  }

  const body = await req.text()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const sessionId = req.headers.get('x-tb-sessionid')
  if (sessionId) headers['x-tb-sessionid'] = sessionId

  const upstream = await fetch(url, { method: 'POST', headers, body, cache: 'no-store' })
  const text = await upstream.text()

  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
