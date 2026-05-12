import Link from "next/link";
import { fetchFakeUsers } from "@/lib/fake-backend";
import { logger } from "@/lib/logger";
import { RouteHandlerClient } from "./_components/route-handler-client";
import { ServerActionForm } from "./_components/server-action-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  logger.info("rendering Home page");
  logger.info({ pos: "before" }, "rendering Home page");
  logger.info("rendering Home page", { pos: "after" });
  logger.info({ pos: "only" });
  const users = await fetchFakeUsers();

  return (
    <main className="max-w-3xl mx-auto py-12 px-6 space-y-10 font-sans">
      <h1 className="text-2xl font-bold text-zinc-900">
        Next.js App Router v16 — サンプル機能デモ
      </h1>

      {/* ① Server Component からの擬似データフェッチ */}
      <section className="border border-zinc-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800">
          ① Page Component から別ファイルでデータ取得
        </h2>
        <p className="text-sm text-zinc-500">
          Server Component が{" "}
          <code className="bg-zinc-100 px-1 rounded">lib/fake-backend.ts</code>{" "}
          の <code className="bg-zinc-100 px-1 rounded">fetchFakeUsers()</code>{" "}
          を <code className="bg-zinc-100 px-1 rounded">await</code>{" "}
          して取得した擬似ユーザーリスト。
        </p>
        <ul className="divide-y border border-zinc-200 rounded text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex justify-between px-4 py-2">
              <span className="font-medium text-zinc-700">{u.name}</span>
              <span className="text-zinc-400">{u.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ② Server Actions */}
      <section className="border border-zinc-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800">
          ② Server Actions
        </h2>
        <p className="text-sm text-zinc-500">
          ボタンを押すと{" "}
          <code className="bg-zinc-100 px-1 rounded">app/actions.ts</code> の
          Server Action がサーバー上で実行される。 タスク名を入力して試せます。
        </p>
        <ServerActionForm />
      </section>

      {/* ③ Route Handler */}
      <section className="border border-zinc-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800">③ Route Handler</h2>
        <p className="text-sm text-zinc-500">
          ボタンを押すとクライアントから{" "}
          <code className="bg-zinc-100 px-1 rounded">GET /api/demo</code> へ
          fetch し、Route Handler のレスポンスを表示する。
        </p>
        <RouteHandlerClient />
      </section>

      {/* エラーデモ */}
      <section className="border border-red-200 rounded-lg p-6 space-y-4 bg-red-50/30">
        <h2 className="text-lg font-semibold text-red-800">
          🚨 エラー発生デモ
        </h2>
        <p className="text-sm text-zinc-500">
          Server Action やデータフェッチで意図的にエラーを発生させるデモページ。
        </p>
        <Link
          href="/error-demo"
          className="inline-block bg-red-600 text-white rounded px-4 py-2 text-sm hover:bg-red-700"
        >
          エラーデモページへ →
        </Link>
      </section>
    </main>
  );
}
