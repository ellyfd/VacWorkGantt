import React from 'react';

export default function GanttBar({ item, days, startDate, endDate }) {
  if (!item.time_type) return null;

  // 計算里程碑或區間的位置
  let position = null;
  let width = null;
  let type = null;

  if (item.time_type === 'milestone' && item.date) {
    const dayIndex = days.findIndex(d => d === item.date);
    if (dayIndex >= 0) {
      position = dayIndex * 30;
      width = 16;
      type = 'milestone';
    }
  } else if (item.time_type === 'duration' && item.start_date && item.end_date) {
    const startIdx = days.findIndex(d => d === item.start_date);
    const endIdx = days.findIndex(d => d === item.end_date);
    if (startIdx >= 0 && endIdx >= 0) {
      position = startIdx * 30;
      width = (endIdx - startIdx + 1) * 30;
      type = 'duration';
    }
  } else if (item.time_type === 'rolling' && item.start_date) {
    const startIdx = days.findIndex(d => d === item.start_date);
    const endIdx = days.length - 1;
    if (startIdx >= 0) {
      position = startIdx * 30;
      width = (endIdx - startIdx + 1) * 30;
      type = 'rolling';
    }
  }

  if (position === null || width === null) return null;

  return (
    <>
      {type === 'milestone' && (
        <div
          className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${position + 15}px` }}
        >
          <div className="relative">
            <div className="w-4 h-4 bg-red-500 transform rotate-45 rounded-sm shadow" />
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-red-600 font-semibold">
              {item.date}
            </div>
          </div>
        </div>
      )}

      {type === 'duration' && (
        <div
          className="absolute top-1/2 transform -translate-y-1/2 h-6 bg-blue-400 rounded shadow hover:bg-blue-500 transition-colors"
          style={{ left: `${position}px`, width: `${width}px` }}
          title={`${item.start_date} ~ ${item.end_date}`}
        />
      )}

      {type === 'rolling' && (
        <div
          className="absolute top-1/2 transform -translate-y-1/2 h-6 rounded shadow"
          style={{
            left: `${position}px`,
            width: `${width}px`,
            background: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 10px, #fbbf24 10px, #fbbf24 20px)',
          }}
          title={`From ${item.start_date}`}
        />
      )}
    </>
  );
}