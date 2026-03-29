import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("cmdmem_session");
  response.cookies.delete("cmdmem_authed");
  return response;
}
