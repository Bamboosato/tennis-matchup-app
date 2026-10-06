# Tennis Matchup App

ダブルスとシングルスのテニス対戦組合せを、PC とスマホの両方で使いやすい形で作成する Next.js アプリです。
参加人数、コート数、ラウンド数を入力すると、連続休憩の回避と休憩回数の公平性を考慮しつつ、顔合わせの偏りを抑えた組合せを生成します。人数と面数の条件によっては、連続休憩や対戦の重複を完全には避けられません。

公開URL: [https://tennis-matchup-app.bamboosato.com/](https://tennis-matchup-app.bamboosato.com/)

## 主な機能

- ダブルス / シングルスを切り替えて組合せを生成
- ダブルスでは通常 / 同性対決優先 / 混合対決優先を選択
- 参加人数、コート数、ラウンド数、開催名を指定して組合せを生成
- 参加者を `01` からの連番で自動採番
- 使用面数、1 回あたりの出場人数、休憩人数を生成前に表示
- 生成済み条件のまま `組合せ作成／再作成` を再タップして再生成
- 各ラウンドのコート割り、休憩者、集計結果を表示
- ラウンドの実施済み管理と、途中参加・退出・追加ラウンドに応じた未実施ラウンドの再作成
- ダブルス / シングルスの生成済み条件、結果、進行状態を画面切替中に個別保持
- アプリURLと、生成済み対戦表のURL / QRコード共有
- 印刷プレビュー画面を別タブで開いて A4 印刷
- 現在の組合せを PDF として出力
- PWA としてホーム画面追加に対応
- 別アプリ向けに組合せ生成 / seed 再現 API を公開
- PC向け管理画面でアカウント別 APIキー、scope、rate limit、有効/無効を管理
- 監査ログと API利用ログを管理画面で確認

## 画面と挙動

### 条件入力

- 開催名
- 試合形式（ダブルス / シングルス）
- 参加人数
- コート数
- ラウンド数
- 対戦モード、女性人数、男性人数（ダブルスのみ。通常モードでは性別人数入力は無効）

画面と API の入力上限は共通で、参加人数はダブルス4〜30人 / シングルス2〜30人、コート数は1〜8面、ラウンド数は1〜20回です。性別優先モードでは女性人数と男性人数の合計を参加人数に一致させ、女性から先に `01` 起点で採番します。結果の性別表示は `F` / `M`、ダブルスのペア表記は `01 & 02`、シングルスは `01 vs 02` です。

入力値に応じて、以下を即時表示します。

- 使用面数
- 1回あたりの出場人数
- 1回あたりの休憩人数

コートはダブルスでは `参加人数 / 4`、シングルスでは `参加人数 / 2` を超えては使えないため、入力したコート数が多い場合は確認後にコート数を調整して生成します。

### 組合せ生成

- 生成時は複数 seed を候補として試行し、スコアの最も良い組合せを採用
- 再作成時は seed を変えて別候補を生成
- 結果には採用 seed と総合スコアを表示

同性対決優先・混合対決優先は優先条件です。性別人数の構成上成立しない場合も、生成を続けます。再作成で seed が変わっても、条件によっては同じ対戦内容になることがあります。

### ラウンド進行と途中再作成

- 実施済みは先頭から連続したラウンドのみ指定でき、現ラウンドを完了にするか、直前の未ロックの実施済みラウンドを戻せます
- 結果下部の途中変更パネルで、退出者・追加参加者・追加ラウンドのいずれかを指定し、実施済みの対戦を固定して以降だけを再作成します
- 途中再作成で固定した実施済みラウンドは、未実施へ戻せません
- 退出者は履歴に残し、今後の生成対象から除外します。追加者は最大番号の次から採番し、退出した番号は再利用しません
- 退出者を含む参加者履歴は総計30人まで、追加後のラウンド数は20回までです。今後の生成対象者はダブルス4人以上 / シングルス2人以上が必要です
- 全ラウンド実施済みの場合も、上限内でラウンドを追加すれば再作成できます
- 途中再作成した対戦表は印刷・PDF出力できますが、対戦表URL共有と印刷・PDFの共有QRは無効になります

詳細は [途中再作成設計](docs/continuation-matchup-design.md) を参照してください。

### ナビゲーション・共有・状態保持

- `/doubles` と `/singles` が正式な対戦表画面です。`/` はダブルスの互換入口です
- トップナビの `共有` はアプリの公開URL、結果欄の共有ボタンは現在の対戦表を共有します。端末の共有メニュー、URLコピー、QR表示に対応します
- 対戦表URLには試合形式、人数、面数、回数、対戦モード、必要な性別人数、開催名、採用seedを含め、受信側で対戦表を再生成します。進行状態や途中変更履歴は含みません
- ダブルス / シングルスの生成済み状態は Zustand のメモリ内で分離して保持します。再読み込みやアプリ再起動では消えます。未生成のフォーム編集値や途中変更の下書きは画面切替で保持しません
- 通常の対戦表は共有URLから再表示できます。途中再作成結果を保存したい場合は、その時点でPDF出力または印刷してください

共有URLの互換仕様と保存範囲は [共有・状態管理設計](docs/sharing-and-state-design.md) を参照してください。

### 印刷

- `印刷プレビューを開く` で `/print` を別タブ表示
- 印刷用データは `localStorage` 経由で引き渡し
- ブラウザの印刷機能で A4 出力
- 共有可能な対戦表には共有QRを表示。印刷データは最後にプレビューへ渡した1件で、別タブからの上書きで更新されます

### PDF出力

- `PDFを出力` でアプリ内生成のPDFをダウンロード
- `jsPDF` と `jspdf-autotable` を利用
- 1ページあたり最大12ラウンドを表形式で配置
- ヘッダに開催名、ラウンド数、コート数、参加人数を表示
- フッタにページ番号と、共有可能な対戦表では各ページ右下に組合せ共有QRコードを表示

### PWA

- 対応ブラウザではインストールプロンプトを表示
- iPhone / iPad では共有メニューからホーム画面追加
- PWA standalone 起動時はブランドロゴのアプリ内スプラッシュを一度だけ表示
- Service Worker は production 環境で登録し、`/_next/static/*`、`/brand/*`、`/icons/*`、`/fonts/*` の静的アセットのみをキャッシュ
- `/icons/*` は cache firstで再利用し、キャッシュ済みアイコンのネットワーク再検証は行いません。他の対象静的アセットは stale while revalidateで更新します
- manifest・画面のアイコンURLは共通の `iconv` を使い、主要アイコンはinstall時にprecacheします。HTTPキャッシュは1年のimmutable設定です。画像更新時はアイコンversionとprecache URLを合わせて更新します
- HTML、組合せ生成 API、管理 API のレスポンスは Service Worker キャッシュ対象外
- HTMLを保存しないため、完全オフラインでの起動・画面表示を保証するものではありません

Service Worker の詳細仕様は [docs/pwa-service-worker-design.md](docs/pwa-service-worker-design.md) を参照してください。

### API / 管理画面

- PC 表示のトップナビにある `管理用` から `/admin` に遷移
- 管理画面は管理者パスワードでログイン
- アカウント単位で APIキーを発行し、登録後の生キーは再表示しない
- 紛失時は管理画面から APIキーを再発行
- scope は `matchups:generate` / `matchups:replay` を個別に許可
- rate limit はアカウント単位で 1分あたりの回数を設定
- 公開 API は `Authorization: Bearer <API_KEY>` で認証
- API入力では試合形式を `matchFormat` で指定可能。未指定時は `doubles`
- ダブルスでは画面と同じ対戦モードを `matchupMode` で指定可能。未指定時は通常扱い

| Method | Path | 用途 |
| --- | --- | --- |
| POST | `/api/v1/matchups/generate` | UI と同じく最適化して組合せを生成 |
| POST | `/api/v1/matchups/replay` | 確定済み seed で同じ組合せを再現 |

API入力上限は以下です。

| 項目 | 最小 | 上限 |
| --- | ---: | ---: |
| 参加人数（ダブルス） | 4 | 30 |
| 参加人数（シングルス） | 2 | 30 |
| 面数 | 1 | 8 |
| 回数 | 1 | 20 |

試合形式の API 値は以下です。

| 画面表示 | API値 |
| --- | --- |
| ダブルス | `doubles` |
| シングルス | `singles` |

対戦モードの API 値は以下です。

| 画面表示 | API値 |
| --- | --- |
| 通常 | `standard` |
| 同性対決優先 | `sameGenderPriority` |
| 混合対決優先 | `mixedDoublesPriority` |

`sameGenderPriority` / `mixedDoublesPriority` では、ダブルスの場合のみ各参加者に `gender: "female" | "male"` が必要です。`standard` では任意で、指定した場合は API レスポンスの `conditions.participants[]` に保持されます。シングルスでは `matchupMode` / `gender` を生成に使いませんが、指定された値はレスポンスに保持します。

詳細仕様は [docs/api-design.md](docs/api-design.md) と [docs/api-admin-design.md](docs/api-admin-design.md) を参照してください。

## 技術スタック

- Next.js 16
- React 19
- TypeScript
- Zustand
- Zod
- Tailwind CSS 4
- jsPDF
- jspdf-autotable
- qrcode（共有QR生成）
- Vercel Web Analytics（ルートlayoutに組み込み）
- Firebase Admin SDK
- Cloud Firestore
- Vitest
- Playwright

## セットアップ

### 前提

- Node.js 20.9.0 以上（インストール済み Next.js 16.2.4 の要件）
- npm を利用

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### 環境変数

管理画面と公開 API を利用する場合は、`.env.local` または Vercel Environment Variables に以下を設定します。

```env
FIREBASE_PROJECT_ID=tennis-matchup-app
FIREBASE_CLIENT_EMAIL=<Firebase Admin SDK service account email>
FIREBASE_PRIVATE_KEY=<Firebase Admin SDK private key>
ADMIN_PASSWORD_HASH=<pbkdf2 password hash>
ADMIN_SESSION_SECRET=<random secret>
```

`FIREBASE_PRIVATE_KEY` は改行を `\n` として設定できます。APIキーは管理画面で発行するため、固定値を環境変数に直接保存しません。

## 主要コマンド

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:watch
npm run test:e2e
```

## テスト観点

### 機能観点

- 条件入力から組合せ生成まで正常に進むこと
- 再作成で採用 seed が更新されること
- 印刷プレビューが別タブで開くこと
- PDFがダウンロードできること
- 管理画面でログイン、アカウント登録、APIキー再発行、設定更新ができること
- 有効な APIキーで generate / replay API を呼び出せること

### データ観点

- 試合形式ごとに使用可能なコート数が正しく計算されること
- 休憩人数、出場人数、ラウンド数が条件どおりに扱われること
- API入力上限、scope、rate limit、有効/無効状態が正しく判定されること
- `matchFormat` 未指定時はダブルス、対戦モード未指定時は通常扱いになること
- ダブルスの性別優先モードでは参加者性別必須、シングルスでは `matchupMode` / `gender` が生成に影響しないこと

### UI観点

- PC / スマホで条件入力と結果表示が破綻しないこと
- 印刷用画面で主要情報が確認できること
- PDFでヘッダ、表、QR、ページ番号が破綻しないこと
- 管理画面は PC のみ表示され、スマホでは利用不可の案内になること

### 非機能観点

- ビルドが通ること
- PWA インストール導線が成立すること
- Service Worker が静的アセットだけをキャッシュし、HTML / API をキャッシュしないこと
- Firestore 障害時に API が fail closed で失敗すること
- APIキーや参加者名などの秘匿情報をログに残さないこと

## ローカル確認手順

### 1. 単体テスト

```bash
npm run test
```

### 2. E2E テスト

```bash
npx playwright install chromium
npm run test:e2e
```

E2E は現在 Chromium 1プロジェクトで、ポート3001の開発サーバーを使用します。`reuseExistingServer: true` のため、既存サーバーを使う場合は対象コードが最新であることを確認してください。変更範囲とリスクに応じて対象ケースを選び、同一実機に対するスクリプトの並列実行は避けてください。例: `npm run test:e2e -- e2e/app.spec.ts --project=chromium --workers=1`。クロスブラウザー検証は現行設定には含まれません。

### 3. 本番ビルド確認

```bash
npm run build
```

### 4. 管理画面 / API 確認

1. `.env.local` に Firebase Admin SDK と管理者認証用の環境変数を設定
2. `npm run dev` で起動
3. PC 幅のブラウザで `/admin` にアクセス
4. 管理者ログイン後、アカウントを追加して APIキーを登録
5. `POST /api/v1/matchups/generate` と `POST /api/v1/matchups/replay` を `Authorization: Bearer <API_KEY>` 付きで実行
6. 管理画面で監査ログと API利用ログを確認

## ディレクトリ概要

```text
src/
  app/          画面、Route Handler、管理画面
  components/   UI コンポーネント
  features/     組合せ生成ロジック、管理機能
  hooks/        画面ロジック
  lib/          定数、server 共通処理
  stores/       Zustand ストア
e2e/            Playwright テスト
public/         アイコンなどの静的ファイル
docs/           API、生成モード、進行、共有、PWA の設計文書
```

## 設計文書

| 文書 | 内容 |
| --- | --- |
| [API仕様](docs/api-design.md) | generate / replay、入力、レスポンス、呼び出し元設定 |
| [API・管理画面設計](docs/api-admin-design.md) | アカウント、キー、scope、rate limit、Firestore、ログ |
| [対戦モード設計](docs/matchup-mode-design.md) | ダブルスの性別優先とスコア |
| [シングルス設計](docs/singles-matchup-design.md) | 試合形式、ルーティング、表示・APIの互換 |
| [途中再作成設計](docs/continuation-matchup-design.md) | 実施済み、参加者増減、追加ラウンド |
| [ナビゲーション設計](docs/header-navigation-design.md) | PC / スマホのメニューと操作 |
| [共有・状態管理設計](docs/sharing-and-state-design.md) | URL / QR共有、互換、保存範囲 |
| [Service Worker設計](docs/pwa-service-worker-design.md) | 静的アセットキャッシュ |
| [スプラッシュ設計](docs/pwa-splash-screen-design.md) | standalone起動時のロゴ表示 |
| [2026-10-06 整合性確認](docs/implementation-audit-2026-10-06.md) | 確認対象、修正内容、公開済みとローカル変更の区別、検証範囲 |

## デプロイ

Vercel で公開しています。現在の運用は以下です。

- GitHub: `main` ブランチ運用
- Vercel: GitHub 連携で自動デプロイ
- `main` への push で本番反映
- 管理画面 / API を利用する環境では Firebase Admin SDK と管理者認証用の環境変数が必要

### 初回デプロイの流れ

1. GitHub にリポジトリを作成
2. `main` ブランチを push
3. Vercel で GitHub リポジトリを Import
4. `Next.js` 設定のまま Deploy
5. Firebase プロジェクトを作成し、Cloud Firestore を有効化
6. Firebase Admin SDK のサービスアカウント情報を Vercel Environment Variables に設定
7. `ADMIN_PASSWORD_HASH` と `ADMIN_SESSION_SECRET` を Vercel Environment Variables に設定

## バージョン管理

- アプリ version は `package.json` で管理
- 初回公開タグは `v0.1.0`
- API / 管理画面追加リリースは `v1.1.0`
- 途中参加・退出時の残りラウンド再作成は `v1.2.0` で追加済み
- トップナビゲーション改善は `v1.2.1` で追加
- シングルス対応と試合形式別の状態保持は `v1.3.0` で追加
- 開発ラインは Git ブランチで分離し、version とは別で扱う
