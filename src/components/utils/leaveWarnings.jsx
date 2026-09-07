import { isDpcEmployee } from '@/lib/access';

/**
 * 共同建立 leaveType / employee 的 Map，避免在迴圈內 array.find。
 * 內部函式，不對外 export。
 */
function buildMaps(leaveTypes, employees) {
  return {
    leaveTypeMap: new Map(leaveTypes.map(lt => [lt.id, lt])),
    employeeMap: new Map(employees.map(e => [e.id, e])),
  };
}

/**
 * 檢查職代衝突
 * @returns {Array} 衝突的請假記錄
 */
export function checkDeputyConflict({ employee, date, leaveTypes, leaveTypeId, allLeaveRecords, employees: _employees }) {
  const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.id, lt]));
  const currentLeaveType = leaveTypeMap.get(leaveTypeId);
  if (currentLeaveType?.name === '出差') return [];

  const deputies = new Set(
    [employee?.deputy_1, employee?.deputy_2].filter(Boolean)
  );
  if (deputies.size === 0) return [];

  return allLeaveRecords.filter(r => {
    if (!deputies.has(r.employee_id) || r.date !== date) return false;
    return leaveTypeMap.get(r.leave_type_id)?.name !== '出差';
  });
}

/**
 * 檢查部門人數限制
 * @returns {Object|null} { deptLeaves, deptLimit, deptTotalMembers } 或 null
 */
export function checkDeptLimit({ employee, date, leaveTypeId, leaveTypes, allLeaveRecords, employees }) {
  const { leaveTypeMap, employeeMap } = buildMaps(leaveTypes, employees);
  const currentLeaveType = leaveTypeMap.get(leaveTypeId);
  if (currentLeaveType?.name === '出差') return null;

  const myDeptIds = new Set(employee?.department_ids || []);
  if (myDeptIds.size === 0) return null;

  const sharesDept = (deptIds) =>
    deptIds?.some(id => myDeptIds.has(id)) || false;

  const deptTotalMembers = employees.filter(
    e => e.status === 'active' && sharesDept(e.department_ids)
  ).length;
  const deptLimit = Math.floor(deptTotalMembers / 3);

  const deptLeaves = allLeaveRecords.filter(r => {
    if (r.employee_id === employee.id || r.date !== date) return false;
    const emp = employeeMap.get(r.employee_id);
    if (!sharesDept(emp?.department_ids)) return false;
    return leaveTypeMap.get(r.leave_type_id)?.name !== '出差';
  });

  if (deptLeaves.length >= deptLimit) {
    return { deptLeaves: deptLeaves.length, deptLimit, deptTotalMembers };
  }
  return null;
}

/**
 * 檢查請假日期是否落在開發季任務期間。
 * 只針對開發處（DPC）人員；其他部門不觸發此警示。
 * 只看未封存開發季的任務：duration 看起訖區間、milestone 看當天；
 * rolling 為開放式區間不計（會把開始日之後全部標警示，過度警示）。
 * @returns {Array} [{ season_name, task_name, start_date, end_date }]
 */
export function checkDevSeasonConflict({ employee, departments, date, leaveTypeId, leaveTypes, ganttTasks, ganttProjects }) {
  if (!isDpcEmployee(employee, departments)) return [];
  if (!ganttTasks?.length || !ganttProjects?.length) return [];
  const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.id, lt]));
  if (leaveTypeMap.get(leaveTypeId)?.name === '出差') return [];

  const projectMap = new Map(
    ganttProjects
      .filter(gp => gp.status !== 'archived' && !gp.archived_at)
      .map(gp => [gp.id, gp])
  );

  return ganttTasks
    .filter(t => {
      if (!t.start_date) return false;
      const gp = projectMap.get(t.gantt_project_id);
      if (!gp) return false;
      const start = t.start_date.split('T')[0];
      if (t.time_type === 'duration') {
        if (!t.end_date) return false;
        return date >= start && date <= t.end_date.split('T')[0];
      }
      if (t.time_type === 'milestone') return date === start;
      return false;
    })
    .map(t => ({
      season_name: projectMap.get(t.gantt_project_id)?.name || '未知開發季',
      task_name: t.name,
      start_date: t.start_date.split('T')[0],
      end_date: t.end_date ? t.end_date.split('T')[0] : t.start_date.split('T')[0],
    }));
}

/**
 * 建立警示資訊。
 * ganttTasks / ganttProjects 為選填：有傳才檢查開發季期間警示。
 * @returns {Object} { warningTypes: [], warningDetails: {} }
 */
export function buildWarningInfo({ employee, date, leaveTypeId, leaveTypes, allLeaveRecords, employees, ganttTasks, ganttProjects, departments }) {
  const { leaveTypeMap, employeeMap } = buildMaps(leaveTypes, employees);
  const warningTypes = [];
  const warningDetails = {};

  const deputyConflicts = checkDeputyConflict({
    employee, date, leaveTypes, leaveTypeId, allLeaveRecords, employees,
  });
  if (deputyConflicts.length > 0) {
    warningTypes.push('deputy_conflict');
    warningDetails.deputy_conflicts = deputyConflicts.map(c => ({
      employee_id: c.employee_id,
      employee_name: employeeMap.get(c.employee_id)?.name || '未知',
      leave_type: leaveTypeMap.get(c.leave_type_id)?.name || '未知',
    }));
  }

  const deptLimitInfo = checkDeptLimit({
    employee, date, leaveTypeId, leaveTypes, allLeaveRecords, employees,
  });
  if (deptLimitInfo) {
    warningTypes.push('department_over_limit');
    warningDetails.department_info = {
      total_members: deptLimitInfo.deptTotalMembers,
      leave_count: deptLimitInfo.deptLeaves + 1,
      limit: deptLimitInfo.deptLimit,
      percentage: Math.round(
        (deptLimitInfo.deptLeaves + 1) / deptLimitInfo.deptTotalMembers * 100
      ),
    };
  }

  const devSeasonConflicts = checkDevSeasonConflict({
    employee, departments, date, leaveTypeId, leaveTypes, ganttTasks, ganttProjects,
  });
  if (devSeasonConflicts.length > 0) {
    warningTypes.push('dev_season');
    warningDetails.dev_seasons = devSeasonConflicts;
  }

  return { warningTypes, warningDetails };
}
