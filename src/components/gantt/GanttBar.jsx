import React from 'react';

const STATUS_COLORS = {
  pending: 'bg-gray-400',
  progress: 'bg-blue-500',
  done: 'bg-green-500',
  delayed: 'bg-red-500',
};

export default function GanttBar({ 
  timeType, 
  startDate, 
  endDate, 
  date, 
  status = 'pending',
  days, 
  cellWidth = 32,
  onClick,
  label
}) {
  if (!days || days.length === 0) return null;

  const getBarPosition = () => {
    if (timeType === 'milestone' && date) {
      const dayIndex = days.findIndex(d => d.date === date);
      if (dayIndex >= 0) {
        return { left: dayIndex * cellWidth + (cellWidth / 2) - 8, width: 16, type: 'milestone' };
      }
    }
    
    if ((timeType === 'duration' || timeType === 'rolling') && startDate) {
      let startIdx = days.findIndex(d => d.date >= startDate);
      if (startIdx < 0) startIdx = 0;
      
      let endIdx;
      if (endDate) {
        endIdx = days.findIndex(d => d.date > endDate);
        if (endIdx < 0) endIdx = days.length;
        endIdx = endIdx - 1;
      } else {
        endIdx = days.length - 1;
      }
      
      if (startIdx <= endIdx) {
        return { 
          left: startIdx * cellWidth + 2, 
          width: (endIdx - startIdx + 1) * cellWidth - 4,
          type: timeType
        };
      }
    }
    
    return null;
  };

  const barPosition = getBarPosition();
  if (!barPosition) return null;

  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const colorHex = status === 'done' ? '#22c55e' : status === 'progress' ? '#3b82f6' : status === 'delayed' ? '#ef4444' : '#9ca3af';

  if (barPosition.type === 'milestone') {
    return (
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${colorClass} rotate-45 cursor-pointer hover:scale-110 transition-transform shadow-sm z-10`}
        style={{ left: barPosition.left }}
        onClick={onClick}
        title={label}
      />
    );
  }

  if (barPosition.type === 'rolling') {
    return (
      <div
        className="absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer hover:opacity-80 transition-opacity z-10"
        style={{ 
          left: barPosition.left, 
          width: barPosition.width,
          background: `repeating-linear-gradient(90deg, ${colorHex}, ${colorHex} 6px, ${colorHex}dd 6px, ${colorHex}dd 12px)`
        }}
        onClick={onClick}
        title={label}
      >
        <span className="text-[10px] text-white px-2 truncate block leading-6">{label}</span>
      </div>
    );
  }

  // duration
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 h-6 ${colorClass} rounded cursor-pointer hover:opacity-80 transition-opacity shadow-sm z-10`}
      style={{ left: barPosition.left, width: barPosition.width }}
      onClick={onClick}
      title={label}
    >
      <span className="text-[10px] text-white px-2 truncate block leading-6">{label}</span>
    </div>
  );
}