import { NextRequest, NextResponse } from "next/server";

const GRAPHQL_URL =
  process.env.GRAPHQL_URL ??
  "https://co.uk.sales.secretescapes.com/api/graphql/";

// Browser cannot call the upstream API directly (CORS), so all GraphQL traffic
// is proxied through this route. The session header is forwarded verbatim.
export async function POST(req: NextRequest) {
  const body = await req.text();

  const sessionId = req.headers.get("x-tb-sessionid");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionId) headers["x-tb-sessionid"] = sessionId;

  try {
    const upstream = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers,
      body,
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { errors: [{ message: `Upstream request failed: ${(err as Error).message}` }] },
      { status: 502 },
    );
  }
}
