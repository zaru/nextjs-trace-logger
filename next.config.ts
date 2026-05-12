import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@opentelemetry/instrumentation-pino", "pino"],
};

export default nextConfig;
