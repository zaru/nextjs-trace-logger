import { trace } from "@opentelemetry/api";

const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const;

type LevelName = keyof typeof LEVELS;

const threshold =
  LEVELS[(process.env.LOG_LEVEL ?? "info") as LevelName] ?? LEVELS.info;

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

const CONSOLE_METHOD: Record<LevelName, "debug" | "info" | "warn" | "error"> = {
  trace: "debug",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "error",
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

function write(levelName: LevelName, output: string): void {
  const stdout = getStdout();
  if (stdout) {
    stdout.write(output);
  } else {
    console[CONSOLE_METHOD[levelName]](output);
  }
}

function emit(
  levelName: LevelName,
  obj: Record<string, unknown> | undefined,
  msg: string,
): void {
  const levelNum = LEVELS[levelName];
  if (levelNum < threshold) return;

  const traceCtx = getTraceContext();

  const record: Record<string, unknown> = {
    level: levelNum,
    time: Date.now(),
    ...obj,
    msg,
  };
  if (traceCtx) {
    record.requestId = traceCtx.requestId;
    record.spanId = traceCtx.spanId;
  }
  write(levelName, `${JSON.stringify(record)}\n`);
}

function log(levelName: LevelName, first: unknown, second?: string): void {
  if (first instanceof Error) {
    emit(levelName, serializeError(first), first.message);
  } else if (
    typeof first === "object" &&
    first !== null &&
    typeof second === "string"
  ) {
    emit(levelName, first as Record<string, unknown>, second);
  } else {
    emit(levelName, undefined, String(first));
  }
}

export const logger = {
  trace: (first: unknown, second?: string) => log("trace", first, second),
  debug: (first: unknown, second?: string) => log("debug", first, second),
  info: (first: unknown, second?: string) => log("info", first, second),
  warn: (first: unknown, second?: string) => log("warn", first, second),
  error: (first: unknown, second?: string) => log("error", first, second),
  fatal: (first: unknown, second?: string) => log("fatal", first, second),
};
