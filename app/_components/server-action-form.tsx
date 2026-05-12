"use client";

import { useActionState } from "react";
import { type ActionResult, runDemoAction } from "@/app/actions";

const initialState: ActionResult = { message: "" };

export function ServerActionForm() {
  const [state, formAction, pending] = useActionState(
    runDemoAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="text"
        name="taskName"
        defaultValue="my-task"
        className="border border-zinc-300 rounded px-3 py-2 text-sm w-full"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50 cursor-pointer"
      >
        {pending ? "実行中..." : "Server Action を実行"}
      </button>
      {state.message && (
        <p className="text-sm text-green-700 bg-green-50 rounded p-2 break-all font-mono">
          {state.message}
        </p>
      )}
    </form>
  );
}
