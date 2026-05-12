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
    ...(err.cause !== undefined && {
      cause: err.cause instanceof Error ? serializeError(err.cause) : err.cause,
    }),
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
  if (args.length >= 2) {
    return { message: args[0], meta: args[1] };
  }
  // length === 0: runtime safety guard
  return { message: undefined };
}

function normalizeRecord(
  levelName: LevelName,
  message: string | undefined,
  meta?: LogMeta,
): Record<string, unknown> {
  const traceCtx = getTraceContext();
  const normalizedMeta = normalizeMeta(meta);

  // Reserved fields first (JSON key order); they are never overridden by meta.
  const record: Record<string, unknown> = {
    level: levelName,
    time: Date.now(),
    ...(message !== undefined ? { msg: message } : {}),
  };

  if (normalizedMeta) {
    for (const [k, v] of Object.entries(normalizedMeta)) {
      if (!(k in record)) record[k] = v;
    }
  }

  if (traceCtx) {
    record.requestId = traceCtx.requestId;
    record.spanId = traceCtx.spanId;
  }

  return record;
}

function safeStringify(value: unknown): string {
  const ancestors: unknown[] = [];

  return JSON.stringify(value, function (_key, currentValue: unknown) {
    if (typeof currentValue === "bigint") {
      return currentValue.toString();
    }

    if (currentValue instanceof Error) {
      return serializeError(currentValue);
    }

    if (typeof currentValue === "object" && currentValue !== null) {
      while (ancestors.length > 0 && ancestors.at(-1) !== this) {
        ancestors.pop();
      }
      if (ancestors.includes(currentValue)) {
        return "[Circular]";
      }
      ancestors.push(currentValue);
    }

    return currentValue;
  });
}

function createLogger(levelName: LevelName) {
  return (...args: LogArgs) => {
    const { message, meta } = parseLogArgs(args);
    const output = safeStringify(normalizeRecord(levelName, message, meta));
    const stdout = getStdout();
    if (stdout) {
      stdout.write(`${output}\n`);
    } else {
      console[levelName](output);
    }
  };
}

export const logger = {
  info: createLogger("info"),
  error: createLogger("error"),
};
