import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPSTREAM = process.env.GRAPHQL_URL ?? 'https://co.uk.sales.secretescapes.com/api/graphql/'
const FORWARDED = ['x-tb-sessionid', 'content-type', 'accept', 'accept-language']

async function proxy(req: NextRequest) {
  const body = req.method === 'GET' ? undefined : await req.text()
  const headers: Record<string, string> = {}
  for (const h of FORWARDED) {
    const v = req.headers.get(h)
    if (v) headers[h] = v
  }
  if (!headers['content-type']) headers['content-type'] = 'application/json'
  if (!headers['accept']) headers['accept'] = 'application/json'

  const res = await fetch(UPSTREAM, {
    method: req.method,
    headers,
    body,
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
    },
  })
}

export const POST = proxy
export const GET = proxy
