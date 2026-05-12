import Link from "next/link";

export default function ErrorDemoPage() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-6 space-y-10 font-sans">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-blue-600 text-sm hover:underline">
          ← トップへ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">エラー発生デモ</h1>

      <section className="border border-zinc-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800">
          ④ Server Action で例外を発生させる
        </h2>
        <p className="text-sm text-zinc-500">
          ボタンを押すと Server Action 内で意図的に例外をスローします。 Error
          Boundary がキャッチしてエラー画面を表示します。
        </p>
        <Link
          href="/error-demo/server-action"
          className="inline-block bg-red-600 text-white rounded px-4 py-2 text-sm hover:bg-red-700"
        >
          Server Action エラーデモへ →
        </Link>
      </section>

      <section className="border border-zinc-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800">
          ⑤ Server Component のデータフェッチで例外を発生させる
        </h2>
        <p className="text-sm text-zinc-500">
          Server Component 内の擬似データフェッチ関数で例外が発生します。 Error
          Boundary がキャッチしてエラー画面を表示します。
        </p>
        <Link
          href="/error-demo/data-fetch"
          className="inline-block bg-red-600 text-white rounded px-4 py-2 text-sm hover:bg-red-700"
        >
          データフェッチエラーデモへ →
        </Link>
      </section>
    </main>
  );
}
