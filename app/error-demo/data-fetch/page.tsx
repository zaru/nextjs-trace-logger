import Link from "next/link";
import { fetchFakeOrders } from "@/lib/fake-backend-error";

export const dynamic = "force-dynamic";

export default async function DataFetchErrorPage() {
  const orders = await fetchFakeOrders();

  return (
    <main className="max-w-3xl mx-auto py-12 px-6 space-y-10 font-sans">
      <div className="flex items-center gap-4">
        <Link
          href="/error-demo"
          className="text-blue-600 text-sm hover:underline"
        >
          ← エラーデモ一覧へ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">
        ⑤ データフェッチエラーデモ
      </h1>

      <section className="border border-zinc-200 rounded-lg p-6 space-y-4">
        <p className="text-sm text-zinc-500">
          このページは表示されません。上の{" "}
          <code className="bg-zinc-100 px-1 rounded">fetchFakeOrders()</code>{" "}
          が常に例外をスローするため、Error Boundary にキャッチされます。
        </p>
        <ul className="divide-y border border-zinc-200 rounded text-sm">
          {orders.map((o) => (
            <li key={o.id} className="flex justify-between px-4 py-2">
              <span className="font-medium text-zinc-700">{o.item}</span>
              <span className="text-zinc-400">× {o.quantity}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
