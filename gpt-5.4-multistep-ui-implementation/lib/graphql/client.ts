export async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  options?: { endpoint?: string; next?: RequestInit['next']; headers?: Record<string, string> },
) {
  const endpoint = options?.endpoint ?? process.env.GRAPHQL_URL

  if (!endpoint) {
    throw new Error('GRAPHQL_URL is not configured.')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    next: options?.next,
  })

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> }

  if (json.errors?.length) {
    throw new Error(json.errors[0].message)
  }

  if (!json.data) {
    throw new Error('GraphQL response did not include data.')
  }

  return json.data
}
