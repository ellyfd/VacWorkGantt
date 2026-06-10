-- 範例資料（部署後可先灌這個確認看得到畫面，正式上線再清掉自行新增）
INSERT OR IGNORE INTO departments (id, name, sort_order) VALUES
  ('d_tg',  '特工',          10),
  ('d_gm',  '估碼',          20),
  ('d_dpc', '3D team（DPC）', 30);

INSERT OR IGNORE INTO leave_types (id, name, short_name, color, sort_order) VALUES
  ('lt_full', '整天休', '休',   '#22c55e', 1),
  ('lt_pm',   '午休',   '午休', '#a855f7', 2),
  ('lt_biz',  '出差',   '差',   '#ec4899', 3),
  ('lt_sick', '病假',   '病',   '#f97316', 4);

INSERT OR IGNORE INTO employees (id, name, english_name, department_ids, sort_order) VALUES
  ('e1', '游怡專', '',      '["d_tg"]',  1),
  ('e2', '梁景翔', '',      '["d_tg"]',  2),
  ('e3', '陳慧芬', '',      '["d_gm"]',  1),
  ('e4', '程麗如', 'Elly',  '["d_dpc"]', 1),
  ('e5', '洪捷',   'Chieh', '["d_dpc"]', 2);

INSERT OR IGNORE INTO leave_records (id, employee_id, date, leave_type_id) VALUES
  ('r1', 'e4', '2026-12-12', 'lt_pm'),
  ('r2', 'e5', '2026-12-07', 'lt_full'),
  ('r3', 'e5', '2026-12-08', 'lt_full');
