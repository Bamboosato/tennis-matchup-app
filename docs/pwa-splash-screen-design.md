# PWA アプリ内スプラッシュ設計

## 1. 目的

PWA standalone 起動時に Bamboosato ブランドロゴを短時間表示し、ホーム画面から起動したときのアプリらしさを高める。

ブラウザや OS のネイティブスプラッシュ指定は端末差が大きいため、まずはアプリ内 overlay として実装する。

## 2. 対象範囲

### 2.1 対象

- ブランドロゴ画像の軽量 WebP 化
- PWA standalone 起動時のみ表示するアプリ内スプラッシュ
- 同一ブラウザセッションでは 1 回だけ表示する制御
- Service Worker による `/brand/*` 静的キャッシュ
- PWA E2E による表示条件とキャッシュ対象の確認

### 2.2 対象外

- OS ネイティブの `apple-touch-startup-image`
- Android / Chrome が Web Manifest から生成するネイティブスプラッシュの個別制御
- Push 通知やバックグラウンド同期
- 通常ブラウザタブでのスプラッシュ表示

## 3. UI 方針

スプラッシュは fullscreen overlay とし、中央に Bamboosato ロゴを表示する。

通常ブラウザタブでは表示しない。`display-mode: standalone` または iOS Safari の `navigator.standalone` が成立した場合のみ表示する。

表示時間は短くし、約 1.2 秒表示後に fade out して画面操作へ移る。同一 session 内では `sessionStorage` に表示済みを記録し、リロードや画面遷移で繰り返し表示しない。

## 4. キャッシュ方針

スプラッシュ用ロゴは `public/brand/logo-bamboosato.webp` に配置する。

Service Worker は `/brand/*` を静的アセットとして扱い、ロゴをinstall時にprecacheする。runtime cacheはstale while revalidateとする。アイコンとはキャッシュ戦略を分け、詳細は [Service Worker設計](pwa-service-worker-design.md) を参照する。

## 5. テスト設計

### 5.1 テスト観点

機能観点:

- PWA standalone 起動時だけスプラッシュが表示されること。
- 通常ブラウザタブではスプラッシュが表示されないこと。
- 同一 session 内の reload では再表示されないこと。

非機能観点:

- スプラッシュ表示が長すぎず、起動後の操作を妨げないこと。
- ロゴ画像が軽量化され、Service Worker の静的キャッシュ対象になること。

データ観点:

- API レスポンスや HTML はキャッシュしない既存方針を維持すること。
- `/brand/*` のみ静的アセットとして追加すること。

UI 観点:

- ロゴが中央に表示されること。
- 通常のトップナビや Conditions パネルのレイアウトを変更しないこと。

### 5.2 正常系

- standalone 表示モードで起動し、ロゴ overlay が表示されて消える。
- overlay 消去後に reload しても同一 session では再表示されない。
- Service Worker が `/brand/logo-bamboosato.webp` をキャッシュできる。

### 5.3 異常系

- Service Worker が利用できない環境でもスプラッシュ表示自体は成立する。
- 通常ブラウザタブでは `display-mode: standalone` が成立しないため表示しない。

## 6. リスク

まず防ぐべき不具合:

- 通常ブラウザタブでも毎回スプラッシュが出て操作を妨げる。
- reload や画面遷移のたびに表示される。
- ロゴ画像が大きすぎて起動時に重くなる。

対策:

- standalone 判定を必須にする。
- `sessionStorage` で session 内 1 回表示にする。
- ロゴは軽量 WebP を使用する。
- E2E で通常タブ非表示、standalone 表示、reload 非再表示を確認する。
