"use client";

import { useState } from "react";

export function RouteHandlerClient() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    setLoading(true);
    try {
      const res = await fetch("/api/demo");
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading}
        className="bg-purple-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50 cursor-pointer"
      >
        {loading ? "フェッチ中..." : "Route Handler を fetch"}
      </button>
      {result && (
        <pre className="text-xs text-purple-900 bg-purple-50 rounded p-3 overflow-auto font-mono">
          {result}
        </pre>
      )}
    </div>
  );
}
