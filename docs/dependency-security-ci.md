# 依存脆弱性対応・CI設計

確認日: 2026-10-06。`tennis-organizing-app`の公開済み監査ポリシーを基に、Firebase Admin SDKを使用するこのアプリに適用する。

## 1. 更新方針

- Next.jsとeslint-config-nextを16.2.4から16.3.8へ揃える。
- 宣言範囲内の直接・間接依存を更新し、lockfileを保存する。
- Firebase Admin SDKは13系の最新でも本番依存の指摘が残るため、14.5.0へ更新する。使用中のモジュール別import、Firestore、FieldValue、Timestampを維持する。
- ローカル・CI・VercelをNode.js 24.xへ揃える。Admin SDK 14の要件はNode.js 22以上。
- Storageのgaxios 6はuuid 9を参照する。`gaxios@6`配下のuuidだけを、修正済みかつCommonJS対応の11.1.1へoverrideする。gaxiosの使用箇所は引数なしのv4によるmultipart boundary生成で、実際のStorage依存を解決したローカルHTTPテストで互換性を確認する。
- `npm audit fix --force`でESLint設定を14系へダウングレードしない。アプリのバージョンは1.3.0を維持する。

参照: [Next.js 16.3.8](https://github.com/vercel/next.js/releases/tag/v16.3.8)、[Firebase Admin SDK変更点](https://firebase.google.com/support/release-notes/admin/node)、[uuid 11.1.1修正](https://github.com/uuidjs/uuid/blob/v11.1.1/CHANGELOG.md)、[Vercel Node.js指定](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)。

## 2. 監査ポリシー

`npm run audit:security`で`npm audit --json`と`npm audit --omit=dev --json`を取得し、両方を評価する。

- 本番依存に指摘があれば、重大度によらず失敗する。
- 全依存の指摘も、下記の明示的な例外以外は失敗する。
- 通信エラー、タイムアウト、監査エラー、不正JSON、集計不整合は失敗する。
- 完全な監査結果を`.security-audit/full.json`と`production.json`へ保存する。このディレクトリはGit管理対象外。
- 監査件数は脆弱と判定されたパッケージ数であり、親依存への波及を含む。個別脆弱性の個数や実行時の到達可能性と同一ではない。

## 3. 唯一の期限付き例外

対象は[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)。braces 3.0.3の深いbraceパターンによるスタック枯渇で、確認時点の公開修正版はない。

ESLintのglob処理に限定し、本番依存の例外は作らない。対象パッケージ、版、トップレベル依存経路は`security-audit-exception.json`に固定する。

| パッケージ | 版 |
| --- | --- |
| braces | 3.0.3 |
| micromatch | 4.0.8 |
| fast-glob | 3.3.1 |
| @next/eslint-plugin-next | 16.3.8 |
| eslint-config-next | 16.3.8 |

担当: Bamboosato/tennis-matchup-app maintainers。期限: **2026-11-05T00:00:00Z**（日本時間11月5日09:00）。同じ原因が親へ波及した5項目であり、独立した5個の脆弱性という意味ではない。

例外の条件は、advisory URLが一致し、すべての原因を辿って同じ例外に到達し、記録した版・経路で開発依存に限定され、criticalでなく、期限前であること。別のadvisoryの追加、版変更、新しいnested経路、本番依存化、期限切れでは失敗する。エラーを一括無視する処理は置かない。

上流の修正版が公開されたら、依存更新・再監査・検証を行い、不要になった例外を削除する。期限延長は再評価とレビューを伴う変更として扱う。

## 4. CIの実行範囲

main向けPRとmainへのpushでUbuntu / Node.js 24を使用する。定期実行は設定しない。

1. `npm ci`
2. lint、型チェック、既存単体テスト
3. 監査ポリシーの正常系・異常系・境界値・状態遷移テスト
4. 本番依存・全依存の監査
5. overrideしたuuid v4を使ったmultipart通信の互換性テスト（loopback HTTP、外部通信なし）
6. Java 21とFirestoreエミュレーターでAdmin SDKの作成・読み取り・更新・クエリー・transaction・server timestamp・snapshot・削除を確認
7. 本番ビルドとChromium E2E（1 worker、既存サーバー再利用なし）
8. 成否によらず監査JSONをartifact保存、E2E失敗時はtest-resultsも保存

Firestore確認は`demo-tennis-matchup-security`と127.0.0.1のエミュレーターだけを使い、実プロジェクトやサービスアカウント認証情報を使用しない。FirebaseクライアントのAuthはこのアプリで使用していないため、参照プロジェクトのAuthエミュレーター確認は導入しない。

CIの失敗がマージを禁止するかはGitHubのブランチ保護設定に依存する。この変更はワークフローと監査ポリシーを追加するもので、ブランチ保護設定は変更しない。

## 5. 検証観点

| 観点 | 検証意図 |
| --- | --- |
| 機能 | 対戦作成・再作成・途中変更・共有・PDF・印刷・管理画面の既存挙動を保つ |
| データ | 条件境界値・API入力・共有復元、Firestoreのtransaction・timestamp・購読解除を保つ |
| UI | Chromiumで主要操作、モバイルナビゲーション、PWA・キャッシュを確認する |
| 非機能 | クリーンインストールで再現し、Linux CIとWindowsローカルでbuild・SDK・native依存が成立する |
| 異常系・境界値 | 監査通信失敗・不正結果・新しい指摘・期限の直前/一致・例外依存の本番化/版変更を成功扱いにしない |

依存更新の影響範囲が広いため、既存Chromium E2E全件を選定する。クロスブラウザー、実PWA端末、実サービスアカウントでの管理CRUD・APIキー操作は自動検証範囲に含めない。エミュレーターはGoogle IAM/TLSや本番認証を検証しない。

## 6. ローカル検証記録

Windows、Node.js 24.13.0、npm 11.6.2で検証した。

| 検証 | 結果 |
| --- | --- |
| `npm ci` | 成功。lockfileから再現 |
| 全依存監査 | 更新前36項目（critical 2 / high 20 / moderate 12 / low 2）→ 更新後high 5項目。上記の開発依存例外のみ |
| 本番依存監査 | 更新前24項目 → 更新後0項目 |
| `npm run audit:security` | 本番0・明示的な開発例外のみで成功 |
| 監査ポリシー | 16ケース成功 |
| gaxios / uuid互換性 | multipart HTTPの1ケース成功 |
| 既存単体テスト | 11ファイル・61ケース成功 |
| 型チェック・本番ビルド | 成功。Next.js 16.3.8 |
| lint | エラー0。既存のAdminDashboard内の`window.location.assign`に新しいNext.jsルールの警告1件。今回この画面の遷移処理は変更しない |
| Chromium E2E | 本番ビルドに対して既存30ケース成功、1 worker |
| Firestoreエミュレーター | Admin SDK操作の確認成功 |

Windowsの初回エミュレーター起動では、Javaの`UnixDomainSockets.connect0`が`Invalid argument`となり、SDK確認前に失敗した。SelectorProvider変更だけでは解消せず、検証プロセスの`JAVA_TOOL_OPTIONS`に`-Djdk.net.unixdomain.tmpdir=<存在しないローカルディレクトリ>`を指定してTCPへフォールバックさせると成功した。OSの設定やCIのLinux設定は変更していない。ログはGit管理対象外の`firestore-debug.log`に保存する。

初回のLinux CIでは、WASM向けの任意依存`@emnapi/core`と`@emnapi/runtime`のlockfile不足を`npm ci`が検出した。Windowsのnpm 11.6.2で成功したインストールだけでは検出できなかったため、CIのnpm 11.19.0と同じ解決でlockfileを補完した。アプリで利用する既存パッケージの版は変えず、任意依存とlockfileのメタデータを修正する。

CIのLinux環境での結果はPRのVerifyチェックを参照する。監査データは時間とともに変わるため、上の件数は確認日の記録であり、継続的な安全性の保証ではない。
