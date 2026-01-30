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
  onClick,
  label
}) {
  if (!days || days.length === 0) return null;

  const getBarPosition = () => {
    const cellWidth = 28;
    
    if (timeType === 'milestone' && date) {
      const dayIndex = days.findIndex(d => d.date === date);
      if (dayIndex >= 0) {
        return { left: dayIndex * cellWidth + 4, width: 20, type: 'milestone' };
      }
    }
    
    if ((timeType === 'duration' || timeType === 'rolling') && startDate) {
      const startIdx = days.findIndex(d => d.date >= startDate);
      const endIdx = endDate 
        ? days.findIndex(d => d.date > endDate) - 1
        : days.length - 1;
      
      const effectiveStartIdx = startIdx >= 0 ? startIdx : 0;
      const effectiveEndIdx = endIdx >= 0 ? endIdx : days.length - 1;
      
      if (effectiveStartIdx <= effectiveEndIdx) {
        return { 
          left: effectiveStartIdx * cellWidth + 2, 
          width: (effectiveEndIdx - effectiveStartIdx + 1) * cellWidth - 4,
          type: timeType
        };
      }
    }
    
    return null;
  };

  const barPosition = getBarPosition();
  if (!barPosition) return null;

  const baseColor = STATUS_COLORS[status] || STATUS_COLORS.pending;

  if (barPosition.type === 'milestone') {
    return (
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${baseColor} rotate-45 cursor-pointer hover:scale-110 transition-transform shadow-sm`}
        style={{ left: barPosition.left }}
        onClick={onClick}
        title={label}
      />
    );
  }

  if (barPosition.type === 'rolling') {
    return (
      <div
        className="absolute top-1/2 -translate-y-1/2 h-5 rounded cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
        style={{ 
          left: barPosition.left, 
          width: barPosition.width,
          background: `repeating-linear-gradient(90deg, ${status === 'done' ? '#22c55e' : status === 'progress' ? '#3b82f6' : '#9ca3af'}, ${status === 'done' ? '#22c55e' : status === 'progress' ? '#3b82f6' : '#9ca3af'} 6px, ${status === 'done' ? '#16a34a' : status === 'progress' ? '#2563eb' : '#6b7280'} 6px, ${status === 'done' ? '#16a34a' : status === 'progress' ? '#2563eb' : '#6b7280'} 12px)`
        }}
        onClick={onClick}
        title={label}
      >
        <span className="text-[10px] text-white px-1 truncate block leading-5">{label}</span>
      </div>
    );
  }

  // duration
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 h-5 ${baseColor} rounded cursor-pointer hover:opacity-80 transition-opacity shadow-sm`}
      style={{ left: barPosition.left, width: barPosition.width }}
      onClick={onClick}
      title={label}
    >
      <span className="text-[10px] text-white px-1 truncate block leading-5">{label}</span>
    </div>
  );
}