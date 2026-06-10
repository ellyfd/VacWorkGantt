import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// 每天早上 8:00（台灣時間）由排程觸發，或由外部系統直接呼叫
// 回傳 DPC 部門當天（含）之後的所有請假資料

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 取得所有部門，找出 DPC
    const departments = await base44.asServiceRole.entities.Department.list();
    const dpcDept = departments.find(d => d.name === 'DPC');

    if (!dpcDept) {
      return Response.json({ error: 'DPC 部門不存在' }, { status: 404 });
    }

    // 取得 DPC 的員工（active 狀態）
    const employees = await base44.asServiceRole.entities.Employee.list();
    const dpcEmployees = employees.filter(
      e => e.department_ids?.includes(dpcDept.id) && e.status === 'active'
    );
    const dpcEmployeeIds = new Set(dpcEmployees.map(e => e.id));

    // 今天日期（台灣時間 UTC+8）
    const now = new Date();
    const taiwanOffset = 8 * 60 * 60 * 1000;
    const taiwanNow = new Date(now.getTime() + taiwanOffset);
    const todayStr = taiwanNow.toISOString().slice(0, 10);

    // 取得假別
    const leaveTypes = await base44.asServiceRole.entities.LeaveType.list();
    const leaveTypeMap = Object.fromEntries(leaveTypes.map(lt => [lt.id, lt]));

    // 取得當天之後的所有請假紀錄（不限日期上限）
    const allRecords = await base44.asServiceRole.entities.LeaveRecord.filter({
      date: { $gte: todayStr }
    });

    // 過濾出 DPC 員工的請假
    const dpcRecords = allRecords.filter(r => dpcEmployeeIds.has(r.employee_id));

    // 組合輸出資料
    const employeeMap = Object.fromEntries(dpcEmployees.map(e => [e.id, e]));

    const result = dpcRecords
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => {
        const emp = employeeMap[r.employee_id];
        const lt = leaveTypeMap[r.leave_type_id];
        return {
          date: r.date,
          employee_id: r.employee_id,
          employee_name: emp?.name || '',
          english_name: emp?.english_name || '',
          leave_type: lt?.name || '',
          leave_type_short: lt?.short_name || '',
          period: r.period || 'full',
          note: r.note || '',
        };
      });

    return Response.json({
      generated_at: taiwanNow.toISOString().replace('T', ' ').slice(0, 19) + ' (台灣時間)',
      from_date: todayStr,
      department: 'DPC',
      total_records: result.length,
      records: result,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});