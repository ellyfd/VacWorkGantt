/**
 * 假別期間判斷。
 * 優先讀 LeaveType 的 period 欄位；未設定的舊資料退回名稱判斷
 * （改名會讓名稱判斷失效，設定過 period 的假別不受影響）。
 * @param {{ period?: string, name?: string } | string | null | undefined} leaveType
 *   LeaveType 物件（建議）；相容舊呼叫方式也接受名稱字串
 * @returns {'AM' | 'PM' | 'full'}
 */
export const getLeavePeriod = (leaveType) => {
  if (leaveType && typeof leaveType === 'object') {
    if (leaveType.period === 'AM' || leaveType.period === 'PM') return leaveType.period;
    if (leaveType.period === 'full') return 'full';
  }
  const name = typeof leaveType === 'string' ? leaveType : leaveType?.name;
  if (['健檢', '上午休'].includes(name)) return 'AM';
  if (name === '下午休') return 'PM';
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
