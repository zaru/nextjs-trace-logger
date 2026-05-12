import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}

function getErrorDigest(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("digest" in err)) {
    return undefined;
  }

  const { digest } = err;
  return typeof digest === "string" ? digest : undefined;
}

// Next.jsが捕捉したリクエスト処理エラーをログに残す
export const onRequestError: Instrumentation.onRequestError = async (err) => {
  const { logger } = await import("@/lib/logger");
  logger.error("request error captured by Next.js", {
    digest: getErrorDigest(err),
    error: err instanceof Error ? err : new Error(String(err)),
  });
};
