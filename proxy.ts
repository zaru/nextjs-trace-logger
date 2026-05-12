import { context, propagation } from "@opentelemetry/api";
import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export function proxy(req: NextRequest) {
  const { method } = req;
  const { pathname, search } = req.nextUrl;

  logger.info("incoming request", {
    method,
    path: pathname + search,
    userAgent: req.headers.get("user-agent") ?? undefined,
    referer: req.headers.get("referer") ?? undefined,
  });

  // OTelコンテキストをリクエストヘッダに注入する
  // proxy(middleware)とRoute Handler/Page間でtraceIdがずれる既知問題 (Next.js #80445) の回避策
  const nextHeaders = new Headers(req.headers);
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  for (const [key, value] of Object.entries(carrier)) {
    nextHeaders.set(key, value);
  }

  return NextResponse.next({ request: { headers: nextHeaders } });
}

export const config = {
  matcher: [
    // Next.js内部リソース・静的ファイル・画像最適化を除外
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
