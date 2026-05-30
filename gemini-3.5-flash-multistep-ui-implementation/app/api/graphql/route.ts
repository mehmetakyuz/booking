import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const sessionId = request.headers.get('x-tb-sessionid');
    if (sessionId) {
      headers['x-tb-sessionid'] = sessionId;
    }

    const targetUrl = process.env.GRAPHQL_URL || 'https://co.uk.sales.secretescapes.com/api/graphql/';
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { errors: [{ message: error.message || 'Internal Server Error' }] },
      { status: 500 }
    );
  }
}
