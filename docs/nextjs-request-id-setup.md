# Next.js 16 リクエスト追跡ID セットアップ手順書

対象: 開発チーム
前提環境: Next.js 16 (App Router) / Node.js 22 / AWS (ALB / API Gateway / ECS等) / セルフホスト
目的: サーバサイドの全ログにリクエスト単位の追跡ID (traceId) を自動付与する

---

## 1. 概要

ログ調査時に「このログとこのログは同じリクエストか？」を判定できるようにするため、全ログ行に同じリクエスト内ではユニークなIDを自動付与する。

### 採用方針

**Next.jsが内部で生成するOpenTelemetryスパンに乗っかり、`@vercel/otel` + `instrumentation-pino` でpinoの全ログにtraceIdを自動付与する。**

トレースデータ自体の送信 (Jaeger / Datadog / X-Ray等への送信) は **行わない**。あくまでログにIDを載せるためだけにOpenTelemetryを使う。後でトレース送信を追加したくなった場合も、本構成のまま `traceExporter` を足すだけで拡張可能。

### なぜAsyncLocalStorageを自前で張らないか

Next.js 16では `proxy.ts` でAsyncLocalStorageコンテキストを張ってもRoute Handler / Page / Server Action 側に伝播しない (公式仕様)。よって各エンドポイントをラップする必要があり、書き忘れリスクが高い。OpenTelemetryはNext.jsが内部でリクエストごとに自動でスパンを開始してくれるので、ラップが一切不要。

---

## 2. 完成イメージ

アプリ側のコードは以下のように書くだけで、

```ts
// app/api/users/route.ts
import { logger } from '@/lib/logger';

export const GET = async () => {
  logger.info('fetching users');
  return Response.json({ users: [] });
};
```

出力されるログには自動で `requestId` が付く:

```json
{
  "level": 30,
  "time": 1731000000000,
  "msg": "fetching users",
  "requestId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7"
}
```

Page / Server Action / Route Handler のどれから呼ばれても、同じリクエスト内のログは全て同じ `requestId` を持つ。

---

## 3. セットアップ手順

### 3.1 パッケージのインストール

```bash
npm install @vercel/otel \
            @opentelemetry/api \
            @opentelemetry/sdk-logs \
            @opentelemetry/api-logs \
            @opentelemetry/instrumentation \
            @opentelemetry/instrumentation-pino \
            @opentelemetry/propagator-aws-xray \
            pino
```

各パッケージの役割:

- `@vercel/otel`: Next.jsとOpenTelemetryのブリッジ。ESM loader hookやpatchタイミングを面倒見てくれる
- `@opentelemetry/api`: トレースAPI
- `@opentelemetry/sdk-logs`, `@opentelemetry/api-logs`, `@opentelemetry/instrumentation`: `@vercel/otel`が要求する peer dependency
- `@opentelemetry/instrumentation-pino`: pinoのログ出力にtraceIdを自動で混ぜる
- `@opentelemetry/propagator-aws-xray`: AWSの `X-Amzn-Trace-Id` ヘッダの解釈用 (ALB/API Gatewayが付ける)
- `pino`: ロガー本体

### 3.2 `next.config.ts` の設定

`instrumentation-pino` と `pino` をNext.jsのバンドルから除外する必要がある (instrumentationはランタイムでモジュールを差し替えるため、バンドルされると効かない)。

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@opentelemetry/instrumentation-pino',
    'pino',
  ],
};

export default nextConfig;
```

### 3.3 `instrumentation.ts` の作成

プロジェクトルート (または `src/` 配下) に作成。Next.jsが起動時に自動で読みに来る。

```ts
// instrumentation.ts
import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node');
  }
  // edgeランタイムは今回対象外。使うなら別途設定が必要
}

// Next.jsが捕捉したリクエスト処理エラーもログに残す
export const onRequestError: Instrumentation.onRequestError = async (err) => {
  // instrumentation.node 側でpinoがpatchされているため、動的importでないとtraceIdが付かない
  const { logger } = await import('@/lib/logger');
  logger.error(err);
};
```

### 3.4 `instrumentation.node.ts` の作成

`instrumentation.ts` と同じディレクトリに作成。

```ts
// instrumentation.node.ts
import { registerOTel } from '@vercel/otel';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';

registerOTel({
  serviceName: 'YOUR_SERVICE_NAME', // ← 各環境のサービス名に置き換える

  // AWSのX-Amzn-Trace-Idヘッダから親トレース情報を引き継ぐ
  // "auto" を併用することで既定のW3C Trace Context (traceparent) も継続して扱える
  propagators: ['auto', new AWSXRayPropagator()],

  instrumentations: [
    new PinoInstrumentation({
      // pinoが出すログ1行ごとに呼ばれる。spanからtraceIdを取り出してログに混ぜる
      logHook: (span, record) => {
        const ctx = span.spanContext();
        record.requestId = ctx.traceId; // ← ログに付くキー名。チームの命名規約に合わせて変更可
        record.spanId = ctx.spanId;

        // PinoInstrumentationのデフォルトキー(trace_id, span_id, trace_flags)は使わないので削除
        delete record.trace_id;
        delete record.span_id;
        delete record.trace_flags;
      },
    }),
  ],

  // 今回はトレースデータの送信は行わないので traceExporter は指定しない
  // 後で送信したくなったら traceExporter: new OTLPTraceExporter({ url: ... }) を追加
});
```

### 3.5 `lib/logger.ts` の作成

```ts
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // production向けの基本設定。本番環境ではJSON出力、開発環境で見やすくしたければ
  // pino-pretty を別途入れて transport を切り替える
});
```

### 3.6 完成: アプリ側の利用

#### Route Handler

```ts
// app/api/users/route.ts
import { logger } from '@/lib/logger';

export const GET = async () => {
  logger.info('fetching users');
  return Response.json({ users: [] });
};
```

#### Server Action

```ts
// app/actions.ts
'use server';

import { logger } from '@/lib/logger';

export async function createPost(formData: FormData) {
  logger.info({ title: formData.get('title') }, 'creating post');
  // ...
}
```

#### Page / Server Component

```tsx
// app/posts/page.tsx
import { logger } from '@/lib/logger';

export default async function PostsPage() {
  logger.info('rendering PostsPage');
  return <div>...</div>;
}
```

**いずれもラップ不要。`logger.info(...)` を呼ぶだけで `requestId` が自動で付与される。**

---

## 4. 動作確認

### 4.1 ローカルでの確認

```bash
npm run dev
# 別ターミナルで
curl http://localhost:3000/api/users
```

サーバログに以下のようなJSONが出力されることを確認。

```json
{
  "level": 30,
  "time": 1731000000000,
  "msg": "fetching users",
  "requestId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7"
}
```

連続でcurlを叩いて、**呼ぶたびに `requestId` が変わる** ことを確認する。

### 4.2 同一リクエスト内で同じIDになることの確認

複数箇所でログを出してみる:

```ts
// app/api/check/route.ts
import { logger } from '@/lib/logger';

async function step1() {
  logger.info('step1');
  await new Promise((r) => setTimeout(r, 10));
}

async function step2() {
  logger.info('step2');
}

export const GET = async () => {
  logger.info('handler enter');
  await step1();
  await step2();
  logger.info('handler exit');
  return Response.json({ ok: true });
};
```

`/api/check` を1回叩いて、4行のログが **全て同じ `requestId`** であることを確認する。

### 4.3 AWS環境での確認

ALB / API Gatewayの背後にデプロイ後:

```bash
curl -i https://your-app.example.com/api/users
```

レスポンスログのrequestIdと、CloudWatchのALB/API Gatewayアクセスログに含まれる `traceId` (X-Amzn-Trace-IdのRoot部分) が **一致する** ことを確認する。これにより、外部のアクセスログとアプリログをtraceIdで突合できるようになる。

---

## 5. 注意事項と制約

### 5.1 ALBの背後では親スパンが復元できない場合がある

- API Gateway → ECS の構成: traceIdが正しく引き継がれる
- ALB → ECS の構成 (API Gatewayなし): ALBは `X-Amzn-Trace-Id` を発行するが親スパン情報を含めない仕様のため、本アプリ側で新規のtraceIdが生成される
- これによりALBアクセスログとアプリログでtraceIdが**ずれる可能性がある**

該当する構成の場合、要件次第で以下のいずれかの対応を取る:

1. **アクセスログとの紐付けが不要なら何もしない** (アプリ内のログ追跡には影響しない)
2. **どうしても紐付けたい場合**: API Gatewayを前段に置く構成に変更するか、 `proxy.ts` でX-Amzn-Trace-Idを自前パースして `traceparent` ヘッダに変換するワークアラウンドを入れる (要相談)

### 5.2 `proxy.ts` とそれ以降の処理でtraceIdが分かれる場合がある

[Next.js issue #80445](https://github.com/vercel/next.js/issues/80445) の既知事象。`X-Amzn-Trace-Id` または `traceparent` が外部から正しく渡される環境では発生しない。発生する環境では `proxy.ts` 内で以下を行う:

```ts
// proxy.ts (該当する環境でのみ追加)
import { context, propagation } from '@opentelemetry/api';
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const nextHeaders = new Headers(req.headers);
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  for (const [key, value] of Object.entries(carrier)) {
    nextHeaders.set(key, value);
  }
  return NextResponse.next({ request: { headers: nextHeaders } });
}
```

### 5.3 パフォーマンスへの影響

参考ベンチマーク (M3 MacBook Air, 同時接続100):

- 1リクエストあたり: 平均 **3〜4ms** のオーバーヘッド
- 1ログ出力あたり: 平均 **0.1〜0.2ms** のオーバーヘッド

低レイテンシAPIで気になる場合は、`registerOTel` のオプションでサンプリング率を下げるか不要なinstrumentationを切る:

```ts
registerOTel({
  // ...
  instrumentations: { /* ... */ },
  // 環境変数で制御も可能
});
```

または環境変数で:

```bash
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1   # 10%サンプリング
```

**注意**: サンプリングを下げると、サンプリングされなかったリクエストのログには `requestId` がそれでも付くが、`spanId` 等の挙動が変わる可能性がある。本構成では「単にIDが欲しいだけ」なのでサンプリングは100% (default) のままで運用することを推奨。

### 5.4 client componentでは使えない

このセットアップはサーバサイド専用。client componentから `logger.info` を呼ぶとブラウザのconsoleに出るだけでtraceIdは付かない。仮にclient側のログ追跡も必要なら別途設計が必要 (今回は対象外)。

### 5.5 `instrumentation.ts` の変更後はサーバ再起動が必要

`instrumentation.ts` / `instrumentation.node.ts` はサーバ起動時に1回だけ評価される。変更したらHMRでは反映されないので、`npm run dev` を再起動する。

### 5.6 ログ出力時の動的import

`onRequestError` 内のloggerは **動的import** にすること。静的importだとPinoInstrumentationがpatchを当てる前にloggerが読み込まれ、traceIdが付かない:

```ts
// NG: 静的import
import { logger } from '@/lib/logger';

// OK: 動的import
const { logger } = await import('@/lib/logger');
```

---

## 6. トラブルシューティング

### Q. ログに `requestId` が付かない

確認順:

1. `next.config.ts` の `serverExternalPackages` に `@opentelemetry/instrumentation-pino` と `pino` が両方入っているか
2. `instrumentation.ts` が **プロジェクトルート (または src/) 直下** にあるか (`app/` 配下はNG)
3. サーバ起動ログに `@vercel/otel: started ...` のような行が出ているか
4. `process.env.NEXT_RUNTIME` が `nodejs` になっているか (Edgeランタイムでは動かない)
5. loggerが **静的importでなく**、instrumentation登録**後**にimportされているか

### Q. ローカルで `ECONNREFUSED 127.0.0.1:4318` のエラーが出る

OTLP exporterのデフォルト送信先 (OpenTelemetry Collectorのデフォルトポート) に繋ごうとして失敗している。今回はトレース送信しない構成なので、この警告は **無視してよい**。気になるなら以下の環境変数で抑止できる:

```bash
OTEL_TRACES_EXPORTER=none
```

### Q. デプロイ後にtraceIdが全リクエストで同じ値になる

`@vercel/otel` のpatchが効いていない可能性が高い。`next.config.ts` の `serverExternalPackages` の設定漏れか、ビルド時にinstrumentation.tsが含まれていない (例: standaloneビルド時の出力漏れ)。Dockerfileで `instrumentation.ts` と `instrumentation.node.ts` を含めることを確認する。

### Q. Server Componentから呼んだログにtraceIdが付かない

Next.jsのServer Componentの一部 (Static Renderingされるもの) はリクエストコンテキスト外で評価される。Dynamic Renderingが必要なら、`cookies()` や `headers()` を呼ぶ、または `export const dynamic = 'force-dynamic'` を指定する。

---

## 7. 参考リンク

- [Next.js OpenTelemetry公式ガイド](https://nextjs.org/docs/app/guides/open-telemetry)
- [@vercel/otel npm](https://www.npmjs.com/package/@vercel/otel)
- [@opentelemetry/instrumentation-pino](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-pino)
- [@opentelemetry/propagator-aws-xray](https://www.npmjs.com/package/@opentelemetry/propagator-aws-xray)
- [Next.jsでサーバーサイドログにリクエストごとのユニークなIDを付与する (Zenn)](https://zenn.dev/terass_dev/articles/ce859811ab36af) — 本構成の参考元

---

## 8. チェックリスト (実装担当向け)

- [ ] 上記6パッケージを `package.json` に追加 (3.1)
- [ ] `next.config.ts` に `serverExternalPackages` を設定 (3.2)
- [ ] `instrumentation.ts` を作成 (3.3)
- [ ] `instrumentation.node.ts` を作成、`serviceName` を埋める (3.4)
- [ ] `lib/logger.ts` を作成 (3.5)
- [ ] 既存の `console.log` を `logger.info` 等に置き換え
- [ ] ローカルで `/api/check` 等を叩いてrequestIdの付与とユニーク性を確認 (4.1, 4.2)
- [ ] staging環境にデプロイし、ALBアクセスログとのID突合を確認 (4.3)
- [ ] 5.1〜5.2に該当する環境構成かを確認、必要なら追加対応
