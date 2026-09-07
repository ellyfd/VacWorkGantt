// 統一「顯示給人看」的日期格式。
// 政策：對話框/標題用 formatDateFull、緊湊區間用 formatDateShort、
// 月份標題用 formatMonthTitle、通知等時間戳用 formatRelative。
// 資料層（API/query key）維持 yyyy-MM-dd，不經過本模組。
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const toDate = (d) => (typeof d === 'string' ? parseISO(d) : d);

/** 完整日期：2026年9月7日 (日) */
export const formatDateFull = (d) => format(toDate(d), 'yyyy年M月d日 (E)', { locale: zhTW });

/** 緊湊日期：9/7 */
export const formatDateShort = (d) => format(toDate(d), 'M/d');

/** 月份標題：2026年9月 */
export const formatMonthTitle = (d) => format(toDate(d), 'yyyy年M月');

/** 完整日期時間：2026年9月7日 (日) 14:30（tooltip 用） */
export const formatDateTimeFull = (d) =>
  format(toDate(d), 'yyyy年M月d日 (E) HH:mm', { locale: zhTW });

/** 相對時間：「約 2 小時前」；超過 7 天退回完整日期 */
export const formatRelative = (d) => {
  const date = toDate(d);
  if (Math.abs(differenceInDays(new Date(), date)) > 7) return formatDateFull(date);
  return formatDistanceToNow(date, { addSuffix: true, locale: zhTW });
};
