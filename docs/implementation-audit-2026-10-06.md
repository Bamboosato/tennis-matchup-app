# 実装・ドキュメント整合性確認（2026-10-06）

## 1. 確認対象と基準

GitHubの `Bamboosato/tennis-matchup-app` の `main` と、ローカルの `HEAD` / `origin/main` は確認時点で同じコミット `024d75b5c1d314d7ea24d438ddcda8180c30f527`。`package.json` のアプリversionは `1.3.0`。

README、`docs/` の既存8設計文書、CLAUDE.md / AGENTS.md、画面・store・生成ロジック・API Route Handler・管理画面・印刷・PDF・PWA実装、package.json / Playwright設定、関連する既存テストを照合した。GitHubはAPIでmainのSHAを確認し、そのコミットのローカルファイルを公開済み文書の基準とした。

1〜6節は初回の文書照合と一時ファイル整理の記録である。その時点ではGitHubへのpush、実装コード変更、バージョン更新、デプロイは行っていない。後続のPR対応とマージ前検証は7節に記載する。

## 2. 先に整理した確認観点

- 機能: 生成、試合形式・モード、再作成、進行、共有、印刷、PDF、PWA、管理・公開APIの記載有無
- データ: 人数・面数・回数、採番、性別、seed、形式別状態、保存範囲、履歴、レスポンスとログ
- UI: PC / スマホナビ、管理用導線、共有の種類、未実装画面機能、ペア表記、操作の無効条件
- 非機能: 再現性、認証・scope・rate limit、クラウド障害、複数タブ、静的キャッシュ、実行環境とテスト範囲

正常系、異常系、境界値、状態遷移を分けて確認した。主に優先したのは、誤った認証設定、対戦表が永続保存されるという誤解、途中変更履歴を共有できるという誤解である。

## 3. 主な相違と修正

| 項目 | 相違・記載不足 | 文書への反映と根拠 |
| --- | --- | --- |
| 自動採番 | READMEは `00` 起点、実装は `01` 起点 | READMEを修正。[shareMatchup.ts](../src/features/matchmaking/application/shareMatchup.ts) の `formatParticipantLabel` と途中追加の採番を照合 |
| 生成条件 | READMEにダブルス3モード・男女別人数の説明が不足 | 通常 / 同性 / 混合、女性先頭採番、成立しない構成でも生成を続ける優先条件を追記 |
| 対戦表記 | 設計のペア例が `/` 区切り | `01 & 02` と `vs` に更新。[formatParticipantName.ts](../src/features/matchmaking/application/formatParticipantName.ts) の共通書式と出力経路を照合 |
| 途中再作成 | READMEはリリース履歴のみ。設計は追加予定・ダブルス最小4人のみ | 実装済み、追加ラウンド、ロック、退出者履歴、総計30人 / 20回、シングルス最小2人を明記。[generateContinuationMatchupUseCase.ts](../src/features/matchmaking/application/generateContinuationMatchupUseCase.ts) を照合 |
| 退出者UI | 同じ設計内で「無効表示」と「表示しない」が混在 | 全履歴を表示し、退出済みは選択不可と統一。[ContinuationPanel.tsx](../src/components/results/ContinuationPanel.tsx) を照合 |
| 状態保持 | 形式別保持の寿命・保持しない下書きの説明が不足 | メモリ内の生成済み条件・結果・進行のみ、reloadで消失と追記。[matchupStore.ts](../src/stores/matchupStore.ts) と画面初期化を照合 |
| 共有 | READMEにアプリ共有 / 対戦表共有とURL互換の説明が不足 | [共有・状態管理設計](sharing-and-state-design.md) を新設。`1.00` / `1.10` / `1.20`、seed直接復元、途中結果の共有不可を明記 |
| 印刷データ | localStorageの保存期間・1件上書き・タブ競合の説明が不足 | READMEと共有設計へ追記。[印刷画面](../src/app/print/page.tsx) のstorageイベント監視を照合 |
| 公開API認証 | 初期API設計に提供元の固定環境変数キーと個別rate limit対象外が残存 | Firestoreによるアカウント別キー・scope・rate limitへ更新。提供元と呼び出し元の環境変数を区別。[apiAuth.ts](../src/features/admin/application/apiAuth.ts) を照合 |
| APIレスポンス | meta省略、403 / 429 / 503欠落、独自405コード、実在しないファイルパス | `meta.requestId`、エラー表、現行ファイル構成、seed補完式を修正。レスポンス構造例の総合スコアも重み付き計算に合わせた |
| 管理ログ | 検索・フィルタとタブUIが実装済みに読め、API利用ログendpointが一覧にない | セクション表示・直近200件・更新操作を現行機能とし、検索は未実装と明記。ログ未記録経路も補足。[AdminDashboard.tsx](../src/app/admin/AdminDashboard.tsx) とRoute Handlerを照合 |
| ナビ | 設計の「現状」が改善前の画面を記述 | 改善前記録と区別し、現在のAppHeaderNavを明記 |
| PWA | スプラッシュ設計でロゴとアイコンが同じruntime戦略に読める | ロゴのprecacheとstale while revalidateを明記。アイコンはService Worker設計を参照 |
| 開発・文書導線 | Node要件が曖昧。E2Eの環境・対象選定と設計文書一覧が不足 | Next.jsのNode `>=20.9.0`、Chromium / port3001 / 既存サーバー再利用、対象実行例、文書一覧をREADMEへ追加 |

## 4. GitHub公開済みと作業開始時のローカル変更

作業開始時から、以下に未コミット変更または未追跡ファイルが存在していた。最初の文書更新ではこれらを変更・削除せず保持した。その後、ユーザーの依頼でコミット要否を判定し、一時ファイルを削除した（4.1節）。

- `docs/pwa-service-worker-design.md`
- `e2e/pwa.spec.ts`
- `next.config.ts`
- `public/sw.js`
- `src/app/manifest.ts`
- `src/components/pwa/serviceWorkerCache.test.ts`
- `.playwright-mcp/`

確認開始時点のGitHub公開済みService Workerはアイコンを含む静的アセットをstale while revalidateで扱っていた。ローカルにはアイコンのcache first化、`iconv` 付きアイコンのprecache、manifestのアイコンURL、HTTPキャッシュ設定の変更が存在していた。初回照合ではこれらを公開済み機能として扱わず、READMEを共通する「静的アセットのみキャッシュ、HTML / APIは対象外」の範囲で説明した。後続のPRではPWA変更も公開対象に含め、READMEへキャッシュ戦略を追記した。

### 4.1 コミット要否の判定と一時ファイル整理

| 対象 | 判定 | 根拠・処置 |
| --- | --- | --- |
| `public/sw.js` | コミット対象として保持 | アイコンのcache first化とversion付きURLのprecacheを実装する本体。生成物ではない |
| `next.config.ts` | コミット対象として保持 | アイコンに長期immutable HTTPキャッシュを設定する構成変更 |
| `src/app/manifest.ts` | コミット対象として保持 | manifestのアイコンURLを既存の共通 `iconv` 定数に合わせる実装変更 |
| `e2e/pwa.spec.ts` | コミット対象として保持 | manifest、Service Worker、HTTPヘッダーの変更に対応した回帰テスト |
| `src/components/pwa/serviceWorkerCache.test.ts` | コミット対象として保持 | 未追跡でも手書きの単体テスト。install時の保存、アイコンのネットワーク再検証なし、他アセットの再検証を検証する |
| `docs/pwa-service-worker-design.md` | コミット対象として保持 | 上記実装のキャッシュ戦略・更新手順・検証観点を記述する設計変更 |
| `.playwright-mcp/` | コミット不要・削除済み | Playwrightによるコンソールログ3件と画面スナップショットYAML10件。全13件、126325 bytes。実装・テストから使うソースやfixtureではない |
| `.gitignore` の `/.playwright-mcp/` | コミット対象 | 一時成果物が再度未追跡ファイルとして混入しないよう追加 |
| 今回のREADME・設計・確認文書の修正一式 | コミット対象 | 初回依頼の実装との整合修正、仕様の追記と確認結果の記録 |

PWAの実装3ファイル、設計1ファイル、テスト2ファイルは同じアイコンキャッシュ改善として一緒にコミットする。無関係な一時ファイルとして削除しない。

削除前に対象の絶対パスがworkspace直下の `.playwright-mcp` であること、全13件が通常の `.log` / `.yml` ファイルであり、サブディレクトリやreparse pointを含まないことを確認した。

判定の補助として次の既存単体テストを実行し、1ファイル・3テストすべて成功した。

```bash
npm run test -- src/components/pwa/serviceWorkerCache.test.ts
```

この整理時点の追加確認ではE2E、クロスブラウザー、実PWA端末、ビルドは未実施。目的はコミット対象と一時生成物の区別で、公開可否の最終検証ではない。その時点では対象6ファイルの内容変更、コミット・pushを行っていない。

## 5. 現行の制限として残す事項

- UIの対戦表・進行状態の永続保存、途中変更履歴のURL共有 / 公開APIは未対応。
- HTMLのオフラインキャッシュはなく、PWAの完全オフライン起動を保証しない。
- 管理ログの検索・フィルタ・日付範囲・CSV・利用量集計は未実装。
- API参加者IDの重複と空白のみのIDはschemaで拒否しない。呼び出し元で一意のIDを保証する。
- API利用ログは全リクエストを記録せず、ログ書き込みはbest effort。認証拒否や入力エラーなどで記録されない経路がある。
- 印刷localStorageの破損復旧UI、世代管理、複数対戦表の固定保存は未実装。
- 共有query versionは生成アルゴリズムの保存ではなく、将来のアルゴリズム変更をまたぐ完全再現は保証しない。

これらは実装を追加せず、対応済みと誤読されないよう文書で明記した。

## 6. 初回の検証結果と未実施範囲

実行した既存単体テスト:

```bash
npm run test -- src/features/matchmaking src/lib/server/crypto.test.ts
```

10ファイル・58テストがすべて成功。対象は条件構築、API schema、通常生成、途中再作成、共有復元、参加者表示、PDFモデル / 出力、キー生成 / パスワード照合。実FirestoreやHTTP経由のAPI動作を検証した結果ではない。

READMEと設計・確認文書の計11ファイルで相対リンク38件の参照先実在、Markdownコードフェンスの対、JSONサンプル22件の構文、APIレスポンス例6件の `meta.requestId` を確認し、エラーは0件。記載した数値・version・endpointを実装と照合し、`git diff --check` も成功した。

E2Eは未実施。今回の変更は文書のみで、ブラウザの挙動を変更していないため選定した。PC / スマホの描画、クリップボード権限、実PWA端末、複数タブの実操作、クロスブラウザー、実Firestore接続、本番デプロイの動作は今回未検証。ビルド / lintはアプリコードを変更していないため実施せず、進行中のPWA変更の検証とも分離した。

Firebase project / location、Vercel設定は既存記録として扱い、クラウド設定の現状は再確認していない。

## 7. PR対応の変更とマージ前検証

ユーザーのPR作成・マージ依頼により、判定したコミット対象をまとめて公開する。アプリversionは `1.3.0` を維持し、version更新・タグ・GitHub Releaseは今回の対象に含めない。

型チェックで `serviceWorkerCache.test.ts` のイベント名のunionに対するハンドラ代入がintersection型を要求されるエラーを検出した。登録関数をジェネリックにし、イベント名とハンドラ型の対応を保つよう修正した。アプリ本体のキャッシュ挙動は変更していない。

| 確認 | 結果 |
| --- | --- |
| `npm run test` | 11ファイル・61テスト成功 |
| 型修正後のPWA単体テスト | 3テスト成功 |
| `npm run lint` | 成功。最初の実行は実行時間制限で中断し、十分な時間を確保して再実行した |
| 型修正後の該当ファイルlint | 成功 |
| `npx tsc --noEmit` | 型修正後に成功 |
| `npm run build` | Next.js 16.2.4の本番ビルド成功 |
| PWA対象E2E | Chromium・1 workerで5ケース成功。既存サーバーを再利用せず、本番ビルドを専用ポート3107で起動して検証 |

E2Eはmanifest、Service Worker配信ヘッダー、アイコンのimmutable HTTPヘッダー、静的アセット保存とAPI非キャッシュ、アプリasset version変更時のアイコンURL安定性を選定した。アイコンキャッシュ・manifest・配信設定の変更を直接確認するための範囲であり、全E2E、Firefox / WebKit、実機PWA、管理操作や共有ダイアログ全体は未実施。

実行用の一時Playwright設定はgitignore対象の `test-results/` に配置し、実行後に削除した。PR状態・マージコミット・デプロイ状態はGitHubとリリース時の報告を参照する。
