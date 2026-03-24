const ENDPOINT = process.env.GRAPHQL_URL ?? '/api/graphql'

export async function gql<T = any>(
  query: string,
  variables: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()

  if (json.errors?.length) {
    const messages = json.errors.map((e: any) => e.message).join(' | ')
    console.error('[GraphQL errors]', messages, json.errors)
    if (!json.data) throw new Error(messages)
    console.warn('[GraphQL partial data]', messages)
  }

  if (!json.data) throw new Error('Missing GraphQL data payload')

  return json.data
}
