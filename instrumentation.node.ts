import { AWSXRayPropagator } from "@opentelemetry/propagator-aws-xray";
import { registerOTel } from "@vercel/otel";

registerOTel({
  serviceName: "nextjs-trace-logger",

  // AWSのX-Amzn-Trace-Idヘッダから親トレース情報を引き継ぐ
  // "auto" を併用することでW3C Trace Context (traceparent) も継続して扱える
  propagators: ["auto", new AWSXRayPropagator()],

  // 自作loggerが @opentelemetry/api の active span を直接読むため
  // pino用のinstrumentationは不要
});
