import React from 'react';

export default function LeaveCell({ 
        record, 
        leaveTypes,
        selectedLeaveTypeId,
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

  const cellBgClass = isHighlighted
    ? "bg-blue-100"
    : (isHoliday || isWeekend) 
    ? "bg-gray-200" 
    : isCurrentUser 
    ? "bg-yellow-100" 
    : "bg-white";

  // 檢查是否在選中的區間內
  const isInRange = rangeMode && dateRange.from && dateRange.to && 
    currentDate >= dateRange.from && currentDate <= dateRange.to;
  const isRangeStart = rangeMode && currentDate === dateRange.from;
  const isRangeEnd = rangeMode && currentDate === dateRange.to;

  const handleClick = (e) => {
    if (rangeMode) {
      onRangeCellClick();
    } else if (selectedLeaveTypeId) {
      onSelectLeave(selectedLeaveTypeId);
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
      className={`w-full h-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-all text-xs font-medium ${!record ? cellBgClass : ''} ${
        isInRange ? 'ring-2 ring-inset ring-blue-500' : ''
      } ${isRangeStart || isRangeEnd ? 'ring-4 ring-blue-600' : ''}`}
      style={record && leaveType ? { backgroundColor: leaveType.color, color: '#fff' } : (isInRange && !record ? { backgroundColor: '#dbeafe' } : {})}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {record && leaveType ? leaveType.short_name : ''}
    </div>
  );
}