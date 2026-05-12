import { logger } from "@/lib/logger";

export type FakeUser = {
  id: number;
  name: string;
  role: string;
};

export async function fetchFakeUsers(): Promise<FakeUser[]> {
  logger.info("fetchFakeUsers start");
  await new Promise((r) => setTimeout(r, 50));
  const users = [
    { id: 1, name: "Alice", role: "Admin" },
    { id: 2, name: "Bob", role: "Editor" },
    { id: 3, name: "Carol", role: "Viewer" },
  ];
  logger.info({ count: users.length }, "fetchFakeUsers done");
  return users;
}

export async function processFakeTask(taskName: string): Promise<string> {
  logger.info({ taskName }, "processFakeTask start");
  await new Promise((r) => setTimeout(r, 30));
  const result = `Task "${taskName}" processed at ${new Date().toISOString()}`;
  logger.info({ taskName }, "processFakeTask done");
  return result;
}
