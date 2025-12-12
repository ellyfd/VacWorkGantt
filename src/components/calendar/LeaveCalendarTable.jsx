import React from 'react';
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import LeaveCell from "./LeaveCell";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function LeaveCalendarTable({
  currentDate,
  departments,
  employees,
  leaveRecords,
  leaveTypes,
  holidays,
  onUpdateLeave,
  onDeleteLeave
}) {
  const daysInMonth = getDaysInMonth(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const dayOfWeek = getDay(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const isHoliday = holidays?.some(h => h.date === dateStr);
    return {
      day: i + 1,
      date: dateStr,
      weekday: WEEKDAY_NAMES[dayOfWeek],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday
    };
  });

  const getLeaveRecord = (employeeId, date) => {
    return leaveRecords.find(
      r => r.employee_id === employeeId && r.date === date
    );
  };

  const handleSelectLeave = (employeeId, date, leaveTypeId) => {
    onUpdateLeave(employeeId, date, leaveTypeId);
  };

  const handleClearLeave = (recordId) => {
    onDeleteLeave(recordId);
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 min-w-[80px]">
              部門
            </th>
            <th className="sticky left-[80px] z-20 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 min-w-[80px]">
              姓名
            </th>
            <th className="sticky left-[160px] z-20 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 min-w-[60px]">
              職代
            </th>
            {days.map((d) => (
              <th 
                key={d.day} 
                className={`px-1 py-2 text-center text-xs font-semibold border-r border-b border-gray-200 min-w-[32px] ${
                  d.isHoliday || d.isWeekend ? 'bg-gray-300 text-red-500' : 'text-gray-600'
                }`}
              >
                <div>{d.day}</div>
                <div className="text-[10px] font-normal">{d.weekday}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => {
            const deptEmployees = employees.filter(e => e.department_id === dept.id);
            return deptEmployees.map((emp, empIdx) => (
              <tr key={emp.id} className="hover:bg-gray-50/50">
                {empIdx === 0 && (
                  <td 
                    className="sticky left-0 z-10 bg-white px-3 py-1 text-sm font-medium text-gray-700 border-r border-b border-gray-200"
                    rowSpan={deptEmployees.length}
                  >
                    {dept.name}
                  </td>
                )}
                <td className="sticky left-[80px] z-10 bg-white px-3 py-1 text-sm text-gray-800 border-r border-b border-gray-200">
                  {emp.name}
                </td>
                <td className="sticky left-[160px] z-10 bg-white px-3 py-1 text-xs text-gray-500 border-r border-b border-gray-200">
                  {emp.code || '-'}
                </td>
                {days.map((d) => {
                  const record = getLeaveRecord(emp.id, d.date);
                  return (
                    <td key={d.day} className="p-0">
                      <LeaveCell
                        record={record}
                        leaveTypes={leaveTypes}
                        isWeekend={d.isWeekend}
                        isHoliday={d.isHoliday}
                        onSelectLeave={(leaveTypeId) => handleSelectLeave(emp.id, d.date, leaveTypeId)}
                        onClearLeave={() => record && handleClearLeave(record.id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}