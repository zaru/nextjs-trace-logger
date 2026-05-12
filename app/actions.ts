"use server";

import { processFakeTask } from "@/lib/fake-backend";
import { logger } from "@/lib/logger";

export type ActionResult = {
  message: string;
};

export async function runDemoAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const taskName = String(formData.get("taskName") || "demo-task");
  logger.info("runDemoAction called", { taskName });
  const message = await processFakeTask(taskName);
  return { message };
}
