import React from 'react';
import { format, getDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const getLeaveCountStyle = (count) => {
  if (!count) return null;
  if (count <= 2) return { bg: '#fef3c7', text: '#92400e', label: `${count}人` };
  if (count <= 4) return { bg: '#fed7aa', text: '#9a3412', label: `${count}人` };
  return { bg: '#fecaca', text: '#991b1b', label: `${count}人`, bold: true };
};

// 請假人數列（memo：只在天數/請假統計變動時重畫）
/**
 * @param {object} props
 * @param {Date[]} props.days
 * @param {object} props.gridStyle
 * @param {number} props.height
 * @param {Set<string>} props.holidaySet
 * @param {Record<string, number>} props.leaveCountByDate
 * @param {Record<string, {name: string, range?: string}[]>} props.leaveNamesByDate
 */
function GanttLeaveCountRowInner({ days, gridStyle, height, holidaySet, leaveCountByDate, leaveNamesByDate }) {
  return (
    <div style={{ ...gridStyle, height, borderBottom: '2px solid #cbd5e1', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isWeekendLeave = getDay(day) === 0 || getDay(day) === 6;
        const isHolidayLeave = holidaySet.has(dateStr);
        const isDimmedLeave = isWeekendLeave || isHolidayLeave;
        const count = leaveCountByDate[dateStr] || 0;
        const leaveStyle = getLeaveCountStyle(count);
        const cellContent = (
          <div
            key={day.toISOString()}
            className="border-r border-gray-200 flex items-center justify-center transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            style={{
              backgroundColor: leaveStyle?.bg || (isDimmedLeave ? '#e5e7eb' : '#f9fafb'),
              fontSize: 11,
              fontWeight: leaveStyle?.bold ? 700 : 600,
              color: leaveStyle?.text || '#d1d5db',
              cursor: count ? 'pointer' : 'default',
            }}
            title={count ? `${format(day, 'M月d日')}｜${count} 人請假｜點擊查看名單` : undefined}
            aria-label={count ? `${format(day, 'M月d日')}，${count} 人請假，點擊查看名單` : undefined}
          >
            {leaveStyle?.label || ''}
          </div>
        );
        if (!count) return cellContent;
        const names = leaveNamesByDate[dateStr] || [];
        return (
          <Popover key={day.toISOString()}>
            <PopoverTrigger asChild>{cellContent}</PopoverTrigger>
            <PopoverContent className="w-max p-2 text-xs" side="bottom" align="center">
              {names.map((item, idx) => (
                <p key={idx} className="text-gray-800 py-0.5 whitespace-nowrap">
                  {item.name}
                  {item.range && <span className="text-gray-400 ml-1">({item.range})</span>}
                </p>
              ))}
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

const GanttLeaveCountRow = React.memo(GanttLeaveCountRowInner);

export default GanttLeaveCountRow;
