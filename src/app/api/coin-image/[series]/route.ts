import {
  COIN_UPSTREAM_IMAGES,
  isVaultCoinSeries,
} from "@/lib/gold/coin-image-sources";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ series: string }> }
) {
  const { series } = await context.params;
  if (!isVaultCoinSeries(series)) {
    return new Response("Unknown coin series", { status: 404 });
  }

  const upstream = COIN_UPSTREAM_IMAGES[series];
  const res = await fetch(upstream, {
    headers: {
      "User-Agent": "FinanseApp/1.0 (bullion vault)",
      Accept: "image/*",
    },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!res.ok) {
    return new Response("Upstream image unavailable", { status: 502 });
  }

  const bytes = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/jpeg";

  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
    },
  });
}
