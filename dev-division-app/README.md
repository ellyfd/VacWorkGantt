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

# 5) 部署 Worker（會得到一個 https://workforcemanagement.<你的子網域>.workers.dev 網址）
npx wrangler deploy
```

部署成功後，測試一下（目前實際網址為 `https://workforcemanagement.ellyfd.workers.dev`）：
- `https://workforcemanagement.ellyfd.workers.dev/api/health` → 應回 `{"ok":true}`
- `https://workforcemanagement.ellyfd.workers.dev/api/calendar` → 回月曆 JSON

## 把網頁接上這支 API

現成的檢視頁支援用網址參數指定資料來源，所以**不用改程式**，直接這樣開：

```
.../index.html?data=https://workforcemanagement.ellyfd.workers.dev/api/calendar
```

（之後階段會把網頁正式改成預設讀 API、加上管理介面，就不必帶參數。）

## 我的排休（me.html）

各人自己請假/改假的頁面，用「裝置綁定」識別身分（無密碼）：
第一次開 → 選自己的名字 → 之後這台裝置免再選。

開啟方式（把 `me.html` 也放到 Pages，並指定 Worker 網址）：
```
.../me.html?api=https://workforcemanagement.ellyfd.workers.dev
```
或直接編輯 `me.html` 最上面的 `API_BASE` 常數，填入你的 Worker 網址。

> ⚠️ 無密碼：任何拿到連結的人都能選任一名字綁成該員工。屬內部低風險用途；
> 若日後要更嚴，可在 Cloudflare 端加 Access（門口一次性 PIN）。

## 與 Base44 同步（DPC → D1）

單向同步：**Base44 為 DPC 的真相來源**，把 DPC 部門的人員/休假/假別/國定假日灌進 D1。
只動 DPC 部門，其它部門不碰；員工的 `device_token`（裝置綁定）會保留不被覆蓋。
⚠️ DPC 同仁在 `me.html` 上的編輯，會在下次同步時被 Base44 蓋掉。

兩種觸發：
- **定時**：Cloudflare Cron Trigger（`wrangler.toml` 的 `[triggers]`，預設每 30 分鐘）自動執行。
- **手動**：`sync.html`（輸入通關密語按一下），或直接 `POST /api/sync`（帶 `X-Sync-Secret`）。

一次性設定兩個機密（不要寫進程式或 `wrangler.toml`）：
```bash
# Base44 的 API key（Worker 讀取 DPC 資料用）
npx wrangler secret put BASE44_API_KEY
# 手動同步 /api/sync 與 sync.html 的通關密語（自己取一組難猜的字串）
npx wrangler secret put SYNC_SECRET
npx wrangler deploy
```
驗證：
```
.../sync.html               # 開頁、輸入 SYNC_SECRET、按「立即同步」
curl -X POST https://workforcemanagement.ellyfd.workers.dev/api/sync \
  -H "X-Sync-Secret: <你的 SYNC_SECRET>"
```

## 結構說明

- `schema.sql`：資料表（部門/人員/假別/休假/國定假日），欄位對齊 Base44。
- `seed.sql`：範例資料（正式上線可清掉自行新增）。
- `worker/index.js`：API；提供 `/api/calendar`、`/api/health`、`/api/sync`（+ Cron 定時同步）等。
- `wrangler.toml`：Cloudflare 設定（記得填 `database_id`、`[triggers]` cron、`[vars]`）。
- `sync.html`：手動「Sync with dev」管理頁。

## 下一階段預告

2. 裝置（cookie）綁定 +（選用）門口共用密碼 → **我的排休**（各人請假/改假）。
3. **全部排休 + 儀表板**。
4. **人員管理（含部門）+ 休假設定**（新增/修改/刪除）。
