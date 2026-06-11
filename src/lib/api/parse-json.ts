import { NextResponse } from "next/server";

const DEFAULT_MAX_BYTES = 64 * 1024;

export async function parseJsonBody<T>(
  request: Request,
  maxBytes = DEFAULT_MAX_BYTES
): Promise<{ data: T } | NextResponse> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) {
    return NextResponse.json({ error: "Zbyt duży payload" }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "Nie można odczytać body" }, { status: 400 });
  }

  if (raw.length > maxBytes) {
    return NextResponse.json({ error: "Zbyt duży payload" }, { status: 413 });
  }

  if (!raw.trim()) {
    return NextResponse.json({ error: "Pusty body" }, { status: 400 });
  }

  try {
    return { data: JSON.parse(raw) as T };
  } catch {
    return NextResponse.json({ error: "Niepoprawny JSON" }, { status: 400 });
  }
}
