import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const backendBase = process.env.NETWATCHER_BACKEND_URL ?? "http://127.0.0.1:8080";

export async function GET() {
  const response = await fetch(new URL("/healthz", backendBase), { cache: "no-store" });
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
