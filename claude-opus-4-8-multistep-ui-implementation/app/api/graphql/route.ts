import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy to the upstream GraphQL API. Keeps GRAPHQL_URL server-side
// and forwards the per-session x-tb-sessionid header.
export async function POST(req: NextRequest) {
  const url = process.env.GRAPHQL_URL;
  if (!url) {
    return NextResponse.json(
      { errors: [{ message: "GRAPHQL_URL is not configured" }] },
      { status: 500 },
    );
  }

  const body = await req.text();
  const sessionId = req.headers.get("x-tb-sessionid");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["x-tb-sessionid"] = sessionId;

  try {
    const upstream = await fetch(url, { method: "POST", headers, body });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Upstream GraphQL request failed" }] },
      { status: 502 },
    );
  }
}
