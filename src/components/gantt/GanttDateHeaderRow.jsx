import React from 'react';
import { format, getDay, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// 日期 header 列（memo：拖曳/對話框等父層 state 變動時不重畫整排日期）
/**
 * @param {object} props
 * @param {Date[]} props.days
 * @param {object} props.gridStyle
 * @param {number} props.height
 * @param {boolean} props.hideHolidays
 * @param {Set<string>} props.holidaySet
 */
function GanttDateHeaderRowInner({ days, gridStyle, height, hideHolidays, holidaySet }) {
  return (
    <div style={{ ...gridStyle, height, borderBottom: '1px solid #d1d5db' }}>
      {days.map((day) => {
        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
        const isHolidayHeader = !hideHolidays && holidaySet.has(format(day, 'yyyy-MM-dd'));
        const isFirstDay = format(day, 'd') === '1';
        return (
          <div
            key={day.toISOString()}
            className={`border-r border-gray-200 flex flex-col items-center justify-center gap-0.5 ${
              isToday(day) ? 'bg-blue-50 text-blue-800 font-bold border-t-2 border-blue-500' :
              (isWeekend || isHolidayHeader) ? 'bg-gray-200 text-gray-500' :
              'bg-gray-100 text-gray-700'
            }`}
            style={{ borderLeft: isFirstDay ? '2px solid #6b7280' : undefined }}
          >
            <span className="text-sm font-bold leading-none">{format(day, 'd')}</span>
            <span className={`text-[11px] leading-none ${isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
              {format(day, 'EEE', { locale: zhTW })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const GanttDateHeaderRow = React.memo(GanttDateHeaderRowInner);

export default GanttDateHeaderRow;
