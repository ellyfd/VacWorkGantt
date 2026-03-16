import React from 'react';
export { getLeavePeriod } from '@/lib/leaveUtils';

function LeaveCell({
  fullRecord,
  amRecord,
  pmRecord,
  leaveTypes,
  onSelectLeave,
  onClearLeave,
  onDoubleClickLeave,
  isWeekend,
  isHoliday,
  isCurrentUser = false,
  isToday = false,
  rangeMode = false,
  dateRange = { from: undefined, to: undefined },
  currentDate,
  onRangeCellClick,
  isHighlighted = false
}) {
  const findLeaveType = (record) =>
    record ? leaveTypes.find(lt => lt.id === record.leave_type_id) : null;

  const fullLeaveType = findLeaveType(fullRecord);
  const amLeaveType   = findLeaveType(amRecord);
  const pmLeaveType   = findLeaveType(pmRecord);

  const cellBgClass = (isHoliday || isWeekend)
    ? 'bg-gray-50'
    : isHighlighted
    ? 'bg-amber-50'
    : (isCurrentUser || isToday)
    ? 'bg-amber-50'
    : 'bg-white';

  const isInRange    = rangeMode && dateRange.from && dateRange.to &&
    currentDate >= dateRange.from && currentDate <= dateRange.to;
  const isRangeStart = rangeMode && currentDate === dateRange.from;
  const isRangeEnd   = rangeMode && currentDate === dateRange.to;
  const ringClass = `${isInRange ? 'ring-1 ring-inset ring-blue-400' : ''} ${isRangeStart || isRangeEnd ? 'ring-2 ring-blue-500' : ''}`;

  const handleClick = () => {
    if (rangeMode) { onRangeCellClick(); return; }
    onSelectLeave();
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (fullRecord) {
      if (onDoubleClickLeave) onDoubleClickLeave(fullRecord);
      else onClearLeave(fullRecord.id);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    const target = isTopHalf ? amRecord : pmRecord;
    if (!target) return;
    if (onDoubleClickLeave) onDoubleClickLeave(target);
    else onClearLeave(target.id);
  };

  // ── Case 1: 整天假
  if (fullRecord && fullLeaveType) {
    return (
      <div className="w-full h-full p-[1px] sm:p-[2px]">
        <div
          className={`w-full h-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-all rounded-[2px] sm:rounded-sm text-[11px] sm:text-[12px] font-medium group relative ${ringClass}`}
          style={{ backgroundColor: fullLeaveType.color, color: '#fff' }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          title="雙擊取消請假"
        >
          <span>{fullLeaveType.short_name}</span>
          {!rangeMode && (
            <span className="hidden group-hover:flex absolute inset-0 items-center justify-center bg-black/40 text-white text-[10px] rounded-[2px] sm:rounded-sm pointer-events-none">
              雙擊取消
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Case 2: 上下分割（AM / PM 任一或兩者都有）
  if (amRecord || pmRecord) {
    return (
      <div className={`w-full h-full p-[1px] sm:p-[2px] ${cellBgClass}`}>
        <div
          className={`w-full h-full flex flex-col rounded-[2px] sm:rounded-sm overflow-hidden cursor-pointer group relative ${ringClass}`}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          title="雙擊取消請假"
        >
          {!rangeMode && (
            <span className="hidden group-hover:flex absolute inset-0 items-center justify-center bg-black/40 text-white text-[10px] rounded-[2px] sm:rounded-sm pointer-events-none z-10">
              雙擊取消
            </span>
          )}
          {/* 上半：AM */}
          <div
            className="flex-1 flex items-center justify-center text-[10px] sm:text-[11px] font-semibold hover:opacity-90 transition-all"
            style={amLeaveType ? { backgroundColor: amLeaveType.color, color: '#fff' } : {}}
          >
            {amLeaveType?.short_name || ''}
          </div>
          {/* 下半：PM */}
          <div
            className="flex-1 flex items-center justify-center text-[10px] sm:text-[11px] font-semibold hover:opacity-90 transition-all"
            style={pmLeaveType ? { backgroundColor: pmLeaveType.color, color: '#fff' } : {}}
          >
            {pmLeaveType?.short_name || ''}
          </div>
        </div>
      </div>
    );
  }

  // ── Case 3: 空格
  return (
    <div className={`w-full h-full p-[1px] sm:p-[2px] ${cellBgClass}`}>
      <div
        className={`w-full h-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-all rounded-[2px] sm:rounded-sm ${ringClass}`}
        style={isInRange ? { backgroundColor: '#dbeafe' } : {}}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
      </div>
    </div>
  );
}

export default React.memo(LeaveCell);