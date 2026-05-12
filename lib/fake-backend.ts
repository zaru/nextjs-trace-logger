export type FakeUser = {
  id: number;
  name: string;
  role: string;
};

export async function fetchFakeUsers(): Promise<FakeUser[]> {
  await new Promise((r) => setTimeout(r, 50));
  return [
    { id: 1, name: "Alice", role: "Admin" },
    { id: 2, name: "Bob", role: "Editor" },
    { id: 3, name: "Carol", role: "Viewer" },
  ];
}

export async function processFakeTask(taskName: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 30));
  return `Task "${taskName}" processed at ${new Date().toISOString()}`;
}
