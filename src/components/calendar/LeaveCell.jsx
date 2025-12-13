import React from 'react';

export default function LeaveCell({ 
        record, 
        leaveTypes,
        selectedLeaveTypeId,
        onSelectLeave, 
        onClearLeave,
        onDoubleClickLeave,
        isWeekend,
        isHoliday 
      }) {
  const leaveType = record ? leaveTypes.find(lt => lt.id === record.leave_type_id) : null;

  const cellBgClass = (isHoliday || isWeekend) 
    ? "bg-gray-200" 
    : "bg-white";

  const handleClick = (e) => {
    if (!selectedLeaveTypeId) return;
    onSelectLeave(selectedLeaveTypeId);
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
      className={`w-full h-full min-h-[32px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-all text-xs font-medium ${!record ? cellBgClass : ''}`}
      style={record && leaveType ? { backgroundColor: leaveType.color, color: '#fff' } : {}}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {record && leaveType ? leaveType.short_name : ''}
    </div>
  );
}