export async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  const isServer = typeof window === 'undefined';
  const url = isServer
    ? process.env.GRAPHQL_URL || 'https://co.uk.sales.secretescapes.com/api/graphql/'
    : '/api/graphql';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed with status ${res.status}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  if (!json.data) {
    throw new Error('Missing GraphQL data payload');
  }

  return json.data;
}
