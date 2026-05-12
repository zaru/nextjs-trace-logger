import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}

// Next.jsが捕捉したリクエスト処理エラーをログに残す
// loggerは動的importにすること (静的importだとPinoInstrumentationのpatch前に読み込まれてtraceIdが付かない)
export const onRequestError: Instrumentation.onRequestError = async (err) => {
  const { logger } = await import("@/lib/logger");
  logger.error(err);
};
