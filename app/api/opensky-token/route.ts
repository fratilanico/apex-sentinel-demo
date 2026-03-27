/**
 * Returns a short-lived OpenSky OAuth2 access token to the client.
 * Client_secret stays server-side; client uses the access_token directly.
 */
import { NextResponse } from "next/server";

const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const CLIENT_ID     = process.env.OPENSKY_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET || '';

let tokenCache: { token: string; expires: number } | null = null;

export async function GET() {
  if (tokenCache && Date.now() < tokenCache.expires - 30000) {
    return NextResponse.json({ token: tokenCache.token, cached: true });
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ error: 'no_credentials' }, { status: 503 });
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `token_fetch_failed_${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    tokenCache = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
    return NextResponse.json({ token: data.access_token });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
