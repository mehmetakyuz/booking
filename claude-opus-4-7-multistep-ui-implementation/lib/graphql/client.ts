// Thin GraphQL transport over native fetch (no Apollo).
//
// In the browser, requests go through the Next.js proxy at /api/graphql to
// avoid upstream CORS. On the server they hit GRAPHQL_URL directly.

function endpoint(): string {
  if (typeof window === "undefined") {
    return (
      process.env.GRAPHQL_URL ??
      "https://co.uk.sales.secretescapes.com/api/graphql/"
    );
  }
  return "/api/graphql";
}

export async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  sessionId?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionId) headers["x-tb-sessionid"] = sessionId;

  const res = await fetch(endpoint(), {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  if (!json.data) {
    throw new Error("Missing GraphQL data payload");
  }
  return json.data as T;
}
