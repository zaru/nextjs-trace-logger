"use client";

import { useActionState } from "react";
import {
  type ErrorActionResult,
  triggerErrorAction,
} from "@/app/error-demo/server-action/actions";

const initialState: ErrorActionResult = { message: "" };

export function ErrorActionForm() {
  const [state, formAction, pending] = useActionState(
    triggerErrorAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        className="bg-red-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50 cursor-pointer hover:bg-red-700"
      >
        {pending ? "実行中..." : "例外を発生させる (Server Action)"}
      </button>
      {state.message && (
        <p className="text-sm text-green-700 bg-green-50 rounded p-2 break-all font-mono">
          {state.message}
        </p>
      )}
    </form>
  );
}
