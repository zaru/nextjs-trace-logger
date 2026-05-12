import { logger } from "@/lib/logger";

async function step1() {
  logger.info("step1");
  await new Promise((r) => setTimeout(r, 10));
}

async function step2() {
  logger.info("step2");
}

export async function GET() {
  logger.info("handler enter");
  await step1();
  await step2();
  logger.info("handler exit");
  return Response.json({ ok: true });
}
