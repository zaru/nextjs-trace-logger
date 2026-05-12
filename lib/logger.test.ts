import { type Span, trace } from "@opentelemetry/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

vi.mock("@opentelemetry/api", () => ({
  trace: {
    getActiveSpan: vi.fn(),
  },
}));

const NOW = 1_765_000_000_000;
const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const SPAN_ID = "00f067aa0ba902b7";
const ZERO_TRACE_ID = "00000000000000000000000000000000";

const getActiveSpan = vi.mocked(trace.getActiveSpan);

let writes: string[];

function createSpan(traceId = TRACE_ID, spanId = SPAN_ID): Span {
  const span: Span = {
    spanContext: () => ({
      traceId,
      spanId,
      traceFlags: 1,
    }),
    setAttribute: () => span,
    setAttributes: () => span,
    addEvent: () => span,
    addLink: () => span,
    addLinks: () => span,
    setStatus: () => span,
    updateName: () => span,
    end: () => undefined,
    isRecording: () => true,
    recordException: () => undefined,
  };

  return span;
}

function readRecords(): Array<Record<string, unknown>> {
  return writes.map((entry) => JSON.parse(entry));
}

function readRecord(): Record<string, unknown> {
  const record = readRecords().at(-1);
  if (!record) {
    throw new Error("Expected logger to write a record");
  }
  return record;
}

beforeEach(() => {
  writes = [];
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    },
  );
  getActiveSpan.mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  getActiveSpan.mockReset();
});

describe("logger", () => {
  it("writes info records as one-line JSON to stdout", () => {
    logger.info("hello", { count: 2 });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/\n$/);
    expect(readRecord()).toEqual({
      count: 2,
      level: "info",
      time: NOW,
      msg: "hello",
    });
  });

  it("writes error records with the error level", () => {
    logger.error("failed");

    expect(readRecord()).toEqual({
      level: "error",
      time: NOW,
      msg: "failed",
    });
  });

  it("supports all logger argument forms", () => {
    logger.info("message only");
    logger.info("message with meta", { pos: "after" });
    logger.info({ pos: "before" }, "meta before message");
    logger.info({ pos: "only" });

    expect(readRecords()).toEqual([
      {
        level: "info",
        time: NOW,
        msg: "message only",
      },
      {
        pos: "after",
        level: "info",
        time: NOW,
        msg: "message with meta",
      },
      {
        pos: "before",
        level: "info",
        time: NOW,
        msg: "meta before message",
      },
      {
        pos: "only",
        level: "info",
        time: NOW,
      },
    ]);
  });

  it("serializes Error values from meta.error", () => {
    const error = new TypeError("bad input");
    error.stack = "TypeError: bad input";

    logger.error("request failed", { error });

    expect(readRecord()).toEqual({
      error: {
        type: "TypeError",
        message: "bad input",
        stack: "TypeError: bad input",
      },
      level: "error",
      time: NOW,
      msg: "request failed",
    });
  });

  it("keeps logger-owned fields ahead of user meta", () => {
    getActiveSpan.mockReturnValue(createSpan());

    logger.info("actual message", {
      level: "error",
      time: 1,
      msg: "meta message",
      requestId: "meta-request-id",
      spanId: "meta-span-id",
    });

    expect(readRecord()).toEqual({
      level: "info",
      time: NOW,
      msg: "actual message",
      requestId: TRACE_ID,
      spanId: SPAN_ID,
    });
  });

  it("adds trace context from an active span", () => {
    getActiveSpan.mockReturnValue(createSpan());

    logger.info("with trace");

    expect(readRecord()).toEqual({
      level: "info",
      time: NOW,
      msg: "with trace",
      requestId: TRACE_ID,
      spanId: SPAN_ID,
    });
  });

  it("omits trace context when there is no valid active span", () => {
    logger.info("no span");
    getActiveSpan.mockReturnValue(createSpan(ZERO_TRACE_ID));
    logger.info("zero trace");

    expect(readRecords()).toEqual([
      {
        level: "info",
        time: NOW,
        msg: "no span",
      },
      {
        level: "info",
        time: NOW,
        msg: "zero trace",
      },
    ]);
  });

  it("safely serializes circular references and BigInt values", () => {
    const circular: Record<string, unknown> = { label: "root" };
    circular.self = circular;

    logger.info("safe meta", {
      circular,
      id: BigInt("123"),
    });

    expect(readRecord()).toEqual({
      circular: {
        label: "root",
        self: "[Circular]",
      },
      id: "123",
      level: "info",
      time: NOW,
      msg: "safe meta",
    });
  });
});
