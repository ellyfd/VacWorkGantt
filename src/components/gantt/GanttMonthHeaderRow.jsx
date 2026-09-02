import React from 'react';
import { format } from 'date-fns';

// 月份 header 列（memo：只在 days 改變時重算月份分組）
/**
 * @param {object} props
 * @param {Date[]} props.days
 * @param {number} props.cellWidth
 * @param {number} props.height
 */
function GanttMonthHeaderRowInner({ days, cellWidth, height }) {
  const monthGroups = [];
  let current = null;
  days.forEach((day) => {
    const monthKey = format(day, 'yyyy-MM');
    if (current?.key !== monthKey) {
      current = { key: monthKey, label: format(day, 'yyyy年M月'), count: 1 };
      monthGroups.push(current);
    } else {
      current.count++;
    }
  });
  return (
    <div className="flex border-b border-gray-200" style={{ height }}>
      {monthGroups.map(g => (
        <div
          key={g.key}
          className="border-r border-gray-300 text-sm font-bold text-gray-700 flex items-center justify-center bg-gray-100 flex-shrink-0"
          style={{ width: g.count * cellWidth, height }}
        >
          {g.label}
        </div>
      ))}
    </div>
  );
}

const GanttMonthHeaderRow = React.memo(GanttMonthHeaderRowInner);

export default GanttMonthHeaderRow;
