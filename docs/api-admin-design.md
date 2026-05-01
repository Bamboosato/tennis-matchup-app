# tennis-matchup-app API・管理画面 設計方針

## 1. 位置づけ

この設計書は、既存の `docs/api-design.md` を上書きせず、API公開に加えて管理画面、アカウント単位のAPIキー管理、Cloud Firestore 保存を含めた拡張方針をまとめる。

既存設計書:

```txt
docs/api-design.md
```

この設計書:

```txt
docs/api-admin-design.md
```

## 2. 目的

`tennis-matchup-app` の対戦組合せ生成ロジックを、別アプリや private Codex plugin などから利用できる HTTPS API として公開する。

API利用者は管理画面でアカウント単位に管理し、各アカウントに対して APIキー、scope、rate limit、有効/無効状態を設定できるようにする。

## 3. 確定方針

| 項目 | 方針 |
| --- | --- |
| 管理画面URL | `/admin` |
| ホーム画面の導線 | PCのみ Gear Icon を表示 |
| 管理画面表示 | PCのみ表示可能 |
| 管理者認証 | 管理者パスワード1つ |
| 管理者パスワード保存 | Vercel 環境変数に hash を保存 |
| APIキー管理単位 | アカウント単位 |
| APIキー本数 | 1アカウントにつき1本 |
| APIキー再表示 | 登録後は再表示不可 |
| APIキー紛失対応 | 再発行 |
| アカウント削除 | soft delete |
| 初期scope | `matchups:generate`, `matchups:replay` |
| scope UI | チェックボックス |
| rate limit | 1分あたりN回 |
| 初期rate limit | 10回/分 |
| 有効/無効 | トグル |
| データ保存 | Cloud Firestore |
| Firebase project | 新規作成予定 |
| Firestore障害時 | `503 Service Unavailable` |
| 管理画面総当たり対策 | 実装する |
| 管理画面セッション | 12時間 |
| 監査ログ | 保存する |
| API利用ログ | 参加者名を保存しない |
| 公開API | `POST /api/v1/matchups/generate`, `POST /api/v1/matchups/replay` |
| rate limit超過 | `429 Too Many Requests` |
| scope不足 | `403 Forbidden` |
| APIレスポンスmeta | `requestId` を含める。`accountId` は含めない |

## 3.1 Firebase 確定情報

| 項目 | 値 |
| --- | --- |
| Firebase Project ID | `tennis-matchup-app` |
| Firestore location | Tokyo / `asia-northeast1` |

## 4. アカウント識別子

### 4.1 メールアドレス必須にはしない

API利用者は人間とは限らない。別Vercelアプリ、private Codex plugin、バッチ、個人ツールなども利用者になり得るため、メールアドレスを必須の主識別子にはしない。

### 4.2 採用する項目

| 項目 | 必須 | 変更可否 | 用途 |
| --- | --- | --- | --- |
| `accountId` | yes | 不可 | 内部識別子 |
| `accountName` | yes | 不可 | 管理画面で表示する利用者名 |
| `contactEmail` | no | 可 | 連絡先 |

例:

```txt
accountName: codex-local-plugin
contactEmail: user@example.com
```

```txt
accountName: scoreboard-app-prod
contactEmail: team@example.com
```

### 4.3 accountId

`accountId` はメールアドレスや accountName を直接 document ID にしない。

推奨:

```txt
acc_<random>
```

理由:

- 個人情報や運用名を Firestore の document path に直接出さない。
- accountName の変更不可制約と内部IDを分離できる。
- ログ、トレース、エラー表示に識別子が混ざっても意味を持ちにくい。
- 将来、表示名や連絡先の形式を変えても内部参照を維持できる。

accountName の一意性は、Firestore transaction で `accountNameIndex` を作成して保証する。

## 5. 全体構成

```txt
ホーム画面
  └─ PCのみ Gear Icon
      └─ /admin
          ├─ 管理者ログイン
          ├─ アカウント管理
          ├─ APIキー再発行
          └─ 監査ログ参照

外部クライアント
  └─ Authorization: Bearer <API_KEY>
      └─ /api/v1/matchups/generate
      └─ /api/v1/matchups/replay
```

## 6. 管理画面

### 6.1 URL

```txt
/admin
```

### 6.2 ホーム導線

ホーム画面に PCのみ Gear Icon ボタンを表示する。

スマホでは Gear Icon を非表示にする。

### 6.3 PCのみ表示

`/admin` に直接アクセスされた場合でも、スマホ幅では管理画面本体を表示しない。

表示例:

```txt
管理画面はPCからアクセスしてください。
```

認証や権限判定は画面幅に依存させない。画面幅制御はUI制御であり、セキュリティ境界ではない。

### 6.4 管理者ログイン

初期実装では管理者パスワードを1つだけ持つ。

保存:

```txt
ADMIN_PASSWORD_HASH=<password-hash>
ADMIN_SESSION_SECRET=<random-secret>
```

パスワード平文は保存しない。

### 6.5 パスワードhash

Node.js 標準 `crypto` を利用し、salt付きhashを保存する。

形式例:

```txt
scrypt:<salt>:<hash>
```

または:

```txt
pbkdf2:<iterations>:<salt>:<hash>
```

実装時は生成用スクリプトを用意し、Vercel Environment Variables に設定する。

### 6.6 管理セッション

ログイン成功後、署名付き cookie を発行する。

Cookie属性:

```txt
HttpOnly
Secure
SameSite=Strict
Max-Age=12h
```

セッション内容:

```json
{
  "role": "admin",
  "exp": 1770000000
}
```

cookie は `ADMIN_SESSION_SECRET` で署名し、改ざんを検出する。

### 6.7 総当たり対策

管理画面ログイン失敗を Firestore に記録する。

方針:

- IP単位で失敗回数を記録。
- 一定回数失敗した場合は一定時間ロック。
- 初期値は `5回失敗で15分ロック` を推奨。
- ログイン成功時は該当IPの失敗状態をリセット。

保存先例:

```txt
adminLoginGuards/{guardId}
```

`guardId` は IP を直接使わず hash 化する。

## 7. 管理画面UI

### 7.1 通常表示

```txt
[アカウント名][連絡先][APIキー][scope][rate limit][有効][更新][再発行][削除]
[アカウント入力欄][連絡先入力欄][＋]
```

### 7.2 追加ボタン押下後

`＋` 押下時に APIキーを生成し、draft 行として追加する。

```txt
[アカウントD][連絡先][tm_live_xxx][scope][rate limit][有効][登録]
```

この時点では APIキーはまだ有効化しない。

### 7.3 登録ボタン押下後

登録するとアカウントが active になり、APIキーが有効化される。

登録後は生の APIキーを再表示しない。

```txt
[アカウントD][連絡先][tm_live_****abcd][scope][rate limit][有効][更新][再発行][削除]
```

### 7.4 更新可能項目

登録後に更新できる項目:

- `contactEmail`
- `scopes`
- `rateLimit`
- `enabled`

登録後に変更できない項目:

- `accountName`
- APIキーの生値

### 7.5 再発行

`再発行` ボタンを押すと新しい APIキーを生成する。

動作:

- 既存 APIキーを無効化する。
- 新しい APIキーを発行する。
- 新しい生キーは一度だけ表示する。
- Firestore には新しい keyHash のみ保存する。
- 監査ログに `api_key_rotated` を記録する。

### 7.6 削除

削除は物理削除ではなく soft delete とする。

動作:

- `status = "deleted"`
- `enabled = false`
- `deletedAt` を保存
- 一覧では非表示
- API認証では必ず拒否

## 8. APIキー仕様

### 8.1 キー形式

```txt
tm_live_<keyId>_<secret>
```

例:

```txt
tm_live_key_abc123_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 8.2 keyId

`keyId` は API認証時に Firestore document を直接取得するために使う。

```txt
apiKeys/{keyId}
```

これにより、APIリクエストごとに全アカウントを検索しない。

### 8.3 secret

`secret` は十分長いランダム値とする。

推奨:

```txt
32 bytes 以上の crypto random
```

### 8.4 保存値

Firestore に保存する:

- `keyHash`
- `keyPreview`
- `keyId`
- `accountId`
- `enabled`
- `status`

Firestore に保存しない:

- 生の APIキー
- secret の平文

### 8.5 keyHash

```txt
sha256:<hex>
```

API認証時は、受信した APIキーを hash 化して `keyHash` と照合する。

照合は可能な限り timing-safe な比較を使う。

## 9. Firestore データ設計

### 9.1 Collections

```txt
apiAccounts/{accountId}
apiKeys/{keyId}
accountNameIndex/{normalizedAccountName}
adminLoginGuards/{guardId}
auditLogs/{logId}
apiRequestLogs/{logId}
apiRateLimits/{bucketId}
```

### 9.2 apiAccounts

```json
{
  "accountId": "acc_xxx",
  "accountName": "codex-local-plugin",
  "accountNameNormalized": "codex-local-plugin",
  "contactEmail": "user@example.com",
  "status": "active",
  "enabled": true,
  "scopes": ["matchups:generate", "matchups:replay"],
  "rateLimit": {
    "requests": 10,
    "windowSeconds": 60
  },
  "currentKeyId": "key_xxx",
  "createdAt": "...",
  "updatedAt": "...",
  "deletedAt": null
}
```

### 9.3 apiKeys

```json
{
  "keyId": "key_xxx",
  "accountId": "acc_xxx",
  "keyHash": "sha256:...",
  "keyPreview": "tm_live_key_xxx_****abcd",
  "status": "active",
  "enabled": true,
  "createdAt": "...",
  "rotatedAt": null,
  "revokedAt": null,
  "lastUsedAt": null
}
```

### 9.4 accountNameIndex

accountName の一意性を保証するための index collection。

```json
{
  "accountId": "acc_xxx",
  "accountNameNormalized": "codex-local-plugin",
  "createdAt": "..."
}
```

アカウント作成時は transaction で以下を同時に行う。

```txt
1. accountNameIndex/{normalizedAccountName} が存在しないことを確認
2. apiAccounts/{accountId} を作成
3. accountNameIndex/{normalizedAccountName} を作成
4. apiKeys/{keyId} を作成
```

### 9.5 auditLogs

管理画面操作と認証失敗などの監査ログを保存する。

```json
{
  "logId": "log_xxx",
  "type": "account_registered",
  "actor": "admin",
  "accountId": "acc_xxx",
  "accountName": "codex-local-plugin",
  "requestId": "req_xxx",
  "result": "success",
  "message": "Account registered",
  "createdAt": "..."
}
```

対象例:

- `login_success`
- `login_failure`
- `account_draft_created`
- `account_registered`
- `account_updated`
- `account_disabled`
- `api_key_rotated`
- `account_deleted`
- `api_auth_failed`
- `api_scope_denied`
- `api_rate_limited`

### 9.6 apiRequestLogs

API利用ログを保存する。

参加者名、APIキー、生リクエストbodyは保存しない。

```json
{
  "requestId": "req_xxx",
  "accountId": "acc_xxx",
  "endpoint": "/api/v1/matchups/generate",
  "method": "POST",
  "status": 200,
  "durationMs": 120,
  "participantCount": 8,
  "courtCount": 2,
  "roundCount": 4,
  "seed": 12345,
  "createdAt": "..."
}
```

## 10. 監査ログ参照

### 10.1 管理画面タブ

`/admin` に監査ログタブを追加する。

MVPで表示する項目:

```txt
日時
操作種別
対象アカウント
結果
requestId
概要
```

### 10.2 検索・フィルタ

初期実装:

- 直近200件を表示
- 操作種別で絞り込み
- アカウント名で絞り込み
- requestId で検索

将来拡張:

- 日付範囲
- CSV出力
- API成功ログの集計表示

## 11. Public API

### 11.1 Endpoints

```txt
POST /api/v1/matchups/generate
POST /api/v1/matchups/replay
```

### 11.2 認証

```http
Authorization: Bearer <API_KEY>
```

判定順:

```txt
1. requestId を生成
2. Authorization Bearer を取得
3. APIキー形式を検証
4. keyId を抽出
5. apiKeys/{keyId} を取得
6. keyHash を照合
7. apiAccounts/{accountId} を取得
8. account/key の enabled/status を確認
9. scope を確認
10. rate limit を確認
11. generate/replay を実行
12. apiRequestLogs と auditLogs を必要に応じて記録
```

### 11.3 Scopes

| Scope | 許可するAPI |
| --- | --- |
| `matchups:generate` | `POST /api/v1/matchups/generate` |
| `matchups:replay` | `POST /api/v1/matchups/replay` |

### 11.4 Rate Limit

初期値:

```txt
10 requests / 60 seconds
```

Firestore の fixed window counter で実装する。

bucket例:

```txt
apiRateLimits/{accountId}_{yyyyMMddHHmm}
```

MVPでは少数アカウント前提のため Firestore で開始する。

将来、アクセス量が増える場合は Vercel KV / Redis 系へ切り出す。

### 11.5 Response meta

成功時:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_xxx"
  }
}
```

エラー時:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "リクエスト回数の上限を超えました"
  },
  "meta": {
    "requestId": "req_xxx"
  }
}
```

`accountId` は外部レスポンスに含めない。

理由:

- 内部識別子を外部に出さない。
- 呼び出し元ログにアカウント情報を不要に残さない。
- 運用上の問い合わせは `requestId` で追跡できる。

## 12. Admin API

管理画面から呼ぶ内部APIを Route Handler として用意する。

```txt
POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/session
GET  /api/admin/accounts
POST /api/admin/accounts/draft
POST /api/admin/accounts/{accountId}/register
PATCH /api/admin/accounts/{accountId}
POST /api/admin/accounts/{accountId}/rotate-key
DELETE /api/admin/accounts/{accountId}
GET  /api/admin/audit-logs
```

Admin API は管理セッション cookie を必須とする。

## 13. Firebase / Firestore 新規作成時の注意

### 13.1 Firestore mode

Cloud Firestore は Native mode を選択する。

### 13.2 Location

Firestore の location は作成後に変更できないため、最初に慎重に決める。

日本利用が主で、Vercel 側も日本近辺で動かす想定なら、東京リージョンを候補にする。

### 13.3 環境分離

Production / Preview / Development で Firestore project を分けるかを検討する。

MVPでは Production だけ先に接続し、Preview から Production DB を誤操作しないように Vercel 環境変数を分ける。

### 13.4 Firebase Admin SDK

Vercel Route Handler から Firebase Admin SDK を使って Firestore にアクセスする。

認証情報は Vercel Environment Variables に保存し、リポジトリには含めない。

想定環境変数:

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

`FIREBASE_PRIVATE_KEY` は改行を含むため、実装時に `\n` を復元する。

### 13.5 Security Rules

Firebase Admin SDK はサーバー側の特権アクセスになる。

そのため、Firestore Security Rules に頼らず、Next.js の Route Handler 側で必ず認証・認可を行う。

### 13.6 課金・利用量

少数アカウントの管理用途なら Firestore の読み書きは小さい見込み。

ただし、APIリクエストごとに認証、rate limit、ログ保存を行うため、アクセス増加時は reads/writes が増える。

必要に応じて Google Cloud / Firebase 側で予算アラートを設定する。

## 14. Firestore障害時の扱い

Firestore 接続、認証情報、読み書きで障害が起きた場合、Public API は `503 Service Unavailable` を返す。

理由:

- APIキー認証や rate limit を検証できない状態で生成APIを通すべきではない。
- fail closed として扱う。

レスポンス例:

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "現在APIを利用できません。時間をおいて再試行してください。"
  },
  "meta": {
    "requestId": "req_xxx"
  }
}
```

## 15. セキュリティ方針

- 管理者パスワード平文を保存しない。
- APIキー平文を保存しない。
- 登録後の APIキーは再表示しない。
- APIキー紛失時は再発行する。
- APIキー、参加者名、生リクエストbodyをログに保存しない。
- 管理画面は HttpOnly cookie セッションで保護する。
- 管理画面ログインには総当たり対策を入れる。
- APIは scope と enabled/status を必ず確認する。
- soft delete 済みアカウントの APIキーは必ず拒否する。

## 16. テスト設計

### 16.1 テスト観点一覧

機能観点:

- 管理画面ログインができること。
- PCのみ Gear Icon が表示されること。
- スマホ幅で管理画面本体が表示されないこと。
- アカウント追加、登録、更新、再発行、削除ができること。
- Public API が APIキー、scope、rate limit を判定できること。
- `generate` と `replay` が既存ロジックと同じ結果を返すこと。

非機能観点:

- 管理画面ログイン失敗時にロックが効くこと。
- Firestore障害時に fail closed で `503` を返すこと。
- rate limit 超過時に `429` を返すこと。
- APIキーや参加者名がログに残らないこと。
- 上限値内の最大入力でタイムアウトしないこと。

データ観点:

- accountName の一意性が保たれること。
- APIキーは hash のみ保存されること。
- soft delete 後のアカウントが一覧から消え、API利用できないこと。
- 監査ログに操作種別、対象、結果、requestId が残ること。
- API利用ログに participantCount, courtCount, roundCount, seed は残り、参加者名は残らないこと。

UI観点:

- 追加直後だけ APIキーの生値が見えること。
- 登録後は APIキーがマスク表示になること。
- scope がチェックボックスで操作できること。
- rate limit が数値入力で操作できること。
- 有効/無効がトグルで操作できること。
- 監査ログを管理画面から確認できること。

### 16.2 正常系

| Case | 対象 | 意図 |
| --- | --- | --- |
| N-001 | 管理ログイン | 正しいパスワードでログインできる |
| N-002 | アカウント追加 | accountName と任意 contactEmail で draft 行を作れる |
| N-003 | 登録 | scope/rate limit 設定後に active 化できる |
| N-004 | 更新 | scope/rate limit/enabled/contactEmail を更新できる |
| N-005 | 再発行 | 新APIキーを一度だけ表示し、旧キーを拒否できる |
| N-006 | 削除 | soft delete され、API利用できない |
| N-007 | generate | 有効キーと scope で生成APIを呼べる |
| N-008 | replay | 有効キーと scope で再現APIを呼べる |
| N-009 | ログ参照 | 管理画面で監査ログを確認できる |

### 16.3 異常系

| Case | 対象 | 意図 |
| --- | --- | --- |
| E-001 | 管理ログイン | 誤パスワードで拒否される |
| E-002 | 管理ログイン | 連続失敗でロックされる |
| E-003 | アカウント追加 | 重複 accountName を拒否する |
| E-004 | Public API | APIキーなしで `401` を返す |
| E-005 | Public API | 不正APIキーで `401` を返す |
| E-006 | Public API | scope不足で `403` を返す |
| E-007 | Public API | rate limit 超過で `429` を返す |
| E-008 | Public API | Firestore障害時に `503` を返す |
| E-009 | Public API | disabled/deleted アカウントを拒否する |

### 16.4 境界値

| Case | 対象 | 意図 |
| --- | --- | --- |
| B-001 | Public API | 参加人数4、面数1、回数1で成功 |
| B-002 | Public API | 参加人数30、面数8、回数20で成功 |
| B-003 | Public API | 参加人数31で `422` |
| B-004 | Public API | 面数9で `422` |
| B-005 | Public API | 回数21で `422` |
| B-006 | rate limit | 10回/分までは成功 |
| B-007 | rate limit | 11回目で `429` |

### 16.5 状態遷移

| Flow | 意図 |
| --- | --- |
| draft -> active | 登録前のAPIキーは使えず、登録後に使える |
| active -> disabled | 無効化後はAPI利用できない |
| disabled -> active | 再有効化後はAPI利用できる |
| active -> rotated | 再発行後、旧キーは拒否され新キーだけ使える |
| active -> deleted | 削除後は一覧非表示でAPI利用不可 |
| generate -> replay | generate の seed を replay に渡すと同じ組合せになる |

## 17. 実装順

1. この設計書を追加する。
2. Firebase project / Firestore を新規作成する。
3. Vercel 環境変数を設計する。
4. Firebase Admin SDK 接続層を追加する。
5. 管理者ログインと session cookie を実装する。
6. 管理画面のPC専用UIを実装する。
7. アカウント追加、登録、更新、再発行、soft delete を実装する。
8. 監査ログタブを実装する。
9. Public API の APIキー認証を実装する。
10. scope 判定と rate limit を実装する。
11. `generate` / `replay` API を実装する。
12. 単体テスト、APIテスト、E2E確認を追加する。
13. `npm run build` で本番ビルドを確認する。

## 18. 今後の検討事項

- 管理者を複数人にする場合の Firebase Auth 移行。
- API成功ログの保存期間。
- Firestore TTL の導入。
- Vercel KV / Redis への rate limit 移行。
- アカウント別利用量ダッシュボード。
- APIキーの有効期限。
- APIキー再発行時の猶予期間。
- OpenAPI 仕様書の生成。
- Codex private plugin 側の接続仕様。
