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
- PWA としてホーム画面追加に対応

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

### PWA

- 対応ブラウザではインストールプロンプトを表示
- iPhone / iPad では共有メニューからホーム画面追加

## 技術スタック

- Next.js 16
- React 19
- TypeScript
- Zustand
- Zod
- Tailwind CSS 4
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

### データ観点

- 参加人数に対して使用可能なコート数が正しく計算されること
- 休憩人数、出場人数、ラウンド数が条件どおりに扱われること

### UI観点

- PC / スマホで条件入力と結果表示が破綻しないこと
- 印刷用画面で主要情報が確認できること

### 非機能観点

- ビルドが通ること
- PWA インストール導線が成立すること

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

## ディレクトリ概要

```text
src/
  app/          画面とルート
  components/   UI コンポーネント
  features/     組合せ生成ロジック
  hooks/        画面ロジック
  lib/          定数
  stores/       Zustand ストア
e2e/            Playwright テスト
public/         アイコンなどの静的ファイル
```

## デプロイ

Vercel で公開しています。現在の運用は以下です。

- GitHub: `main` ブランチ運用
- Vercel: GitHub 連携で自動デプロイ
- `main` への push で本番反映

### 初回デプロイの流れ

1. GitHub にリポジトリを作成
2. `main` ブランチを push
3. Vercel で GitHub リポジトリを Import
4. `Next.js` 設定のまま Deploy

このプロジェクトでは、現時点で必須の環境変数はありません。

## バージョン管理

- アプリ version は `package.json` で管理
- 初回公開タグは `v0.1.0`
- 開発ラインは Git ブランチで分離し、version とは別で扱う
