# シングルス対戦表対応 要件・設計書

## 1. 目的

現行のダブルス対戦表作成機能に加えて、シングルスの対戦表を作成できるようにする。

シングルスでは 1 コートあたり 2 人で対戦するため、ダブルス固有のペア構成や対戦モードは使用しない。一方で、既存アプリの主要価値である休憩の公平性、連続休憩回避、顔合わせ偏り軽減、印刷、PDF、共有 URL、API での再現性は維持する。

## 2. 確定方針

| 項目 | 方針 |
| --- | --- |
| 試合形式 | `matchFormat: "doubles" | "singles"` を追加する |
| 既存互換 | `matchFormat` 未指定時は `doubles` として扱う |
| ダブルス | 現行どおり `playersPerCourt = 4`、`matchupMode` を利用する |
| シングルス | `playersPerCourt = 2`、`matchupMode` は組合せ生成に使わない |
| シングルスの gender | 組合せ生成、画面表示、PDF 表示には使わない |
| シングルス API の `matchupMode` / `gender` | 入力された場合も validation error にはせず、生成時は無視し、レスポンスには保持する |
| ルーティング | `/doubles` と `/singles` を正式ルートにする |
| `/` の扱い | 既存互換としてダブルス相当を表示する |
| 旧共有 URL | 旧 URL はダブルスとして復元する |
| PDF セル表記 | シングルスは `01 vs 02` の 1 行表示にする |
| ダブルス PDF | 最新ソースで反映済みの既存仕様を維持し、シングルス対応では不用意に変更しない |

## 3. 対象範囲

### 3.1 対象

- シングルス対戦表の条件入力
- シングルス対戦表の生成ロジック
- シングルス結果の画面表示
- シングルスの印刷プレビュー
- シングルスの PDF 出力
- シングルスの共有 URL 作成と復元
- シングルスの API generate / replay 対応
- `/doubles` / `/singles` の正式ルート追加
- `/` のダブルス互換表示
- 既存ダブルス機能の後方互換維持
- テスト追加と既存テストの更新

### 3.2 対象外

- シングルスでの性別優先モード
- シングルス画面、印刷、PDF での性別表示
- ダブルスの対戦モード仕様変更
- ダブルス PDF の追加調整
- 参加者名の個別編集機能
- API の新バージョンパス追加
- 途中再作成 API

## 4. 用語定義

| 用語 | 定義 |
| --- | --- |
| 試合形式 | ダブルスまたはシングルスの区分。データ上は `matchFormat` で表す |
| ダブルス | 1 コート 4 人、2 ペアで対戦する形式 |
| シングルス | 1 コート 2 人、1 対 1 で対戦する形式 |
| 対戦モード | ダブルス内の組み方優先条件。`standard` / `sameGenderPriority` / `mixedDoublesPriority` |
| 出場人数 | 1 ラウンドで実際にコートへ入る人数 |
| 休憩人数 | 1 ラウンドで出場しない人数 |

## 5. データモデル方針

### 5.1 型

`MatchConditionInput` / `MatchConditions` に `matchFormat` を追加する。

```ts
type MatchFormat = "doubles" | "singles";
```

`MatchConditions.playersPerCourt` は固定値 `4` ではなく、試合形式から決まる値にする。

```ts
type MatchConditions = {
  matchFormat: MatchFormat;
  matchupMode: MatchupMode;
  participants: Participant[];
  courtCount: number;
  roundCount: number;
  playersPerCourt: 2 | 4;
};
```

### 5.2 初期値と互換

- `matchFormat` 未指定の既存データ、旧共有 URL、既存 API request は `doubles` として扱う。
- `doubles` の `matchupMode` 未指定は現行どおり `standard` として扱う。
- `singles` の `matchupMode` は生成ロジックでは使わないが、入力値があれば `conditions.matchupMode` に保持する。
- `singles` の `participants[].gender` は生成ロジックでは使わないが、入力値があれば `conditions.participants[]` に保持する。

### 5.3 入力制約

| 項目 | doubles | singles |
| --- | ---: | ---: |
| 参加人数最小値 | 4 | 2 |
| 参加人数最大値 | 30 | 30 |
| コート数最小値 | 1 | 1 |
| コート数最大値 | 8 | 8 |
| ラウンド数最小値 | 1 | 1 |
| ラウンド数最大値 | 20 | 20 |

参加人数の最小値は試合形式で変わるため、schema の `superRefine` または試合形式別 schema で validation する。

## 6. ルーティング方針

正式ルートは以下とする。

| Path | 用途 |
| --- | --- |
| `/doubles` | ダブルス対戦表 |
| `/singles` | シングルス対戦表 |
| `/` | 既存互換のダブルス表示 |

`/` は初期実装ではリダイレクトせず、ダブルス相当の画面を表示する。既存ブックマーク、PWA `start_url: "/"`、旧共有 URL への影響を避けるためである。

共有 URL は正式ルートで生成する。

```txt
/doubles?shared=1&...
/singles?shared=1&...
```

旧共有 URL で `/` にアクセスされた場合は、従来どおりダブルスとして復元する。

## 7. UI 要件

### 7.1 トップナビ

- `対戦表(ダブルス)` は `/doubles` へ遷移する。
- `対戦表(シングルス)` は `/singles` へ遷移する。
- `/` 表示時はダブルスを active 扱いにする。
- 既存の `近日公開予定` バッジは、シングルス実装時に削除する。

### 7.2 条件フォーム

ダブルスでは現行フォームを維持する。

シングルスでは以下を表示する。

- 開催名
- 参加人数
- コート数
- ラウンド数

シングルスでは以下を表示しない、または disabled にする。

- 対戦モード
- 女性人数
- 男性人数
- 採番内訳の性別説明

シングルスの生成前サマリーは `playersPerCourt = 2` を使って計算する。

```txt
使用面数 = min(courtCount, floor(participantCount / 2))
1回あたりの出場人数 = 使用面数 * 2
1回あたりの休憩人数 = participantCount - 出場人数
```

### 7.3 結果表示

ダブルス結果は現行表示を維持する。

シングルス結果のコートカードは、ペアではなく 1 対 1 の対戦として表示する。

表示例:

```txt
Court 1
01 vs 02
```

シングルスでは participant に `gender` があっても、画面上の参加者表示に `F` / `M` を付けない。これはダブルスの通常モードに合わせるためである。

### 7.4 途中再作成

途中再作成は既存のダブルス仕様と同じ操作思想を維持する。

- 実施済みラウンドは固定する。
- 未実施ラウンドだけ再作成する。
- シングルスでは追加人数のみを扱う。
- シングルスでは追加女性、追加男性は表示しない。
- 退出者の番号指定は既存の参加者番号指定を再利用する。

## 8. 生成ロジック要件

### 8.1 共通優先順位

シングルス、ダブルスともに、以下の優先順位を基本とする。

1. 休憩回数の公平性
2. 連続休憩の回避
3. 顔合わせ回数の偏り軽減
4. コート使用回数の均等化

ダブルスでは上記に加えて、既存どおり対戦モード、同一ペア、同一対戦相手の偏りを評価する。

### 8.2 ダブルス

ダブルスは現行の生成ロジックを維持する。

- 1 コート 4 人
- 2 ペア
- `matchupMode` による性別構成優先
- 同一ペア偏りの軽減
- 同一対戦相手偏りの軽減

### 8.3 シングルス

シングルスは 1 コート 2 人のグループを作る。

- `playersPerCourt = 2`
- `matchupMode` は生成評価に使わない。
- `gender` は生成評価に使わない。
- 同一ペアという概念はないため、`sameTeammatePenalty` は 0 とする。
- 同一対戦相手の偏りは、同じ 2 人の対戦回数として評価する。
- コート番号の割当は、既存のコート使用回数均等化を流用する。

例:

```txt
参加者 5 人、コート 2 面
出場 4 人、休憩 1 人

Court 1: 01 vs 03
Court 2: 02 vs 05
Rest: 04
```

### 8.4 コート数調整

コート数が参加人数に対して過多な場合は、現行と同じく確認後に調整する。

```txt
使用可能面数 = floor(participantCount / playersPerCourt)
```

ダブルスは `participantCount / 4`、シングルスは `participantCount / 2` を使う。

## 9. 共有 URL・再現性

共有 URL には `matchFormat` を含める。

```txt
format=doubles
format=singles
```

新共有 URL の例:

```txt
/doubles?shared=1&v=...&format=doubles&participants=8&courts=2&rounds=4&seed=123
/singles?shared=1&v=...&format=singles&participants=8&courts=2&rounds=4&seed=123
```

互換方針:

- `format` がない共有 URL は `doubles` として復元する。
- 旧 version の共有 URL は `doubles` として復元する。
- `/singles` で `format=doubles` が渡された場合のように route と query が矛盾した共有 URL では、query の `format` を正として復元する。
- 通常表示では route を正とする。

これにより、共有 URL をコピーして別 route に貼り付けた場合でも、共有元の形式を再現できる。

## 10. API 要件

### 10.1 対象 API

既存の API path を維持する。

| API | Method | Path |
| --- | --- | --- |
| 通常生成 API | POST | `/api/v1/matchups/generate` |
| 再現 API | POST | `/api/v1/matchups/replay` |

### 10.2 Request

`matchFormat` を追加する。

```json
{
  "matchFormat": "singles",
  "matchupMode": "mixedDoublesPriority",
  "participantCount": 4,
  "participants": [
    { "id": "p1", "name": "01", "gender": "female" },
    { "id": "p2", "name": "02", "gender": "male" },
    { "id": "p3", "name": "03", "gender": "female" },
    { "id": "p4", "name": "04", "gender": "male" }
  ],
  "courtCount": 2,
  "roundCount": 3,
  "seed": 123
}
```

`singles` の場合、上記の `matchupMode` と `gender` は validation error にしない。ただし、組合せ生成では使わない。

### 10.3 Response

`conditions` に `matchFormat` と `playersPerCourt` を返す。

```json
{
  "conditions": {
    "matchFormat": "singles",
    "matchupMode": "mixedDoublesPriority",
    "participants": [
      { "id": "p1", "name": "01", "gender": "female", "index": 0 }
    ],
    "courtCount": 2,
    "roundCount": 3,
    "playersPerCourt": 2
  }
}
```

シングルスで `matchupMode` / `gender` が入力された場合は、レスポンスに保持する。これは API 呼び出し元が渡した participant metadata を失わないためである。

ただし、`score.genderPreferencePenalty` は `singles` では 0 とする。

### 10.4 Validation

| Case | 期待結果 |
| --- | --- |
| `matchFormat` 未指定 | `doubles` として扱う |
| `matchFormat = doubles` かつ参加人数 3 | `422` |
| `matchFormat = singles` かつ参加人数 2 | 成功 |
| `matchFormat = singles` かつ参加人数 1 | `422` |
| `matchFormat = singles` かつ `matchupMode` 指定 | 成功。生成時は無視しレスポンス保持 |
| `matchFormat = singles` かつ `participants[].gender` 指定 | 成功。生成時は無視しレスポンス保持 |
| `matchFormat = doubles` かつ性別優先モードで gender 不足 | 現行どおり `422` |

## 11. 印刷・PDF 要件

### 11.1 印刷

印刷プレビューは既存 `/print` の仕組みを維持し、渡された `MatchupResult.conditions.matchFormat` に応じて表示を切り替える。

- ダブルスは現行表示を維持する。
- シングルスはコートごとに `01 vs 02` を表示する。
- シングルスでは gender があっても `F` / `M` は表示しない。

### 11.2 PDF

PDF は既存の `jsPDF + jspdf-autotable` の出力経路を維持する。

シングルスのコートセルは 1 行で表示する。

```txt
01 vs 02
```

余白と行間:

- シングルスの `vs` は 1 行内に含める。
- セル内の上下余白は、既存ダブルスセルの上下余白と同程度にする。
- 1 行表示によってセル高が過度に縮みすぎないよう、既存テーブルの見やすさを維持する。

ファイル名には試合形式を含める。

```txt
開催名_人数_面数_ダブルス_通常-matchup.pdf
開催名_人数_面数_シングルス-matchup.pdf
```

ダブルスのモードラベルは既存の `通常` / `同性` / `混合` を維持する。

## 12. 実装影響範囲

| 領域 | 主な影響 |
| --- | --- |
| 型 | `MatchFormat`、`playersPerCourt: 2 | 4`、シングルス向け court 表現 |
| schema | 試合形式別の参加人数最小値、singles 時の matchupMode / gender 取扱い |
| 生成 | 2 人グループ生成、シングルス用スコア、休憩数計算 |
| 画面 | `/doubles` / `/singles`、フォーム項目切替、結果カード表示切替 |
| 途中再作成 | `playersPerCourt` に応じた最低人数、追加人数 UI |
| 共有 URL | `format` 追加、version 更新、旧 URL 互換 |
| API | request / response に `matchFormat` 追加、validation 更新 |
| PDF | シングルスセル 1 行表示、ファイル名ラベル |
| docs | API 設計書、README、テスト観点の更新 |

## 13. テスト設計

### 13.1 テスト観点

機能観点:

- `doubles` 未指定互換で既存ダブルス結果が変わらないこと。
- `/doubles` でダブルス条件入力、生成、共有、PDF 出力ができること。
- `/singles` でシングルス条件入力、生成、共有、PDF 出力ができること。
- シングルスで `matchupMode` / `gender` が生成結果に影響しないこと。
- シングルス API で `matchupMode` / `gender` がレスポンスに保持されること。
- replay API が同一 seed で同じ結果を返すこと。

非機能観点:

- 候補 seed 探索の実行時間が既存ダブルスから大きく悪化しないこと。
- PDF 出力が多面、多ラウンドでも崩れないこと。
- `/` 互換表示により既存 PWA 起動と既存ブックマークが壊れないこと。
- Service Worker が HTML / API レスポンスをキャッシュしない既存方針を維持すること。
- API キーや参加者名の不要なログ出力が増えないこと。

データ観点:

- `matchFormat` なし。
- `matchFormat = doubles`。
- `matchFormat = singles`。
- 不正な `matchFormat`。
- シングルス最小人数 2。
- ダブルス最小人数 4。
- 参加者数と `participants.length` の不一致。
- シングルスで `gender` あり / なし。
- シングルスで `matchupMode` あり / なし。
- コート数が参加人数に対して過多。

UI 観点:

- `/` ではダブルスタブが active になること。
- `/doubles` では対戦モード、女性人数、男性人数が表示されること。
- `/singles` では対戦モード、女性人数、男性人数が不要表示にならないこと。
- `/singles` の生成前サマリーが 1 コート 2 人で計算されること。
- シングルス結果カードが `01 vs 02` として表示されること。
- シングルス画面、印刷、PDF で `F` / `M` が表示されないこと。
- スマホナビで `/doubles` / `/singles` を切り替えられること。

### 13.2 正常系

| Case | 対象 | Intent |
| --- | --- | --- |
| N-001 | doubles | `matchFormat` 未指定で既存ダブルスとして生成できること |
| N-002 | doubles | `/doubles` で通常モードの生成結果が現行仕様と一致すること |
| N-003 | doubles | 性別優先モードが現行どおり gender を使って生成されること |
| N-004 | singles | 2 人、1 面、1 回で 1 試合を生成できること |
| N-005 | singles | 3 人、1 面、複数回で休憩者がローテーションすること |
| N-006 | singles | 4 人、2 面で休憩なしの 2 試合を生成できること |
| N-007 | singles | 5 人、2 面で出場 4 人、休憩 1 人になること |
| N-008 | singles API | `matchupMode` / `gender` を受け取り、生成には使わずレスポンス保持すること |
| N-009 | share | `/singles` 共有 URL を復元して同じ結果を表示できること |
| N-010 | PDF | シングルス PDF セルが `01 vs 02` の 1 行表示になること |

### 13.3 異常系

| Case | 対象 | Intent |
| --- | --- | --- |
| E-001 | schema | 不正な `matchFormat` を拒否すること |
| E-002 | doubles | ダブルス 3 人を拒否すること |
| E-003 | singles | シングルス 1 人を拒否すること |
| E-004 | API | `participants.length` と `participantCount` の不一致を拒否すること |
| E-005 | doubles API | 性別優先モードの gender 不足を現行どおり拒否すること |
| E-006 | share | 不正な `format` の共有 URL を復元エラーにすること |
| E-007 | replay API | seed 不足を拒否すること |

### 13.4 境界値

| Case | 対象 | Intent |
| --- | --- | --- |
| B-001 | singles | 参加人数 2、コート 1、ラウンド 1 |
| B-002 | singles | 参加人数 3、コート 1、ラウンド 20 |
| B-003 | singles | 参加人数 30、コート 8 |
| B-004 | doubles | 参加人数 4、コート 1 |
| B-005 | doubles | 参加人数 30、コート 8 |
| B-006 | court adjustment | singles 3 人、コート 2 で 1 面への調整提案 |
| B-007 | court adjustment | doubles 7 人、コート 2 で 1 面への調整提案 |

### 13.5 状態遷移

| Case | 対象 | Intent |
| --- | --- | --- |
| S-001 | route | `/` から表示してダブルス active になること |
| S-002 | route | `/doubles` から `/singles` へ遷移してシングルス条件に切り替わること |
| S-003 | route | `/singles` から `/doubles` へ戻ってダブルス条件に切り替わること |
| S-004 | share | 旧 `/` 共有 URL をダブルスとして復元できること |
| S-005 | share | `/singles` 共有 URL 復元後、再作成してもシングルス条件を維持すること |
| S-006 | continuation | シングルス結果で実施済みラウンドを固定し、未実施ラウンドだけ再作成できること |
| S-007 | output | シングルス結果を生成後、印刷プレビューと PDF 出力が同じ対戦内容を表示すること |

## 14. 実装ステップ案

1. `MatchFormat` と `playersPerCourt` の型・schema・条件構築を追加する。
2. `doubles` 未指定互換を維持したまま既存テストを通す。
3. 生成ロジックを `playersPerCourt` で分岐し、シングルス最小生成を追加する。
4. シングルス用のスコアと統計更新を追加する。
5. `/doubles` / `/singles` / `/` 互換表示を追加する。
6. 条件フォームと結果カードを試合形式別に切り替える。
7. 共有 URL に `format` を追加し、旧 URL 互換を維持する。
8. API schema と API docs を更新する。
9. 印刷と PDF のシングルス表示を追加する。
10. 途中再作成のシングルス対応を追加する。
11. 単体、schema、共有、PDF、E2E テストを追加する。
12. `npm test`、`npm run lint`、`npm run build` で検証する。
