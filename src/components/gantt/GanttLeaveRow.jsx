import React from 'react';

export default function GanttLeaveRow({
  employees,
  leaveRecords,
  leaveTypes,
  holidays,
  days,
  selectedDepartmentIds = []
}) {
  // 篩選要顯示的員工
  const filteredEmployees = selectedDepartmentIds.length > 0
    ? employees.filter(emp => 
        emp.department_ids?.some(dId => selectedDepartmentIds.includes(dId))
      )
    : employees;

  const getLeaveRecord = (employeeId, date) => {
    return leaveRecords.find(
      r => r.employee_id === employeeId && r.date === date
    );
  };

  const getLeaveType = (leaveTypeId) => {
    return leaveTypes.find(lt => lt.id === leaveTypeId);
  };

  const isHoliday = (date) => {
    return holidays?.some(h => h.date === date);
  };

  if (filteredEmployees.length === 0) return null;

  return (
    <div className="border-b-2 border-gray-300 bg-gray-50">
      <div className="text-xs text-gray-500 px-2 py-1 border-b border-gray-200 font-medium">
        團隊休假狀態
      </div>
      {filteredEmployees.slice(0, 10).map((emp) => (
        <div key={emp.id} className="flex border-b border-gray-100 h-7">
          {/* 員工名稱 */}
          <div className="w-[180px] min-w-[180px] px-2 flex items-center text-xs text-gray-600 border-r border-gray-200 bg-white sticky left-0 z-10">
            <span className="truncate">{emp.name}</span>
          </div>
          {/* 負責人欄位 */}
          <div className="w-[80px] min-w-[80px] border-r border-gray-200 bg-white" />
          {/* 日期格子 */}
          <div className="flex">
            {days.map((d, idx) => {
              const record = getLeaveRecord(emp.id, d.date);
              const leaveType = record ? getLeaveType(record.leave_type_id) : null;
              const isHolidayDate = isHoliday(d.date) || d.isWeekend;
              
              return (
                <div
                  key={idx}
                  className={`w-[28px] min-w-[28px] h-7 border-r border-gray-100 flex items-center justify-center ${
                    isHolidayDate ? 'bg-gray-200' : ''
                  }`}
                  style={leaveType ? { backgroundColor: leaveType.color } : {}}
                >
                  {leaveType && (
                    <span className="text-[9px] text-white font-medium">
                      {leaveType.short_name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {filteredEmployees.length > 10 && (
        <div className="text-xs text-gray-400 px-2 py-1 text-center">
          還有 {filteredEmployees.length - 10} 位員工...
        </div>
      )}
    </div>
  );
}