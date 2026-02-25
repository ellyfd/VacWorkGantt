/**
 * 檢查職代衝突
 * @param {Object} params
 * @param {Object} params.employee - 當前員工
 * @param {string} params.date - 請假日期
 * @param {Array} params.leaveTypes - 所有假別列表
 * @param {string} params.leaveTypeId - 當前假別ID
 * @param {Array} params.allLeaveRecords - 所有請假記錄
 * @param {Array} params.employees - 所有員工列表
 * @returns {Array} 衝突的請假記錄
 */
export function checkDeputyConflict({ employee, date, leaveTypes, leaveTypeId, allLeaveRecords, employees }) {
  const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
  if (leaveType?.name === '出差') return [];
  
  const deputies = [employee?.deputy_1, employee?.deputy_2].filter(Boolean);
  if (deputies.length === 0) return [];
  
  return allLeaveRecords.filter(r => {
    const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
    return deputies.includes(r.employee_id) && r.date === date && rLeaveType?.name !== '出差';
  });
}

/**
 * 檢查部門人數限制
 * @param {Object} params
 * @param {Object} params.employee - 當前員工
 * @param {string} params.date - 請假日期
 * @param {string} params.leaveTypeId - 當前假別ID
 * @param {Array} params.leaveTypes - 所有假別列表
 * @param {Array} params.allLeaveRecords - 所有請假記錄
 * @param {Array} params.employees - 所有員工列表
 * @returns {Object|null} { deptLeaves, deptLimit, deptTotalMembers } 或 null（未超過）
 */
export function checkDeptLimit({ employee, date, leaveTypeId, leaveTypes, allLeaveRecords, employees }) {
  const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
  if (leaveType?.name === '出差') return null;
  
  // 計算部門總人數（只算一次）
  const deptTotalMembers = employees.filter(e =>
    e.status === 'active' &&
    e.department_ids?.some(deptId => employee?.department_ids?.includes(deptId))
  ).length;
  const deptLimit = Math.floor(deptTotalMembers / 3);
  
  const deptLeaves = allLeaveRecords.filter(r => {
    if (r.employee_id === employee.id) return false;
    const emp = employees.find(e => e.id === r.employee_id);
    const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
    return emp?.department_ids?.some(deptId => employee?.department_ids?.includes(deptId))
      && r.date === date
      && rLeaveType?.name !== '出差';
  });
  
  if (deptLeaves.length >= deptLimit) {
    return { deptLeaves: deptLeaves.length, deptLimit, deptTotalMembers };
  }
  return null;
}

/**
 * 建立警示資訊
 * @param {Object} params
 * @param {Object} params.employee - 當前員工
 * @param {string} params.date - 請假日期
 * @param {string} params.leaveTypeId - 當前假別ID
 * @param {Array} params.leaveTypes - 所有假別列表
 * @param {Array} params.allLeaveRecords - 所有請假記錄
 * @param {Array} params.employees - 所有員工列表
 * @returns {Object} { warningTypes: [], warningDetails: {} }
 */
export function buildWarningInfo({ employee, date, leaveTypeId, leaveTypes, allLeaveRecords, employees }) {
  const warningTypes = [];
  const warningDetails = {};
  
  // 職代衝突警示
  const deputyConflicts = checkDeputyConflict({ employee, date, leaveTypes, leaveTypeId, allLeaveRecords, employees });
  if (deputyConflicts.length > 0) {
    warningTypes.push('deputy_conflict');
    warningDetails.deputy_conflicts = deputyConflicts.map(c => {
      const emp = employees.find(e => e.id === c.employee_id);
      const lt = leaveTypes.find(l => l.id === c.leave_type_id);
      return {
        employee_id: c.employee_id,
        employee_name: emp?.name || '未知',
        leave_type: lt?.name || '未知'
      };
    });
  }
  
  // 部門人數限制警示
  const deptLimitInfo = checkDeptLimit({ employee, date, leaveTypeId, leaveTypes, allLeaveRecords, employees });
  if (deptLimitInfo) {
    warningTypes.push('department_over_limit');
    warningDetails.department_info = {
      total_members: deptLimitInfo.deptTotalMembers,
      leave_count: deptLimitInfo.deptLeaves + 1,
      limit: deptLimitInfo.deptLimit,
      percentage: Math.round((deptLimitInfo.deptLeaves + 1) / deptLimitInfo.deptTotalMembers * 100)
    };
  }
  
  return { warningTypes, warningDetails };
}