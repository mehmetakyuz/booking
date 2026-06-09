// Thin GraphQL transport over native fetch.
// In the browser all calls go through the same-origin /api/graphql proxy.

export async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  const url = typeof window === 'undefined' ? process.env.GRAPHQL_URL! : '/api/graphql'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json().catch(() => null)

  if (!json) {
    throw new Error(`GraphQL request failed (HTTP ${res.status})`)
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0].message || 'GraphQL error')
  }

  if (!json.data) {
    throw new Error('Missing GraphQL data payload')
  }

  return json.data as T
}
