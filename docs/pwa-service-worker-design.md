# PWA Service Worker 静的アセットキャッシュ設計

## 1. 目的

ホーム画面追加後の再訪問や通信状態が不安定な場面で、アイコン、フォント、Next.js のビルド済み静的アセットを Service Worker 経由で再利用しやすくする。

本対応は静的アセットの体感改善に限定し、画面 HTML、組合せ生成 API、管理 API、対戦結果データはキャッシュしない。

## 2. 対象範囲

### 2.1 対象

- `public/sw.js` による Service Worker の追加
- production 環境での Service Worker 登録
- `/brand/*`、`/fonts/*`、`/_next/static/*` の stale while revalidate runtime cache
- `/icons/*` の cache first runtime cache
- `/icons/icon-192.png?iconv=transparent-v1`、`/icons/icon-512.png?iconv=transparent-v1` の install 時 precache
- 既存 manifest / 既存クライアント互換用の `/icons/icon-192.png`、`/icons/icon-512.png` の install 時 precache 維持
- 画面表示用アイコンは deploy commit 連動の `assetv` を付けず、手動更新用の安定した `iconv` を使う
- `/sw.js` の no-store ヘッダー設定
- Service Worker とキャッシュ対象の E2E 検証

### 2.2 対象外

- HTML のオフラインキャッシュ
- API レスポンスのキャッシュ
- 管理画面 / 管理 API のキャッシュ
- Push 通知
- Background Sync
- IndexedDB へのデータ保存

## 3. キャッシュ方針

| 対象 | 方針 | 理由 |
| --- | --- | --- |
| `/_next/static/*` | stale while revalidate | ファイル名がビルド単位で変わるため古いレスポンスを使っても安全性が高い |
| `/brand/*` | stale while revalidate + スプラッシュロゴ precache | PWA standalone 起動時のブランドロゴ表示に必要になる |
| `/icons/*` | cache first + 主要アイコン precache | ホーム画面追加、ヘッダー表示、再訪問時に必要になる。`iconv` を変えない通常のアプリ更新では再取得しない |
| `/fonts/*` | stale while revalidate | 表示安定性を上げる |
| HTML | キャッシュしない | 古い画面が残る事故を避ける |
| `/api/*` | キャッシュしない | 生成結果、管理情報、認証状態を古くしない |

Service Worker 自体は `/sw.js` として配信し、`Cache-Control: no-cache, no-store, must-revalidate` を付ける。

画面左上のアプリアイコンと metadata の icon URL は `iconv=transparent-v1` のような手動バージョンを使う。`NEXT_PUBLIC_ASSET_VERSION` / Vercel commit SHA 由来の `assetv` は付けない。これにより、アプリ本体を更新してもアイコンの URL は変わらず、Service Worker とブラウザキャッシュを再利用できる。

`/icons/*` は cache first とし、キャッシュに存在する場合はバックグラウンド再検証も行わない。アイコン画像そのものを差し替える場合は `src/lib/constants/assets.ts` の `APP_ICON_VERSION` と `public/sw.js` の precache URL を同時に更新する。

## 4. キャッシュバージョン

キャッシュ名は `tennis-matchup-static-v1` とする。

この version はアプリ version ではなく、キャッシュ方針の version として扱う。通常のアプリ更新では変更しない。キャッシュ対象、キャッシュ戦略、保存データの扱いを変える場合だけ更新する。

Service Worker の `activate` で `tennis-matchup-static-` から始まる古いキャッシュを削除し、静的アセットキャッシュだけを入れ替える。

## 5. テスト設計

### 5.1 テスト観点

機能観点:

- `/sw.js` が配信されること。
- Service Worker 登録後、対象静的アセットが Cache Storage に保存されること。
- `/api/*` が Cache Storage に保存されないこと。

非機能観点:

- Service Worker 登録失敗時も画面利用を妨げないこと。
- 開発時の HMR や E2E に影響しないよう、アプリからの自動登録は production に限定すること。
- `/sw.js` がブラウザに強くキャッシュされず、更新を拾えること。

データ観点:

- 参加者、seed、組合せ結果、管理 API のレスポンスをキャッシュしないこと。
- キャッシュキーはリクエスト URL 単位で扱い、`iconv` クエリ付きアイコンも別リソースとして扱えること。

UI 観点:

- Service Worker 追加による画面表示変更はないこと。
- PWA インストール導線やトップナビの表示が変わらないこと。

### 5.2 正常系

- `/sw.js` を取得し、JavaScript として配信されることを確認する。
- Service Worker を登録し、`/icons/icon-192.png?iconv=transparent-v1` が install 時に静的キャッシュへ保存されることを確認する。
- キャッシュ済みの `/icons/*` を再取得してもネットワーク再検証しないことを確認する。

### 5.3 異常系

- Service Worker が利用できないブラウザでも画面表示に影響しない。
- API を取得しても静的キャッシュに保存されない。

### 5.4 境界値

- 同一 origin の GET のみキャッシュ対象にする。
- Range request はキャッシュ対象外にする。
- キャッシュ対象パスの prefix に一致しない URL はキャッシュしない。

### 5.5 状態遷移

| 状態 | 操作 | 期待状態 |
| --- | --- | --- |
| Service Worker 未登録 | production 画面を開く | `/sw.js` が登録される |
| 新 Service Worker install | 主要アイコンを precache | 静的キャッシュが作成される |
| `/icons/*` fetch 発生 | 対象アイコンを取得 | cache hit があれば返し、ネットワーク再検証しない |
| `/icons/*` 以外の静的 fetch 発生 | 対象静的アセットを取得 | cache hit があれば返し、裏で更新する |
| activate | 古い静的キャッシュあり | 現行キャッシュ以外を削除する |

## 6. リスク

まず防ぐべき不具合:

- HTML や API をキャッシュして古い画面・古い生成結果・古い管理情報を返す。
- Service Worker ファイル自体が強くキャッシュされ、更新できなくなる。
- 開発時の Service Worker が残り、HMR や E2E の挙動を不安定にする。

対策:

- fetch handler で対象 path を明示的に限定する。
- `/sw.js` に no-store ヘッダーを設定する。
- 自動登録は production のみにする。
- E2E では登録、静的キャッシュ、API 非キャッシュを明示的に確認する。
