import { processFakeTask } from "@/lib/fake-backend";
import { logger } from "@/lib/logger";

export async function GET() {
  logger.info("GET /api/demo handler enter");
  const result = await processFakeTask("route-handler-demo");
  logger.info("GET /api/demo handler exit");
  return Response.json({
    result,
    handledAt: new Date().toISOString(),
  });
}
