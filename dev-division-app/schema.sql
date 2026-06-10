-- 開發處休假系統 — Cloudflare D1 資料庫結構
-- 欄位對齊 Base44 的 Department / Employee / LeaveType / LeaveRecord / Holiday。

CREATE TABLE IF NOT EXISTS departments (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'active'        -- active / hidden
);

CREATE TABLE IF NOT EXISTS employees (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  english_name    TEXT,
  department_ids  TEXT DEFAULT '[]',       -- JSON 陣列字串，例：["d_dpc"]
  status          TEXT DEFAULT 'active',   -- active / inactive / parental_leave / hidden
  sort_order      INTEGER DEFAULT 0,
  device_token    TEXT                     -- 第一次輸入英文名後綁定的裝置識別碼
);

CREATE TABLE IF NOT EXISTS leave_types (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  short_name  TEXT,
  color       TEXT,
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leave_records (
  id             TEXT PRIMARY KEY,
  employee_id    TEXT NOT NULL,
  date           TEXT NOT NULL,            -- YYYY-MM-DD
  leave_type_id  TEXT,
  period         TEXT DEFAULT 'full',      -- full / AM / PM
  note           TEXT
);
CREATE INDEX IF NOT EXISTS idx_leave_emp_date ON leave_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_date ON leave_records(date);

CREATE TABLE IF NOT EXISTS holidays (
  id    TEXT PRIMARY KEY,
  date  TEXT NOT NULL,
  name  TEXT,
  type  TEXT DEFAULT 'national'            -- national / company
);
