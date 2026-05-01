# Tennis Matchup App

ダブルス向けのテニス対戦組合せを、PC とスマホの両方で使いやすい形で作成する Next.js アプリです。  
参加人数、コート数、実施回数を入力すると、休憩の公平性と連続休憩なしを優先しつつ、顔合わせの偏りを抑えた組合せを生成します。

公開URL: [https://tennis-matchup-app.vercel.app/](https://tennis-matchup-app.vercel.app/)

## 主な機能

- 参加人数、コート数、実施回数、開催名を指定して組合せを生成
- 参加者を `00` からの連番で自動採番
- 使用面数、1 回あたりの出場人数、休憩人数を生成前に表示
- 生成済み条件のまま `組合せ作成／再作成` を再タップして再生成
- 各ラウンドのコート割り、休憩者、集計結果を表示
- 印刷プレビュー画面を別タブで開いて A4 印刷
- 現在の組合せを PDF として出力
- PWA としてホーム画面追加に対応
- 別アプリ向けに組合せ生成 / seed 再現 API を公開
- PC向け管理画面でアカウント別 APIキー、scope、rate limit、有効/無効を管理
- 監査ログと API利用ログを管理画面で確認

## 画面と挙動

### 条件入力

- 開催名
- 参加人数
- コート数
- 実施回数

入力値に応じて、以下を即時表示します。

- 使用面数
- 1回あたりの出場人数
- 1回あたりの休憩人数

コートは `参加人数 / 4` を超えては使えないため、入力したコート数が多くても実際の使用面数は自動で調整されます。

### 組合せ生成

- 生成時は複数 seed を候補として試行し、スコアの最も良い組合せを採用
- 再作成時は seed を変えて別候補を生成
- 結果には採用 seed と総合スコアを表示

### 印刷

- `印刷プレビューを開く` で `/print` を別タブ表示
- 印刷用データは `localStorage` 経由で引き渡し
- ブラウザの印刷機能で A4 出力

### PDF出力

- `PDFを出力` でアプリ内生成のPDFをダウンロード
- `jsPDF` と `jspdf-autotable` を利用
- 1ページあたり最大12ラウンドを表形式で配置
- ヘッダに開催名、ラウンド数、コート数、参加人数を表示
- フッタにページ番号と、各ページ右下に組合せ共有QRコードを表示

### PWA

- 対応ブラウザではインストールプロンプトを表示
- iPhone / iPad では共有メニューからホーム画面追加

### API / 管理画面

- ホーム画面の Gear Icon から PC のみ `/admin` に遷移
- 管理画面は管理者パスワードでログイン
- アカウント単位で APIキーを発行し、登録後の生キーは再表示しない
- 紛失時は管理画面から APIキーを再発行
- scope は `matchups:generate` / `matchups:replay` を個別に許可
- rate limit はアカウント単位で 1分あたりの回数を設定
- 公開 API は `Authorization: Bearer <API_KEY>` で認証

| Method | Path | 用途 |
| --- | --- | --- |
| POST | `/api/v1/matchups/generate` | UI と同じく最適化して組合せを生成 |
| POST | `/api/v1/matchups/replay` | 確定済み seed で同じ組合せを再現 |

API入力上限は以下です。

| 項目 | 上限 |
| --- | ---: |
| 参加人数 | 30 |
| 面数 | 8 |
| 回数 | 20 |

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
- Firebase Admin SDK
- Cloud Firestore
- Vitest
- Playwright

## セットアップ

### 前提

- Node.js 20 以上を推奨
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

- 参加人数に対して使用可能なコート数が正しく計算されること
- 休憩人数、出場人数、ラウンド数が条件どおりに扱われること
- API入力上限、scope、rate limit、有効/無効状態が正しく判定されること

### UI観点

- PC / スマホで条件入力と結果表示が破綻しないこと
- 印刷用画面で主要情報が確認できること
- PDFでヘッダ、表、QR、ページ番号が破綻しないこと
- 管理画面は PC のみ表示され、スマホでは利用不可の案内になること

### 非機能観点

- ビルドが通ること
- PWA インストール導線が成立すること
- Firestore 障害時に API が fail closed で失敗すること
- APIキーや参加者名などの秘匿情報をログに残さないこと

## ローカル確認手順

### 1. 単体テスト

```bash
npm run test
```

### 2. E2E テスト

```bash
npm run test:e2e
```

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
```

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
- 開発ラインは Git ブランチで分離し、version とは別で扱う
