# tennis-matchup-app API 設計書

## 1. 目的

`tennis-matchup-app` の対戦組合せ決定ロジックを、別 Vercel アプリから利用できる公開 HTTPS API として提供する。

この API は、既存 UI と同じ組合せ生成ロジックをサーバー側から呼び出せるようにすることを目的とする。呼び出し元は別アプリのサーバー側を想定し、ブラウザからの直接呼び出しは主対象としない。

## 2. 前提

- API 提供元は `tennis-matchup-app` の Vercel デプロイ環境とする。
- 呼び出し元は別 Vercel アプリのサーバー側処理とする。
- 通信方式は公開 HTTPS API とする。
- 認証方式は固定 API キー方式とする。
- API キーは `Authorization: Bearer <API_KEY>` で送信する。
- API キーは Vercel Environment Variables で管理し、ソースコードには含めない。
- Next.js App Router の Route Handler として実装する。
- 通常生成と seed 指定の再現は別 API として分離する。

## 3. 対象外

- ブラウザからの直接呼び出しを主経路にすること。
- OAuth、JWT、ユーザー単位認証などの複雑な認可。
- API 利用者ごとの個別レート制限。
- 旧バージョン API との互換保証。
- 組合せ結果の永続保存。

## 4. API 一覧

| API | Method | Path | 用途 |
| --- | --- | --- | --- |
| 通常生成 API | POST | `/api/v1/matchups/generate` | UI と同じく複数候補から最適な組合せを作成する |
| 再現 API | POST | `/api/v1/matchups/replay` | 確定済み seed を指定して同じ組合せを再現する |

## 5. 共通仕様

### 5.1 Base URL

Production:

```txt
https://tennis-matchup-app.vercel.app
```

Preview 環境を利用する場合は、Preview Deployment の URL を指定する。

### 5.2 Content-Type

リクエスト、レスポンスともに JSON を使用する。

```http
Content-Type: application/json
```

### 5.3 認証

すべての API は固定 API キーを必須とする。

```http
Authorization: Bearer <API_KEY>
```

API 側は、Vercel Environment Variables に設定した API キーと一致するかを検証する。

想定環境変数:

```txt
MATCHUP_API_KEY=<secret>
```

認証に失敗した場合は `401 Unauthorized` を返す。

### 5.4 CORS

呼び出し元は別アプリのサーバー側を想定するため、原則として CORS 対応は不要とする。

将来的にブラウザから直接呼び出す場合は、以下を追加検討する。

- `OPTIONS` メソッドへの応答
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`

ただし、ブラウザに固定 API キーを置くと秘匿できないため、ブラウザ直呼びは推奨しない。

### 5.5 入力上限

API の安定性と予期しない負荷を避けるため、以下の上限を設ける。

| 項目 | 最小値 | 最大値 |
| --- | ---: | ---: |
| 参加人数 | 4 | 30 |
| 面数 | 1 | 8 |
| 回数 | 1 | 20 |

上限を超える場合は `422 Unprocessable Entity` を返す。

### 5.6 参加者

参加者は API 呼び出し元から明示的に渡す。

```json
{
  "id": "p001",
  "name": "参加者1"
}
```

制約:

- `id` は空文字不可。
- `name` は trim 後に空文字不可。
- `participants.length` は `participantCount` と一致する必要がある。
- `participants[].id` は同一リクエスト内で一意であることを推奨する。

### 5.7 レスポンスの安定性

API のレスポンスには、既存の `MatchupResult` 相当の構造を返す。

`generatedAt` は実行時刻に依存するため、同一 seed で replay した場合でも値が変わる。組合せ同一性の判定では `rounds`、`stats`、`score`、`seed` を比較対象とし、`generatedAt` は除外する。

## 6. 通常生成 API

### 6.1 概要

UI と同じ生成方式で、複数の候補 seed を試行し、スコアの最も良い組合せを採用する。

### 6.2 Endpoint

```http
POST /api/v1/matchups/generate
```

### 6.3 Request Headers

```http
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

### 6.4 Request Body

```json
{
  "eventName": "日曜練習",
  "participantCount": 8,
  "participants": [
    { "id": "p001", "name": "参加者1" },
    { "id": "p002", "name": "参加者2" },
    { "id": "p003", "name": "参加者3" },
    { "id": "p004", "name": "参加者4" },
    { "id": "p005", "name": "参加者5" },
    { "id": "p006", "name": "参加者6" },
    { "id": "p007", "name": "参加者7" },
    { "id": "p008", "name": "参加者8" }
  ],
  "courtCount": 2,
  "roundCount": 4,
  "seed": 12345
}
```

### 6.5 Request Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `eventName` | string | no | 開催名。空文字または空白のみの場合は未指定扱い |
| `participantCount` | number | yes | 参加人数。4 以上 30 以下 |
| `participants` | array | yes | 参加者一覧。件数は `participantCount` と一致 |
| `participants[].id` | string | yes | 参加者 ID |
| `participants[].name` | string | yes | 参加者名 |
| `courtCount` | number | yes | 入力面数。1 以上 8 以下 |
| `roundCount` | number | yes | 実施回数。1 以上 20 以下 |
| `seed` | number | no | 候補探索の起点 seed。未指定の場合は API 側で生成 |

### 6.6 seed 未指定時の扱い

`seed` が未指定の場合、API 側で base seed を生成する。

生成方式の候補:

```txt
Date.now()
```

ただし、再現性が必要な場合は呼び出し元が `seed` を明示することを推奨する。API は採用された seed をレスポンスに含める。

### 6.7 Response 200

```json
{
  "data": {
    "conditions": {
      "eventName": "日曜練習",
      "participants": [
        { "id": "p001", "name": "参加者1", "index": 0 },
        { "id": "p002", "name": "参加者2", "index": 1 }
      ],
      "courtCount": 2,
      "roundCount": 4,
      "playersPerCourt": 4
    },
    "rounds": [
      {
        "roundNumber": 1,
        "courts": [
          {
            "courtNumber": 1,
            "pairA": { "player1Id": "p001", "player2Id": "p002" },
            "pairB": { "player1Id": "p003", "player2Id": "p004" },
            "isUnused": false
          }
        ],
        "restPlayerIds": [],
        "activePlayerIds": ["p001", "p002", "p003", "p004"]
      }
    ],
    "stats": [
      {
        "playerId": "p001",
        "appearances": 4,
        "rests": 0,
        "uniqueEncounterCount": 7,
        "consecutiveRestCount": 0
      }
    ],
    "seed": 12345,
    "score": {
      "fairnessPenalty": 0,
      "consecutiveRestPenalty": 0,
      "encounterPenalty": 10,
      "sameTeammatePenalty": 2,
      "sameOpponentPenalty": 3,
      "totalScore": 15
    },
    "generatedAt": "2026-04-28T00:00:00.000Z"
  }
}
```

## 7. 再現 API

### 7.1 概要

確定済み seed を指定し、同じ条件から同じ組合せを再現する。

通常生成 API と異なり、候補 seed の探索は行わない。指定された `seed` をそのまま組合せ生成に使用する。

### 7.2 Endpoint

```http
POST /api/v1/matchups/replay
```

### 7.3 Request Headers

```http
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

### 7.4 Request Body

```json
{
  "eventName": "日曜練習",
  "participantCount": 8,
  "participants": [
    { "id": "p001", "name": "参加者1" },
    { "id": "p002", "name": "参加者2" },
    { "id": "p003", "name": "参加者3" },
    { "id": "p004", "name": "参加者4" },
    { "id": "p005", "name": "参加者5" },
    { "id": "p006", "name": "参加者6" },
    { "id": "p007", "name": "参加者7" },
    { "id": "p008", "name": "参加者8" }
  ],
  "courtCount": 2,
  "roundCount": 4,
  "seed": 12345
}
```

### 7.5 Request Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `eventName` | string | no | 開催名。空文字または空白のみの場合は未指定扱い |
| `participantCount` | number | yes | 参加人数。4 以上 30 以下 |
| `participants` | array | yes | 参加者一覧。件数は `participantCount` と一致 |
| `participants[].id` | string | yes | 参加者 ID |
| `participants[].name` | string | yes | 参加者名 |
| `courtCount` | number | yes | 入力面数。1 以上 8 以下 |
| `roundCount` | number | yes | 実施回数。1 以上 20 以下 |
| `seed` | number | yes | 再現に使用する確定済み seed |

### 7.6 Response 200

レスポンス構造は通常生成 API と同じ。

通常生成 API のレスポンスから得た `seed` と同じ条件を渡した場合、`generatedAt` を除き、同じ組合せ結果を返す。

## 8. エラー仕様

### 8.1 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": [
      {
        "path": "participantCount",
        "message": "参加人数は30人以下にしてください"
      }
    ]
  }
}
```

### 8.2 Status Codes

| Status | Code | Description |
| ---: | --- | --- |
| 400 | `INVALID_JSON` | JSON として解析できない |
| 401 | `UNAUTHORIZED` | API キーがない、または一致しない |
| 405 | `METHOD_NOT_ALLOWED` | 許可されていない HTTP メソッド |
| 422 | `VALIDATION_ERROR` | 入力値が仕様を満たさない |
| 500 | `INTERNAL_SERVER_ERROR` | 想定外のサーバーエラー |

### 8.3 Validation Examples

参加人数上限超過:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": [
      {
        "path": "participantCount",
        "message": "参加人数は30人以下にしてください"
      }
    ]
  }
}
```

参加者数不一致:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": [
      {
        "path": "participants",
        "message": "参加者一覧の件数が参加人数と一致していません"
      }
    ]
  }
}
```

seed 未指定で replay を呼んだ場合:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": [
      {
        "path": "seed",
        "message": "再現にはseedが必要です"
      }
    ]
  }
}
```

## 9. Vercel 環境設計

### 9.1 API 提供元アプリ

設定する環境変数:

```txt
MATCHUP_API_KEY=<secret>
```

Route Handler で `process.env.MATCHUP_API_KEY` を参照し、`Authorization` ヘッダーの Bearer token と照合する。

### 9.2 呼び出し元アプリ

設定する環境変数:

```txt
MATCHUP_API_BASE_URL=https://tennis-matchup-app.vercel.app
MATCHUP_API_KEY=<secret>
```

呼び出し元アプリのサーバー側処理から API を呼び出す。

```ts
await fetch(`${process.env.MATCHUP_API_BASE_URL}/api/v1/matchups/generate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.MATCHUP_API_KEY}`,
  },
  body: JSON.stringify(payload),
});
```

### 9.3 Preview Deployment 利用時

Vercel の Deployment Protection が有効な Preview Deployment を呼ぶ場合、通常の API キーとは別に `x-vercel-protection-bypass` ヘッダーが必要になることがある。

```http
x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>
```

Production URL を呼ぶ構成では、このヘッダーは通常不要。

## 10. 実装方針

### 10.1 ファイル構成案

```txt
src/app/api/v1/matchups/generate/route.ts
src/app/api/v1/matchups/replay/route.ts
src/features/matchmaking/application/apiSchemas.ts
src/features/matchmaking/application/apiErrors.ts
src/features/matchmaking/application/apiAuth.ts
```

### 10.2 通常生成 API

`generate` は、既存 UI と同じ上位 use case を呼び出す。

```txt
request
  -> auth
  -> validate
  -> generateMatchupUseCase(input, baseSeed)
  -> response
```

`seed` が未指定の場合は API 側で base seed を生成する。

### 10.3 再現 API

`replay` は、候補探索を行わず、確定 seed を直接利用する。

```txt
request
  -> auth
  -> validate
  -> buildMatchConditions(input)
  -> generateMatchup(conditions, seed)
  -> response
```

これにより、通常生成 API の採用 seed を使った再現性を保証しやすくする。

## 11. テスト設計

### 11.1 テスト観点一覧

機能観点:

- 通常生成 API が UI と同じ生成方式で結果を返すこと。
- 再現 API が指定 seed で同じ組合せを返すこと。
- 認証ヘッダーが正しく検証されること。
- seed 未指定の通常生成で API 側が seed を補完すること。

非機能観点:

- 上限値内の入力でタイムアウトしないこと。
- 上限値超過時に生成処理へ進まず、検証エラーで返ること。
- API キーがログやレスポンスに出力されないこと。
- 別 Vercel アプリのサーバー側から HTTPS で呼び出せること。

データ観点:

- 参加人数、面数、回数の最小値と最大値を検証すること。
- `participants.length` と `participantCount` の不一致を検出すること。
- 参加者名の前後空白が trim されること。
- `generatedAt` を除けば replay 結果が通常生成結果と一致すること。

UI 観点:

- API 化によって既存 UI の生成結果が変わらないこと。
- 既存の共有、印刷、PDF 出力に影響しないこと。

### 11.2 正常系

| Case | API | Intent |
| --- | --- | --- |
| N-001 | generate | 8人、2面、4回で組合せを生成できること |
| N-002 | generate | seed 未指定でも生成でき、レスポンスに採用 seed が含まれること |
| N-003 | generate | seed 指定時に同じ base seed から候補探索されること |
| N-004 | replay | generate の結果 seed を使って同じ組合せを再現できること |
| N-005 | replay | 開催名未指定でも生成できること |

### 11.3 異常系

| Case | API | Intent |
| --- | --- | --- |
| E-001 | both | API キーなしで `401` を返すこと |
| E-002 | both | 不正 API キーで `401` を返すこと |
| E-003 | both | 不正 JSON で `400` を返すこと |
| E-004 | both | 参加者数不一致で `422` を返すこと |
| E-005 | replay | seed 未指定で `422` を返すこと |
| E-006 | both | 許可外メソッドで `405` を返すこと |

### 11.4 境界値

| Case | API | Intent |
| --- | --- | --- |
| B-001 | both | 参加人数 4、面数 1、回数 1 で生成できること |
| B-002 | both | 参加人数 30、面数 8、回数 20 で生成できること |
| B-003 | both | 参加人数 31 で `422` を返すこと |
| B-004 | both | 面数 9 で `422` を返すこと |
| B-005 | both | 回数 21 で `422` を返すこと |
| B-006 | both | 参加人数 3 で `422` を返すこと |
| B-007 | both | 面数 0 で `422` を返すこと |
| B-008 | both | 回数 0 で `422` を返すこと |

### 11.5 状態遷移

| Case | Flow | Intent |
| --- | --- | --- |
| S-001 | generate -> replay | 通常生成で採用された seed を replay に渡すと同じ組合せになること |
| S-002 | generate -> generate | seed 未指定で複数回呼ぶと、採用 seed が変わり得ること |
| S-003 | generate -> replay -> replay | 同じ条件と seed の replay は安定して同じ結果になること |

### 11.6 実行順序・依存関係

- API テストは認証、入力検証、生成結果の順に分ける。
- replay の再現性テストは、先に generate を実行して seed と条件を取得する。
- 生成結果の比較では `generatedAt` を除外する。
- 通し実行でのみ失敗するケースを検出するため、generate と replay の連続フローを E2E 相当で検証する。

### 11.7 証跡

失敗時の切り分けのため、以下を取得する。

- Request path
- HTTP status
- Error code
- Validation details
- 入力条件の概要
- seed
- generatedAt

API キーと参加者名の全量ログ出力は避ける。

## 12. セキュリティ考慮

- API キーはサーバー側環境変数にのみ保持する。
- API キーをブラウザへ露出しない。
- API キーをログ出力しない。
- 参加者名を含むため、リクエスト body の全量ログ出力は避ける。
- `Authorization` ヘッダーの Bearer token は完全一致で検証する。
- 将来的に複数クライアントへ提供する場合は、クライアント別 API キーやキー rotation を検討する。

## 13. 今後の検討事項

- API キー rotation の運用手順。
- 複数呼び出し元アプリを許可する場合のキー管理。
- レート制限の導入。
- CORS 対応の要否。
- OpenAPI 形式の仕様書生成。
- API バージョン更新時の互換方針。
- 参加者 ID 重複時の扱いをエラーにするかどうか。
- `seed` の許容範囲を数値上限として明示するかどうか。
