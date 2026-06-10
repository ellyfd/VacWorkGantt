// 開發處休假系統 — Cloudflare Worker API（第 1 階段：讀取）
//
// 綁定：wrangler.toml 裡的 D1 binding 名稱為 DB。
// 端點：
//   GET /api/calendar?year=YYYY&month=M  → 回傳月曆檢視頁需要的 JSON 結構
//   GET /api/health                       → 健康檢查
//
// 後續階段會再加 POST/PUT/DELETE（人員、部門、休假設定、請假）與裝置綁定登入。

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      if (url.pathname === '/api/health') return json({ ok: true });
      if (url.pathname === '/api/calendar') {
        const now = new Date();
        const year = Number(url.searchParams.get('year')) || now.getFullYear();
        const month = Number(url.searchParams.get('month')) || now.getMonth() + 1;
        return json(await buildCalendar(env, year, month));
      }
      return json({ error: 'not_found' }, 404);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },
};

async function buildCalendar(env, year, month) {
  const [depts, emps, types, recs, hols] = await Promise.all([
    env.DB.prepare("SELECT * FROM departments WHERE status != 'hidden' ORDER BY sort_order").all(),
    env.DB.prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY sort_order").all(),
    env.DB.prepare('SELECT * FROM leave_types ORDER BY sort_order').all(),
    env.DB.prepare('SELECT * FROM leave_records').all(),
    env.DB.prepare('SELECT date FROM holidays').all(),
  ]);

  const typeById = Object.fromEntries(types.results.map((t) => [t.id, t]));

  const legend = {};
  for (const t of types.results) legend[t.short_name || t.name] = t.color || '#64748b';

  const leavesByEmp = {};
  for (const r of recs.results) {
    const t = typeById[r.leave_type_id];
    const label = t ? t.short_name || t.name : '休';
    (leavesByEmp[r.employee_id] ||= {})[r.date] = label;
  }

  const departments = depts.results
    .map((d) => ({
      name: d.name,
      members: emps.results
        .filter((e) => safeIds(e.department_ids).includes(d.id))
        .map((e) => ({ name: e.name, code: e.english_name || '', leaves: leavesByEmp[e.id] || {} })),
    }))
    .filter((d) => d.members.length > 0);

  return {
    title: '開發處休假表',
    year,
    month,
    updated_at: new Date().toISOString(),
    legend,
    holidays: [...new Set(hols.results.map((h) => h.date).filter(Boolean))],
    departments,
  };
}

function safeIds(s) {
  try {
    const v = JSON.parse(s || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
