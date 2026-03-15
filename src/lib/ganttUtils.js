/**
 * 根據背景色決定文字要用深色或淺色
 */
export const getContrastColor = (hexColor) => {
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1f2937' : '#ffffff';
};

/**
 * 產生同色系淺色（用於 Rolling 延伸段）
 * 支援 hsl() 和 hex 格式
 */
export const getLightColor = (color) => {
  if (!color) return '#bfdbfe';
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*([\d.]+)%\)/);
  if (hslMatch) {
    return `hsl(${hslMatch[1]}, ${hslMatch[2]}%, 82%)`;
  }
  if (!color.startsWith('#')) return '#bfdbfe';
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * 0.72);
  const lg = Math.round(g + (255 - g) * 0.72);
  const lb = Math.round(b + (255 - b) * 0.72);
  return `rgb(${lr},${lg},${lb})`;
};

/**
 * 正規化日期字串，移除時間部分
 */
export const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  return dateStr.split('T')[0];
};

/**
 * 計算兩個日期間的工作天數（排除週末）
 */
export const calculateWorkingDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end) return 0;

  let count = 0;
  const current = new Date(start);
  const endD = new Date(end);
  while (current <= endD) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};
