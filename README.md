# VacWorkGantt｜把休假與專案時程，放在同一張表上

> **一個畫面，看清楚誰請假、什麼時候請、會不會卡到專案。**
>
> VacWorkGantt 把「個人排休」、「團隊出勤」與「專案甘特圖」整合在同一套系統，
> 讓排假不再憑感覺、讓專案排程不再撞到團隊休假。

---

## 為什麼選 VacWorkGantt？

過去你要在 Excel、LINE 群組、行事曆、PM 工具之間來回切換，才能回答兩個簡單的問題：

- **「我這個月還有幾天可以休？」**
- **「這個任務排下去，當天有幾個人在？來得及交嗎？」**

VacWorkGantt 把這些散落的資訊收進一個介面：

- 個人排假、半日假、區段請假一鍵完成，當月／年度小計即時呈現。
- 全公司、跨部門的休假一張表攤開，主管一眼掌握當日人力。
- 專案甘特圖直接疊上每日請假人數與名單，**排任務前就能看到誰不在**。

---

## 三大核心畫面

### 1. 個人排休｜「這個月我請了幾天？還能怎麼安排？」

**頁面：`LeaveCalendar`（我的排休）**

聚焦「我自己」的休假體驗：

- 直接點選日期就能請假，支援 **全日 / 上午休 / 下午休 / 健檢** 等假別。
- **區段請假**：選起訖日，跨週末、跨假日自動扣除非工作日。
- **職務代理人**：個人資料側欄可設定第一、第二代理人，請假時自動通知。
- **當月小計、年度累計**：每個假別休了幾天、總共幾天，側邊面板秒看。
- **衝突提醒**：與代理人同日請假、或同部門人力低於下限時即時跳出警示。
- **樂觀更新**：點下去畫面立刻反映，後端寫入失敗會自動回滾。

> 💡 結合假別顏色與 AM/PM 標記，一眼就能分辨自己當天是上午、下午還是整天休。

---

### 2. 全部排休｜「整個團隊今天誰在？這週誰會不見？」

**頁面：`AllLeaveCalendar`（全部排休）**

把整個組織的休假資訊攤平給管理者與協作者：

- **跨部門矩陣檢視**：橫軸是日期、縱軸是員工，假別用顏色標記，一目了然。
- **部門 / 假別篩選**：只看研發部、只看特休、或同時看兩者皆可。
- **月 / 年度切換**：可以縮放到當月明細，也可以看整年度的休假分佈。
- **管理員直接編輯**：管理員可代為新增、刪除、區段刪除請假，所有動作都會發通知給當事人與代理人。
- **批次新建**：區段請假採 `bulkCreate`，一次寫入整段。
- **儀表板加值**：搭配「儀表板（Dashboard）」可以挑任一日期，看當天請假名單、人數與假別分佈。

> 💡 主管不用再去群組問「明天誰在？」，打開全部排休直接圈出空缺。

---

### 3. 專案甘特圖｜「排這個任務，當天有幾個人能做？」

**頁面：`GanttManagement`（專案甘特圖）**

這是 VacWorkGantt **最有差異化** 的一塊：把休假資料直接疊到甘特圖上。

- **無限捲動的時間軸**：以「天」為單位的網格，向左向右皆可延伸，不需翻頁。
- **多種任務形態**：里程碑（Milestone）、區段任務（Duration）、滾動延伸（Rolling）一次滿足專案規劃需求。
- **拖曳調整工期**：直接在甘特圖上拖曳起訖點，搭配樂觀更新（Optimistic Update）瞬間生效。
- **撤銷支援**：時間變更可用 Ctrl+Z（Mac: ⌘Z）一鍵還原（最多 50 步）。
- **季別 / 標籤 / 部門篩選**：依季節、品牌、樣品、部門收斂視野；過期季節可封存（Archive）並隨時還原。
- **匯入排程**：上傳檔案，由 LLM 解析成任務草稿，再人工微調。
- **行動裝置最佳化**：手機自動切換成 `MobileGanttChart`，移動中也能查專案。

🟦 **休假疊加（Leave Overlay）—— 這個特色不能錯過**

甘特圖的時間軸表頭會即時顯示：

- 每一天的 **請假總人數**（依目前的部門篩選計算）
- **滑鼠停留**或 **點擊** 該日格子，會列出當天請假名單與假別
- 顏色濃淡反映人力緊張程度，**一眼就看出哪幾天不適合排重要任務**

排專案 → 看甘特圖 → 看休假熱度 → 調整時程，**在同一張表內走完**。

---

## 還有這些功能讓系統真的能用

| 模組 | 重點 |
| ---- | ---- |
| **儀表板（Dashboard）** | 任意日期的當日請假名單、警示偵測、管理員工具（清理重複資料、補掃警示）。 |
| **通知中心（Notifications）** | 請假新增 / 刪除自動通知管理員與職代，未讀數量即時顯示在側邊欄（每分鐘輪詢、有快取門檻）。 |
| **人員管理（PeopleManagement）** | 員工、部門、職稱、群組與多帳號綁定（一個員工可綁多個 email）。 |
| **休假設定（LeaveSettings）** | 假別、顏色、年資規則、額度設定。 |
| **專案設定（ProjectSettings）** | 專案分類、品牌標籤、樣品與權限。 |
| **報表管理（ReportManagement）** | 請假與專案統計，支援 PDF / 圖片匯出。 |
| **資料匯入（DataImport）** | 批次匯入既有員工與請假紀錄，搬遷舊系統不再痛苦。 |

---

## 設計理念

- **以「日」為原子單位**：個人請假、團隊出勤、甘特任務都用同一個日期軸對齊，所以資訊才能互相疊加。
- **半日假是一等公民**：上午 / 下午 / 全日在資料模型與 UI 都被獨立呈現，總計時 0.5 / 1 直接算對。
- **行動優先的雙介面**：桌機是工作主場（側邊欄 + 多列甘特），手機則切換成底部 Tab + 簡化版 Gantt，不靠 RWD 硬擠。
- **顏色即語言**：每個假別、每個專案都有自己的色票。系統內建對比色、淡化色、深色文字色的工具函式，確保不同背景下都讀得清楚。
- **通知不打擾，但不漏接**：請假動作只通知「該知道的人」（管理員 + 當事人 + 兩位職代），未讀數量集中在通知中心一處。
- **管理員可干預，但留痕**：所有代為操作的請假都會走通知流程，責任歸屬明確。
- **共用商業邏輯**：職代衝突檢查、部門 1/3 上限、警示資訊建立全部抽到 helper（`leaveWarnings.jsx`）；通知扇出抽到 `leaveNotifications.jsx`。`LeaveCalendar` 與 `AllLeaveCalendar` 走同一份程式碼，未來修改一次就好。

---

## 技術棧

- **前端**：React 18 + Vite 6 + JSX（`checkJs` 開啟、`<React.StrictMode>` 啟用）
- **路由**：react-router-dom 6（頁面自動註冊於 `src/pages.config.js`）
- **資料層**：@tanstack/react-query（單一 QueryClient，`refetchOnWindowFocus: false`、集中快取鍵）
- **後端 SDK**：[@base44/sdk](https://www.npmjs.com/package/@base44/sdk)
- **UI**：Tailwind CSS + shadcn/ui（new-york style）+ Radix UI + lucide-react
- **表單**：react-hook-form + zod
- **互動 / 視覺**：framer-motion、recharts、@hello-pangea/dnd、three.js
- **匯出**：jspdf、html2canvas
- **工具**：date-fns、moment、lodash

---

## 快速開始

需求：Node.js 18+

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器
npm run dev

# 建置正式版（輸出至 dist/）
npm run build

# 預覽建置結果
npm run preview

# Lint / 型別檢查
npm run lint
npm run lint:fix
npm run typecheck
```

App ID、後端 URL、Access Token 可以透過 URL 參數帶入（`?app_id=...&server_url=...&access_token=...`），
或設定環境變數 `VITE_BASE44_APP_ID`、`VITE_BASE44_BACKEND_URL`、`VITE_BASE44_FUNCTIONS_VERSION`。

---

## 專案結構

```
src/
├── api/              # base44 client 與 entities 包裝
├── assets/           # 靜態資源
├── components/       # 共用元件
│   ├── calendar/     # 排休行事曆元件
│   ├── dashboard/    # 儀表板元件
│   ├── gantt/        # 甘特圖元件（含 MobileGanttChart）
│   ├── ui/           # shadcn/ui 基礎元件（自動生成，請勿手改）
│   ├── hooks/        # 元件層 hooks
│   └── utils/        # 業務工具（leaveWarnings、leaveNotifications、leaveRangeDelete）
├── hooks/            # 全域 hooks（useIsMobile）
├── lib/              # AuthContext、ganttUtils、leaveUtils、query-client、app-params
├── pages/            # 頁面（自動註冊）
├── utils/            # createPageUrl 等小工具
├── App.jsx           # AuthProvider → QueryClient → Router
├── Layout.jsx        # 桌機側邊欄 + 手機底部 Tab
├── main.jsx          # 進入點（含 StrictMode）
└── pages.config.js   # 自動產生，僅 mainPage 可手動修改
```

詳細的開發守則、查詢鍵、領域規則、踩雷點請見 [`CLAUDE.md`](./CLAUDE.md)。

---

## 部署

此專案以 [Base44](https://base44.com) 作為後端服務，前端為標準 Vite 靜態網站，
建置產物位於 `dist/`，可部署至 Vercel、Netlify、Cloudflare Pages 或任何靜態主機。

> ⚠️ 樂觀更新使用 `crypto.randomUUID()` 產生暫時 ID，需要 secure context（HTTPS 或 localhost）。
> 生產環境 HTTPS 與本機 dev 都沒問題；若部署到自架 IP+HTTP，需要補 polyfill。

---

## 一句話總結

> **休假是團隊的事，專案也是團隊的事。VacWorkGantt 把它們放回同一張表。**
