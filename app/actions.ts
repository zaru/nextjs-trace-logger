"use server";

import { processFakeTask } from "@/lib/fake-backend";

export type ActionResult = {
  message: string;
};

export async function runDemoAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const taskName = String(formData.get("taskName") || "demo-task");
  const message = await processFakeTask(taskName);
  return { message };
}
