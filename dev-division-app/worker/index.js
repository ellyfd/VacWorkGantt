// 開發處休假系統 — Cloudflare Worker API
//
// 階段 1：讀取月曆。 階段 2：裝置綁定登入 + 我的排休（各人請假/改假）。
//
// 身分模型（無密碼）：前端產生一組隨機 device token 存在瀏覽器，
// 每次請求帶 X-Device-Token。第一次選自己的名字後，把 token 綁到該員工。
// ⚠️ 無密碼＝拿到連結的人都能綁成任一員工，屬內部低風險用途。
//
// 端點：
//   GET    /api/health
//   GET    /api/calendar?year&month        全部排休（讀）
//   GET    /api/employees                  登入用的人員清單
//   GET    /api/leave-types                假別清單
//   POST   /api/bind        {employee_id}  以本裝置綁定為某員工
//   GET    /api/me                         取得本裝置綁定的員工
//   GET    /api/my-leaves?year             我的休假
//   POST   /api/my-leaves   {date,leave_type_id,period}
//   DELETE /api/my-leaves/:id

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token, X-Sync-Secret',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

const token = (req) => req.headers.get('X-Device-Token') || '';

async function meFromToken(env, t) {
  if (!t) return null;
  return env.DB.prepare('SELECT * FROM employees WHERE device_token = ?').bind(t).first();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;
    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      if (pathname === '/api/health') return json({ ok: true });

      // 手動同步：從 Base44 把 DPC 資料灌進 D1（需帶正確的 SYNC_SECRET）
      if (pathname === '/api/sync' && method === 'POST') {
        const provided = request.headers.get('X-Sync-Secret') || url.searchParams.get('key') || '';
        if (!env.SYNC_SECRET || provided !== env.SYNC_SECRET) {
          return json({ error: 'unauthorized' }, 401);
        }
        return json(await syncFromBase44(env));
      }

      if (pathname === '/api/calendar' && method === 'GET') {
        const now = new Date();
        const year = Number(url.searchParams.get('year')) || now.getFullYear();
        const month = Number(url.searchParams.get('month')) || now.getMonth() + 1;
        return json(await buildCalendar(env, year, month));
      }

      if (pathname === '/api/employees' && method === 'GET') {
        const r = await env.DB.prepare(
          "SELECT id, name, english_name, department_ids FROM employees WHERE status='active' ORDER BY sort_order",
        ).all();
        return json(r.results);
      }

      if (pathname === '/api/leave-types' && method === 'GET') {
        const r = await env.DB.prepare('SELECT * FROM leave_types ORDER BY sort_order').all();
        return json(r.results);
      }

      if (pathname === '/api/bind' && method === 'POST') {
        const t = token(request);
        if (!t) return json({ error: 'no_device_token' }, 400);
        const { employee_id } = await request.json();
        const emp = await env.DB.prepare('SELECT * FROM employees WHERE id = ?').bind(employee_id).first();
        if (!emp) return json({ error: 'employee_not_found' }, 404);
        // 一個裝置只綁一人：先把這個 token 從其他人身上清掉
        await env.DB.prepare('UPDATE employees SET device_token = NULL WHERE device_token = ?').bind(t).run();
        await env.DB.prepare('UPDATE employees SET device_token = ? WHERE id = ?').bind(t, employee_id).run();
        return json({ id: emp.id, name: emp.name, english_name: emp.english_name });
      }

      if (pathname === '/api/me' && method === 'GET') {
        const me = await meFromToken(env, token(request));
        if (!me) return json({ error: 'not_bound' }, 401);
        return json({ id: me.id, name: me.name, english_name: me.english_name });
      }

      if (pathname === '/api/my-leaves' && method === 'GET') {
        const me = await meFromToken(env, token(request));
        if (!me) return json({ error: 'not_bound' }, 401);
        const year = url.searchParams.get('year');
        let q = 'SELECT * FROM leave_records WHERE employee_id = ?';
        const binds = [me.id];
        if (year) {
          q += ' AND date >= ? AND date <= ?';
          binds.push(`${year}-01-01`, `${year}-12-31`);
        }
        const r = await env.DB.prepare(q).bind(...binds).all();
        return json(r.results);
      }

      if (pathname === '/api/my-leaves' && method === 'POST') {
        const me = await meFromToken(env, token(request));
        if (!me) return json({ error: 'not_bound' }, 401);
        const { date, leave_type_id, period = 'full' } = await request.json();
        if (!date || !leave_type_id) return json({ error: 'missing_fields' }, 400);
        // 同一天同時段先清掉再寫，避免重複
        await env.DB.prepare(
          'DELETE FROM leave_records WHERE employee_id = ? AND date = ? AND period = ?',
        ).bind(me.id, date, period).run();
        const id = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO leave_records (id, employee_id, date, leave_type_id, period) VALUES (?,?,?,?,?)',
        ).bind(id, me.id, date, leave_type_id, period).run();
        return json({ id, employee_id: me.id, date, leave_type_id, period });
      }

      const delMatch = pathname.match(/^\/api\/my-leaves\/(.+)$/);
      if (delMatch && method === 'DELETE') {
        const me = await meFromToken(env, token(request));
        if (!me) return json({ error: 'not_bound' }, 401);
        await env.DB.prepare('DELETE FROM leave_records WHERE id = ? AND employee_id = ?')
          .bind(delMatch[1], me.id)
          .run();
        return json({ ok: true });
      }

      return json({ error: 'not_found' }, 404);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },

  // Cloudflare Cron Trigger：定時把 Base44 的 DPC 資料同步進 D1
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncFromBase44(env)
        .then((r) => console.log('排程同步完成', JSON.stringify(r.counts)))
        .catch((e) => console.error('排程同步失敗', e && e.message ? e.message : e)),
    );
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
    (leavesByEmp[r.employee_id] ||= {})[r.date] = t ? t.short_name || t.name : '休';
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

// ── 與 Base44 同步（單向：Base44 → D1，只動 DPC 部門）──────────────────

// 讀 Base44 entity（與 dev-division-viewer/scripts/build-dpc.mjs 同一套 API）
async function base44Api(env, entity, q) {
  const API = env.BASE44_API_URL || 'https://app-67c8f9d9.base44.app/api';
  const APP_ID = env.BASE44_APP_ID || '693bb4665c3a400767c8f9d9';
  const url = new URL(`${API}/entities/${entity}`);
  if (q) url.searchParams.set('q', JSON.stringify(q));
  url.searchParams.set('limit', '10000');
  const res = await fetch(url, {
    headers: { api_key: env.BASE44_API_KEY, 'X-App-Id': APP_ID },
  });
  if (!res.ok) {
    throw new Error(`讀取 Base44 ${entity} 失敗：HTTP ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// D1 一次能綁的變數有上限，分批送出（順序保留，後面的批次依序執行）
async function chunkedBatch(env, statements, size = 80) {
  for (let i = 0; i < statements.length; i += size) {
    await env.DB.batch(statements.slice(i, i + size));
  }
}

async function syncFromBase44(env) {
  if (!env.BASE44_API_KEY) {
    throw new Error('缺少 BASE44_API_KEY（請用 `wrangler secret put BASE44_API_KEY` 設定）');
  }
  const DPC_DEPT_NAME = env.DPC_DEPT_NAME || 'DPC';
  const year = new Date().getFullYear();
  const START = `${year}-01-01`;
  const END = `${year + 1}-12-31`;

  // 1) 從 Base44 抓資料
  const departments = await base44Api(env, 'Department');
  const dpcDept = departments.find((d) => d.name === DPC_DEPT_NAME);
  if (!dpcDept) throw new Error(`在 Base44 找不到部門「${DPC_DEPT_NAME}」`);

  const dpcEmployees = (await base44Api(env, 'Employee')).filter(
    (e) => Array.isArray(e.department_ids) && e.department_ids.includes(dpcDept.id),
  );
  const dpcEmpIds = dpcEmployees.map((e) => e.id);
  const dpcEmpIdSet = new Set(dpcEmpIds);

  const leaveTypes = await base44Api(env, 'LeaveType');
  const holidays = (await base44Api(env, 'Holiday')).filter((h) => h.date);
  const records = (await base44Api(env, 'LeaveRecord', { date: { $gte: START, $lte: END } })).filter(
    (r) => dpcEmpIdSet.has(r.employee_id),
  );

  // 2) 組出要寫進 D1 的語句
  const db = env.DB;
  const stmts = [];

  // DPC 部門（只 upsert DPC，不碰其它部門）
  stmts.push(
    db
      .prepare(
        `INSERT INTO departments (id, name, sort_order, status) VALUES (?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order, status=excluded.status`,
      )
      .bind(dpcDept.id, dpcDept.name, dpcDept.sort_order ?? 0, dpcDept.status || 'active'),
  );

  // 假別（全域參考資料，upsert）
  for (const t of leaveTypes) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO leave_types (id, name, short_name, color, sort_order) VALUES (?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET name=excluded.name, short_name=excluded.short_name, color=excluded.color, sort_order=excluded.sort_order`,
        )
        .bind(t.id, t.name, t.short_name || null, t.color || null, t.sort_order ?? 0),
    );
  }

  // DPC 員工（upsert；device_token 不在 SET 內 → 保留 me.html 的裝置綁定）
  for (const e of dpcEmployees) {
    const deptIds = JSON.stringify(e.department_ids || []);
    const sortOrder = e.sort_order_by_dept?.[dpcDept.id] ?? e.sort_order ?? 0;
    stmts.push(
      db
        .prepare(
          `INSERT INTO employees (id, name, english_name, department_ids, status, sort_order)
           VALUES (?,?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET name=excluded.name, english_name=excluded.english_name,
             department_ids=excluded.department_ids, status=excluded.status, sort_order=excluded.sort_order`,
        )
        .bind(e.id, e.name, e.english_name || null, deptIds, e.status || 'active', sortOrder),
    );
  }

  // 休假紀錄：先清掉 DPC 員工的舊資料，再灌入 Base44 現況（同批次依序執行）
  if (dpcEmpIds.length) {
    const placeholders = dpcEmpIds.map(() => '?').join(',');
    stmts.push(db.prepare(`DELETE FROM leave_records WHERE employee_id IN (${placeholders})`).bind(...dpcEmpIds));
  }
  for (const r of records) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO leave_records (id, employee_id, date, leave_type_id, period, note) VALUES (?,?,?,?,?,?)`,
        )
        .bind(r.id || crypto.randomUUID(), r.employee_id, r.date, r.leave_type_id || null, r.period || 'full', r.note || null),
    );
  }

  // 國定假日（全域）：整批換新
  stmts.push(db.prepare('DELETE FROM holidays').bind());
  for (const h of holidays) {
    stmts.push(
      db
        .prepare(`INSERT INTO holidays (id, date, name, type) VALUES (?,?,?,?)`)
        .bind(h.id || crypto.randomUUID(), h.date, h.name || null, h.type || 'national'),
    );
  }

  await chunkedBatch(env, stmts);

  return {
    ok: true,
    synced_at: new Date().toISOString(),
    department: dpcDept.name,
    range: { from: START, to: END },
    counts: {
      employees: dpcEmployees.length,
      leave_records: records.length,
      leave_types: leaveTypes.length,
      holidays: holidays.length,
    },
  };
}
