/**
 * 假別期間判斷
 */
export const getLeavePeriod = (leaveTypeName) => {
  if (['健檢', '上午休'].includes(leaveTypeName)) return 'AM';
  if (['下午休'].includes(leaveTypeName)) return 'PM';
  return 'full';
};

/**
 * 建立 holiday Set 用於 O(1) 查詢
 */
export const buildHolidaySet = (holidays) => {
  return new Set(holidays?.map(h => h.date) || []);
};

/**
 * 建立 leaveRecord Map（支援 full/AM/PM）
 */
export const buildLeaveRecordMap = (leaveRecords) => {
  const map = new Map();
  leaveRecords.forEach(r => {
    const key = `${r.employee_id}_${r.date}`;
    if (!map.has(key)) map.set(key, { full: null, AM: null, PM: null });
    const period = r.period || 'full';
    map.get(key)[period] = r;
  });
  return map;
};
