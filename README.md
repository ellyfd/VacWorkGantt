# VacWorkGantt 排休與專案甘特圖

整合員工排休與專案甘特圖的內部管理系統。提供請假管理、班表檢視、專案排程、人員管理與報表匯出等功能。

## 主要功能

- **儀表板 (Dashboard)**：總覽當日請假、進行中專案與重要通知。
- **我的排休 (LeaveCalendar)**：個人請假申請與假別管理。
- **全部排休 (AllLeaveCalendar)**：跨部門檢視所有員工的休假狀況。
- **專案甘特圖 (GanttManagement)**：以甘特圖管理專案任務與時程。
- **人員管理 (PeopleManagement)**：員工、部門、職稱與綁定設定。
- **休假設定 (LeaveSettings)**：假別、額度與年資規則設定。
- **專案設定 (ProjectSettings)**：專案分類、標籤與權限設定。
- **報表管理 (ReportManagement)**：請假與專案統計匯出（PDF / 圖片）。
- **通知中心 (Notifications)**：請假審核與專案異動通知。
- **資料匯入 (DataImport)**：批次匯入既有員工與請假紀錄。

## 技術棧

- **框架**：React 18 + Vite 6
- **路由**：react-router-dom 6
- **狀態 / 資料**：@tanstack/react-query
- **UI**：Tailwind CSS + Radix UI + shadcn/ui 元件
- **表單**：react-hook-form + zod
- **後端 SDK**：[@base44/sdk](https://www.npmjs.com/package/@base44/sdk)
- **圖表 / 視覺化**：recharts、framer-motion、three.js
- **匯出**：jspdf、html2canvas
- **其他**：date-fns、moment、lodash、@hello-pangea/dnd、react-leaflet

## 快速開始

需求：Node.js 18+。

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器
npm run dev

# 建置正式版
npm run build

# 預覽建置結果
npm run preview

# Lint / 型別檢查
npm run lint
npm run lint:fix
npm run typecheck
```

## 專案結構

```
src/
├── api/              # base44 client 與 entities
├── assets/           # 靜態資源
├── components/       # 共用元件
│   ├── calendar/     # 排休行事曆元件
│   ├── dashboard/    # 儀表板元件
│   ├── gantt/        # 甘特圖元件
│   ├── ui/           # shadcn/ui 基礎元件
│   ├── hooks/        # 元件層 hooks
│   └── utils/        # 元件層工具函式
├── hooks/            # 全域 hooks
├── lib/              # 函式庫設定（app-params 等）
├── pages/            # 頁面 (Dashboard, GanttManagement, ...)
├── utils/            # 工具函式
├── App.jsx           # 路由與 Provider 設定
├── Layout.jsx        # 主要版面與導航
├── main.jsx          # 進入點
└── pages.config.js   # 頁面註冊
```

## 部署

此專案使用 [Base44](https://base44.com) 作為後端服務，前端為標準 Vite 靜態網站，建置產物位於 `dist/`，可部署至任意靜態主機（Vercel、Netlify、Cloudflare Pages 等）。
