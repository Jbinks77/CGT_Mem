import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/search", "/documentation", "/scripts", "/download"];
const PASSWORD = process.env.CMDMEM_PASSWORD ?? "Loulou77310!";

async function sha256(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("cmdmem_session")?.value;
  const expected = await sha256(PASSWORD);

  if (token === expected) return NextResponse.next();
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/search/:path*", "/documentation/:path*", "/scripts/:path*", "/download/:path*"],
};
