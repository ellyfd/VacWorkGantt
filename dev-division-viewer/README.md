# 開發處休假表（免登入靜態檢視頁）

一個**獨立、免登入、不經過 Base44**的休假月曆檢視頁。長得像主系統的排休表，
但資料來自一份可公開取得的 JSON 檔，開發處不需要註冊或登入即可開啟。

## 檔案

- `index.html`：檢視頁（自帶樣式與程式，零外部相依）。
- `data.json`：資料檔（休假內容放這裡）。

## 怎麼上線（GitHub Pages 或 Cloudflare Pages 皆可）

### 方式 A：GitHub Pages
1. 把 `dev-division-viewer/` 這個資料夾放進一個 repo。
2. Settings → Pages → 選該分支與資料夾，啟用 Pages。
3. 開發處用網址開啟：`https://<帳號>.github.io/<repo>/dev-division-viewer/`
   （把這條網址存成書籤，點開即看，免登入。）

### 方式 B：Cloudflare Pages
1. 連結 repo，建立 Pages 專案。
2. Build 指令留空、輸出目錄設為這個資料夾（純靜態，不需 build）。
3. 用 Cloudflare 給的網址開啟。

> 資料檔也可以掛在別處（例如 Cloudflare R2、GitHub raw、任何公開網址），
> 開啟時用 `?data=` 指定：
> `…/index.html?data=https://example.com/dev-division-leave.json`

## 資料格式（`data.json`）

```jsonc
{
  "title": "開發處休假表",
  "year": 2026,
  "month": 12,              // 1–12
  "updated_at": "2026-06-10",
  "legend": {               // 假別 → 顏色（可自訂）
    "休": "#22c55e", "差": "#ec4899", "午休": "#a855f7",
    "病": "#f97316", "員旅": "#9ca3af", "早休": "#3b82f6"
  },
  "holidays": ["2026-12-25"],          // 國定假日（會以紅底標示）
  "departments": [
    {
      "name": "3D team（DPC）",
      "members": [
        {
          "name": "程麗如",
          "code": "Karen",            // 職代/英文名（可留空）
          "leaves": { "2026-12-12": "午休" }   // 日期 → 假別文字
        }
      ]
    }
  ]
}
```

- `leaves` 的「假別文字」會去 `legend` 找顏色；找不到就用內建預設色。
- 想換月份，改 `year` / `month` 即可；想多月，先各做一份 JSON、用 `?data=` 切換。

## 維護方式

- **開發處自己維護**：直接編輯 `data.json`（或之後改成讀他們的 Google Sheet 匯出檔）。
- **DPC 那段自動帶入**：之後可加一支排程，把 Base44 裡 DPC 的休假匯出成這個 JSON 的
  「3D team（DPC）」區塊，定時覆蓋上傳，達到自動同步（此步驟尚未實作）。

## 目前範圍與限制

- **唯讀**：此頁只呈現，不能在頁面上請假/修改（要改去改 `data.json`）。
- 任何拿到網址的人都看得到內容，請只在內部流通。
- 與 Base44 完全脫鉤：不需登入、不需帳號。
