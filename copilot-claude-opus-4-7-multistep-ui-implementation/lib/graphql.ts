const DEFAULT_URL = "https://co.uk.sales.secretescapes.com/api/graphql/";

export function getGraphqlUrl(): string {
  return process.env.GRAPHQL_URL || DEFAULT_URL;
}

export async function gqlServer<T>(
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(getGraphqlUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e: { message: string }) => e.message).filter(Boolean).join("; ") || "GraphQL error";
    throw new Error(msg);
  }
  if (!json.data) throw new Error("Missing GraphQL data payload");
  return json.data as T;
}

export async function gqlClient<T>(
  query: string,
  variables: Record<string, unknown> = {},
  sessionId?: string,
): Promise<T> {
  const url = typeof window === "undefined" ? getGraphqlUrl() : "/api/graphql";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "x-tb-sessionid": sessionId } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e: { message: string }) => e.message).filter(Boolean).join("; ") || "GraphQL error";
    throw new Error(msg);
  }
  if (!json.data) throw new Error("Missing GraphQL data payload");
  return json.data as T;
}
