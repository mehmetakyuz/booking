import { NextRequest, NextResponse } from "next/server";
import { getGraphqlUrl } from "@/lib/graphql";

export const runtime = "nodejs";

/**
 * Proxies GraphQL requests from the browser to the upstream API and
 * forwards the `x-tb-sessionid` header so the backend sees one session
 * per booking journey.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sessionId = req.headers.get("x-tb-sessionid") || "";
  const upstream = await fetch(getGraphqlUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "x-tb-sessionid": sessionId } : {}),
    },
    body,
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
