/**
 * 建立連續區間刪除
 * 根據一條請假記錄找出同一假別的連續區間
 * @param {Object} record - 點擊的請假記錄
 * @param {Array} sameTypeRecords - 同一假別的所有記錄（已排序）
 * @returns {Array|null} 連續區間記錄，或 null 如果是單天
 */
export function buildDeleteRange(record, sameTypeRecords) {
  if (sameTypeRecords.length === 0) return null;

  const rangeRecords = [record];
  const recordIndex = sameTypeRecords.findIndex(r => r.id === record.id);

  // 向前找連續日期
  for (let i = recordIndex - 1; i >= 0; i--) {
    const currentDate = sameTypeRecords[i].date;
    const nextDate = rangeRecords[0].date;

    const current = new Date(currentDate + 'T00:00:00');
    const next = new Date(nextDate + 'T00:00:00');
    const diffDays = (next - current) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      rangeRecords.unshift(sameTypeRecords[i]);
    } else {
      break;
    }
  }

  // 向後找連續日期
  for (let i = recordIndex + 1; i < sameTypeRecords.length; i++) {
    const currentDate = rangeRecords[rangeRecords.length - 1].date;
    const nextDate = sameTypeRecords[i].date;

    const current = new Date(currentDate + 'T00:00:00');
    const next = new Date(nextDate + 'T00:00:00');
    const diffDays = (next - current) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      rangeRecords.push(sameTypeRecords[i]);
    } else {
      break;
    }
  }

  // 只有區間（超過1天）才回傳
  return rangeRecords.length > 1 ? rangeRecords : null;
}