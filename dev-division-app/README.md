# 開發處休假系統（Cloudflare 版）

把資料從「靜態 JSON」升級成真正的資料庫（Cloudflare **D1**），由 **Worker** 提供 API。

- 全部排休（讀）：沿用 `dev-division-viewer/index.html`，以 `?data=` 指向 `/api/calendar`。
- **我的排休（各人請假/改假）**：`me.html`（裝置綁定登入，無密碼）。

## 一次性部署步驟

需要先安裝 Node。以下指令在這個資料夾 `dev-division-app/` 裡執行。

```bash
# 1) 登入 Cloudflare
npx wrangler login

# 2) 建立 D1 資料庫（會印出一段 database_id）
npx wrangler d1 create dev_division
#   把印出來的 database_id 貼進 wrangler.toml 的 database_id 欄位

# 3) 建立資料表
npx wrangler d1 execute dev_division --remote --file=schema.sql

# 4)（選用）灌入範例資料，方便先看到畫面
npx wrangler d1 execute dev_division --remote --file=seed.sql

# 5) 部署 Worker（會得到一個 https://dev-division-api.<你的子網域>.workers.dev 網址）
npx wrangler deploy
```

部署成功後，測試一下：
- `https://dev-division-api.<你的子網域>.workers.dev/api/health` → 應回 `{"ok":true}`
- `https://dev-division-api.<你的子網域>.workers.dev/api/calendar` → 回月曆 JSON

## 把網頁接上這支 API

現成的檢視頁支援用網址參數指定資料來源，所以**不用改程式**，直接這樣開：

```
.../index.html?data=https://dev-division-api.<你的子網域>.workers.dev/api/calendar
```

（之後階段會把網頁正式改成預設讀 API、加上管理介面，就不必帶參數。）

## 我的排休（me.html）

各人自己請假/改假的頁面，用「裝置綁定」識別身分（無密碼）：
第一次開 → 選自己的名字 → 之後這台裝置免再選。

開啟方式（把 `me.html` 也放到 Pages，並指定 Worker 網址）：
```
.../me.html?api=https://dev-division-api.<你的子網域>.workers.dev
```
或直接編輯 `me.html` 最上面的 `API_BASE` 常數，填入你的 Worker 網址。

> ⚠️ 無密碼：任何拿到連結的人都能選任一名字綁成該員工。屬內部低風險用途；
> 若日後要更嚴，可在 Cloudflare 端加 Access（門口一次性 PIN）。

## 結構說明

- `schema.sql`：資料表（部門/人員/假別/休假/國定假日），欄位對齊 Base44。
- `seed.sql`：範例資料（正式上線可清掉自行新增）。
- `worker/index.js`：API；目前提供 `/api/calendar`、`/api/health`。
- `wrangler.toml`：Cloudflare 設定（記得填 `database_id`）。

## 下一階段預告

2. 裝置（cookie）綁定 +（選用）門口共用密碼 → **我的排休**（各人請假/改假）。
3. **全部排休 + 儀表板**。
4. **人員管理（含部門）+ 休假設定**（新增/修改/刪除）。
5. DPC 從 Base44 自動同步進這個 D1。
