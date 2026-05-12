import { trace } from "@opentelemetry/api";

type LevelName = "info" | "error";
type LogMeta = Record<string, unknown>;

// Edge Runtime では process.stdout が存在しないため動的にアクセスする
// Turbopack の静的解析が process.stdout リテラルを Edge 非互換として警告するため
// プロパティアクセスを間接化して回避する
const stdoutKey = "stdout" as const;

function getStdout(): NodeJS.WriteStream | undefined {
  if (
    typeof process !== "undefined" &&
    process[stdoutKey] &&
    typeof process[stdoutKey].write === "function"
  ) {
    return process[stdoutKey];
  }
  return undefined;
}

const CONSOLE_METHOD: Record<LevelName, LevelName> = {
  info: "info",
  error: "error",
};

function getTraceContext(): { requestId: string; spanId: string } | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;
  const ctx = span.spanContext();
  if (!ctx.traceId || ctx.traceId === "00000000000000000000000000000000") {
    return undefined;
  }
  return { requestId: ctx.traceId, spanId: ctx.spanId };
}

function serializeError(err: Error): Record<string, unknown> {
  return {
    type: err.name,
    message: err.message,
    stack: err.stack,
  };
}

function normalizeMeta(meta?: LogMeta): LogMeta | undefined {
  if (!meta) return undefined;

  if (meta.error instanceof Error) {
    return {
      ...meta,
      error: serializeError(meta.error),
    };
  }

  return meta;
}

type LogArgs =
  | [message: string]
  | [message: string, meta: LogMeta]
  | [meta: LogMeta, message: string]
  | [meta: LogMeta];

function parseLogArgs(args: LogArgs): {
  message: string | undefined;
  meta?: LogMeta;
} {
  if (args.length === 1) {
    return typeof args[0] === "string"
      ? { message: args[0] }
      : { message: undefined, meta: args[0] };
  }
  return typeof args[0] === "string"
    ? { message: args[0], meta: args[1] as LogMeta }
    : { message: args[1] as string, meta: args[0] as LogMeta };
}

function normalizeRecord(
  levelName: LevelName,
  message: string | undefined,
  meta?: LogMeta,
): Record<string, unknown> {
  const traceCtx = getTraceContext();
  const normalizedMeta = normalizeMeta(meta);

  const record: Record<string, unknown> = {
    ...(normalizedMeta ?? {}),
    level: levelName,
    time: Date.now(),
  };

  if (message !== undefined) {
    record.msg = message;
  }

  if (traceCtx) {
    record.requestId = traceCtx.requestId;
    record.spanId = traceCtx.spanId;
  }

  return record;
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  return JSON.stringify(value, (_key, currentValue: unknown) => {
    if (typeof currentValue === "bigint") {
      return currentValue.toString();
    }

    if (typeof currentValue === "object" && currentValue !== null) {
      if (seen.has(currentValue)) {
        return "[Circular]";
      }
      seen.add(currentValue);
    }

    return currentValue;
  });
}

function writeRecord(
  levelName: LevelName,
  record: Record<string, unknown>,
): void {
  const output = safeStringify(record);
  const stdout = getStdout();
  if (stdout) {
    stdout.write(`${output}\n`);
  } else {
    console[CONSOLE_METHOD[levelName]](output);
  }
}

export const logger = {
  info: (...args: LogArgs) => {
    const { message, meta } = parseLogArgs(args);
    writeRecord("info", normalizeRecord("info", message, meta));
  },
  error: (...args: LogArgs) => {
    const { message, meta } = parseLogArgs(args);
    writeRecord("error", normalizeRecord("error", message, meta));
  },
};
