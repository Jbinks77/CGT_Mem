import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const PASSWORD = process.env.CMDMEM_PASSWORD ?? "Loulou77310!";

function sha256(str: string): string {
  return createHash("sha256").update(str).digest("hex");
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const token = sha256(PASSWORD);
  const isProd = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true });
  response.cookies.set("cmdmem_session", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    path: "/",
  });
  // Cookie non-httpOnly pour affichage conditionnel côté client (Nav)
  response.cookies.set("cmdmem_authed", "1", {
    httpOnly: false,
    secure: isProd,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
