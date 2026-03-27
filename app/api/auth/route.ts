import { NextResponse } from "next/server";

const PASSWORD = process.env.SITE_PASSWORD || "APEX!2026!ATLANTIS";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("apex_auth", PASSWORD, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  return res;
}
