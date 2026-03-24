export interface GqlOptions {
  headers?: Record<string, string>
}

export async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: GqlOptions = {},
): Promise<T> {
  const isServer = typeof window === 'undefined'
  const endpoint = isServer
    ? process.env.GRAPHQL_URL!
    : '/api/graphql'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  const text = await res.text()
  let json: { data?: T; errors?: { message: string }[] }
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`GraphQL non-JSON response (${res.status}): ${text.slice(0, 180)}`)
  }

  if (json.errors?.length) throw new Error(json.errors[0].message)
  if (!json.data) throw new Error('Missing GraphQL data payload')
  return json.data
}
