import { processFakeTask } from "@/lib/fake-backend";

export async function GET() {
  const result = await processFakeTask("route-handler-demo");
  return Response.json({
    result,
    handledAt: new Date().toISOString(),
  });
}
