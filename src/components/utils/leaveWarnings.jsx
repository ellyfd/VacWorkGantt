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
 * 建立警示資訊
 * @returns {Object} { warningTypes: [], warningDetails: {} }
 */
export function buildWarningInfo({ employee, date, leaveTypeId, leaveTypes, allLeaveRecords, employees }) {
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

  return { warningTypes, warningDetails };
}
