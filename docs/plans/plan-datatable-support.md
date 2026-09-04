# TypeScript 端支援 DataTable

**狀態：📝 擬定中（2026-09-04）** —— 尚未動工。

## 為什麼要做

`DataTable` 是 Bee.NET 跨層 DTO 的核心：**ERP 表單的資料就是 DataTable**
（master row + detail rows），`GetData` / `GetList` / `Save` 全部以它承載。
TypeScript 端目前**完全不支援**，因此無法拿來做表單畫面 —— 這是本套件能不能用於
ERP 前端的分界線，不是可有可無的補完。

現況只有一行：

```ts
// src/codec/wire-value.ts:215
case WireValueCode.DataTable:
  throw new Error('DataTable inside an object-typed member is not supported yet.');
```

## 這個缺口是怎麼浮現的

`test/wire-fixtures.test.ts:47` 的註解當初寫著「DataTable inside an object member
**has no sample** and is not supported yet」——TS 端一直知道自己沒實作，只是**沒有樣本可測**。

2026-09-04 框架端（`jeff377/bee-library`）在一次補閘門的工作中新增了
`wire-fixtures/bodies/value-datatable.json`，`it.each` 就把它撈進來，缺口隨即成為紅燈。

**那正是 fixtures 的用途**：它讓「TS 讀不讀得懂 .NET 寫出來的東西」這個問題有答案，
而不是等到接真表單才發現。

## 範圍

兩種 wire 形狀都要支援，**它們不一樣**：

| 形狀 | 樣本 | 差別 |
|------|------|------|
| 頂層 body | `datatable.json` | 型別已知，**儲存格不帶 discriminator** |
| `object` 成員內 | `value-datatable.json` | 帶封套 `[21, {…}]`（`WireValueCode.DataTable`） |

> ⚠️ 頂層那個目前**完全沒有測試涵蓋** —— `wire-fixtures.test.ts` 的迴圈只吃
> `value-*` 開頭的樣本。實作時要一併把它納入，否則做完仍有一半沒驗到。

## Wire 形狀（取自 fixtures，非憑記憶）

```jsonc
{
  "tableName": "Employee",
  "columns": [
    { "name": "sys_id", "type": "String",  "allowNull": false, "readOnly": false,
      "maxLength": -1, "caption": "sys_id", "defaultValue": null }
  ],
  "primaryKeys": ["sys_id"],
  "rows": [
    { "state": "Unchanged", "current": { "sys_id": "E001", "amount": "79228162514264337593543950335" } },
    { "state": "Modified",  "current": { … }, "original": { … } },
    { "state": "Added",     "current": { … } }
  ]
}
```

## 必須先讀懂的兩條規則

### 1. 儲存格沒有 discriminator，型別來自欄位中繼資料

一格的型別由**同一份文件裡** `columns[].type` 決定。不能用 `typeof` 猜。

### 2. `Decimal` / `Int64` / `UInt64` 以 **JSON 字串**攜帶

這不是實作細節，是這條 wire 的契約。理由：JSON number 對任何 JavaScript 讀取端都是
double，**既放不下 decimal 的精度、也放不下超過 2^53 的整數，而 `JSON.parse` 在你的
程式碼跑到之前就已經丟失了**。樣本刻意用了極值：

- `"79228162514264337593543950335"`（decimal.MaxValue）
- `"0.0000000000000000000000000001"`
- `"9007199254740993"`（2^53 + 1 —— 用 number 讀會變成 2^53）
- `"9223372036854775807"`（long.MaxValue）

**驗收條件之一：上述四個值 round-trip 後逐字相同。** 用 `Number()` 轉會當場失敗，
那是刻意的。

> 權威實作在框架端的 `src/Bee.Base/Serialization/DataTableJsonConverter.cs`
> 與 `DataTableJsonConverter.Read.cs`（讀取端仍接受裸數字以相容舊 payload）。
> 有疑問以那份為準，不要從樣本反推規則。

## 待決的設計問題（動工前要先定案）

1. **DataTable 在 TS 長什麼樣？** 純 `interface` + 陣列，或帶方法的 class？
   前端要能改值再送回（`Save`），所以至少要能表達 row state 與 original/current 兩版。
2. **`DBNull` 與 `null` 怎麼區分？** 本套件已有 `DB_NULL` sentinel（見 `wire-value.ts`），
   儲存格要不要沿用同一個？
3. **decimal / int64 用什麼型別承載？** 保留 `string` 最安全（不失真），但前端要算數就痛苦；
   `BigInt` 只解決整數那半。**這個決定會外顯成本套件的公開 API，選錯要破壞性變更才能改。**
4. **`DataSet` 要不要一起做？** master-detail 表單實際傳的是 DataSet
   （框架端 `DataSetJsonConverter` 與 DataTable 成對）。分兩批做的話，第一批要留好接縫。

## 完成的定義

- [ ] `decodeWireValue` 對 `WireValueCode.DataTable` 不再 throw
- [ ] 頂層 `datatable` 樣本納入測試迴圈（目前零涵蓋）
- [ ] 兩種形狀皆 round-trip 通過，四個極值逐字相同
- [ ] `npm run test:wire` 全綠（目前 1 failed / 28）
- [ ] 若 `DataSet` 未一起做，於 README 明記「支援 DataTable、尚不支援 DataSet」

## 在那之前

CI 不留永久紅燈 —— 永久紅燈會訓練人忽略它。`wire-fixtures.test.ts` 改為**明確斷言
目前不支援**（釘住 `decodeWireValue` 擲出的錯誤），等本 plan 落地時那條測試會主動失敗、
逼實作者更新它。那不是把問題藏起來，是讓「還沒做」這件事本身有人看守。
