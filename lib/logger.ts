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

const isTTY = process.stdout.isTTY === true;

const COLORS: Record<LevelName, string> = {
  trace: "\x1b[90m", // gray
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  fatal: "\x1b[35m", // magenta
};
const RESET = "\x1b[0m";

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

function formatPrettyTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function emit(
  levelName: LevelName,
  obj: Record<string, unknown> | undefined,
  msg: string,
): void {
  const levelNum = LEVELS[levelName];
  if (levelNum < threshold) return;

  const traceCtx = getTraceContext();

  if (isTTY) {
    const color = COLORS[levelName];
    const time = formatPrettyTime();
    const traceStr = traceCtx
      ? ` ${RESET}\x1b[90mrequestId=${traceCtx.requestId} spanId=${traceCtx.spanId}${RESET}`
      : "";
    const objStr =
      obj && Object.keys(obj).length > 0 ? ` ${JSON.stringify(obj)}` : "";
    process.stdout.write(
      `${RESET}\x1b[90m[${time}]${RESET} ${color}${levelName.toUpperCase().padEnd(5)}${RESET} ${msg}${objStr}${traceStr}\n`,
    );
    return;
  }

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
  process.stdout.write(`${JSON.stringify(record)}\n`);
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
