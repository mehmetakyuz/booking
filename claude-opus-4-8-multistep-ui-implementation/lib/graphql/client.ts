// Thin GraphQL transport over native fetch (no Apollo).
//
// In the browser, requests go through the same-origin /api/graphql proxy so the
// upstream GRAPHQL_URL stays server-side and CORS is never an issue. On the
// server we hit GRAPHQL_URL directly.

function endpoint(): string {
  if (typeof window === "undefined") {
    const url = process.env.GRAPHQL_URL;
    if (!url) throw new Error("GRAPHQL_URL is not configured");
    return url;
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
  });

  let json: { data?: T; errors?: { message?: string }[] };
  try {
    json = await res.json();
  } catch {
    throw new Error(`GraphQL request failed (HTTP ${res.status})`);
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }

  if (!json.data) {
    throw new Error("Missing GraphQL data payload");
  }

  return json.data;
}
