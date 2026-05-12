import Link from "next/link";
import { ErrorActionForm } from "./_components/error-action-form";

export default function ServerActionErrorPage() {
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
        ④ Server Action エラーデモ
      </h1>

      <section className="border border-zinc-200 rounded-lg p-6 space-y-4">
        <p className="text-sm text-zinc-500">
          ボタンを押すと{" "}
          <code className="bg-zinc-100 px-1 rounded">
            app/error-demo/server-action/actions.ts
          </code>{" "}
          の Server Action 内で{" "}
          <code className="bg-zinc-100 px-1 rounded">throw new Error()</code>{" "}
          が実行されます。
        </p>
        <ErrorActionForm />
      </section>
    </main>
  );
}
