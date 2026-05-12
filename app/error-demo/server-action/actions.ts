"use server";

import { logger } from "@/lib/logger";

export type ErrorActionResult = {
  message: string;
  error?: string;
};

export async function triggerErrorAction(
  _prevState: ErrorActionResult,
  _formData: FormData,
): Promise<ErrorActionResult> {
  logger.info("triggerErrorAction called — about to throw");
  throw new Error(
    "Server Action で意図的に発生させた例外です (triggerErrorAction)",
  );
}
