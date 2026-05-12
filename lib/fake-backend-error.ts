import { logger } from "@/lib/logger";

export type FakeOrder = {
  id: number;
  item: string;
  quantity: number;
};

export async function fetchFakeOrders(): Promise<FakeOrder[]> {
  logger.info("fetchFakeOrders start — this will fail");
  await new Promise((r) => setTimeout(r, 50));

  throw new Error(
    "データフェッチに失敗しました: 外部サービスへの接続がタイムアウトしました (fetchFakeOrders)",
  );
}
