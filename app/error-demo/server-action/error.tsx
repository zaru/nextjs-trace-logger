"use client";

export default function ServerActionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-3xl mx-auto py-12 px-6 space-y-6 font-sans">
      <h1 className="text-2xl font-bold text-red-700">
        Server Action エラーが発生しました
      </h1>
      <div className="border border-red-300 bg-red-50 rounded-lg p-6 space-y-2">
        <p className="text-sm font-semibold text-red-800">エラーメッセージ:</p>
        <p className="text-sm text-red-700 font-mono break-all">
          {error.message}
        </p>
        {error.digest && (
          <p className="text-xs text-red-400">digest: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-red-600 text-white rounded px-4 py-2 text-sm cursor-pointer hover:bg-red-700"
        >
          もう一度試す
        </button>
        <a
          href="/error-demo"
          className="border border-zinc-300 rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          エラーデモ一覧へ戻る
        </a>
      </div>
    </main>
  );
}
