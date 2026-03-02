import React from 'react';

function LeaveCell({ 
  record, 
  leaveTypes,
  onSelectLeave, 
  onClearLeave,
  onDoubleClickLeave,
  isWeekend,
  isHoliday,
  isCurrentUser = false,
  rangeMode = false,
  dateRange = { from: undefined, to: undefined },
  currentDate,
  onRangeCellClick,
  isHighlighted = false
}) {
  const leaveType = record ? leaveTypes.find(lt => lt.id === record.leave_type_id) : null;

  const cellBgClass = (isHoliday || isWeekend) 
    ? "bg-gray-50" 
    : isHighlighted
    ? "bg-amber-50"
    : isCurrentUser 
    ? "bg-amber-50" 
    : "bg-white";

  const isInRange = rangeMode && dateRange.from && dateRange.to && 
    currentDate >= dateRange.from && currentDate <= dateRange.to;
  const isRangeStart = rangeMode && currentDate === dateRange.from;
  const isRangeEnd = rangeMode && currentDate === dateRange.to;

  const handleClick = () => {
    if (rangeMode) {
      onRangeCellClick();
    } else {
      onSelectLeave();
    }
  };

  const handleDoubleClick = (e) => {
    if (record) {
      e.preventDefault();
      e.stopPropagation();
      if (onDoubleClickLeave) {
        onDoubleClickLeave();
      } else {
        onClearLeave();
      }
    }
  };

  return (
    <div 
      className={`w-full h-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-all text-[12px] font-medium ${!record ? cellBgClass : ''} ${
        isInRange ? 'ring-1 ring-inset ring-blue-400' : ''
      } ${isRangeStart || isRangeEnd ? 'ring-2 ring-blue-500' : ''}`}
      style={record && leaveType ? { backgroundColor: leaveType.color, color: '#fff' } : (isInRange && !record ? { backgroundColor: '#dbeafe' } : {})}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {record && leaveType ? (
        <span className={`${leaveType.name === '午休' || leaveType.name === '半天假' ? 'font-semibold' : ''}`}>
          {leaveType.short_name}
        </span>
      ) : ''}
    </div>
  );
}

export default React.memo(LeaveCell);