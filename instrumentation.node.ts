import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { AWSXRayPropagator } from "@opentelemetry/propagator-aws-xray";
import { registerOTel } from "@vercel/otel";

registerOTel({
  serviceName: "nextjs-trace-logger",

  // AWSのX-Amzn-Trace-Idヘッダから親トレース情報を引き継ぐ
  // "auto" を併用することでW3C Trace Context (traceparent) も継続して扱える
  propagators: ["auto", new AWSXRayPropagator()],

  instrumentations: [
    new PinoInstrumentation({
      // pinoが出すログ1行ごとに呼ばれる。spanからtraceIdを取り出してログに混ぜる
      logHook: (span, record) => {
        const ctx = span.spanContext();
        record.requestId = ctx.traceId;
        record.spanId = ctx.spanId;

        // PinoInstrumentationのデフォルトキーは使わないので削除
        delete record.trace_id;
        delete record.span_id;
        delete record.trace_flags;
      },
    }),
  ],
});
