import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}

// Next.jsが捕捉したリクエスト処理エラーをログに残す
export const onRequestError: Instrumentation.onRequestError = async (err) => {
  const { logger } = await import("@/lib/logger");
  logger.error(err);
};
