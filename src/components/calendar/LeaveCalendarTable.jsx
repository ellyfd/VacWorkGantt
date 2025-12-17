import React from 'react';
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";

import LeaveCell from "./LeaveCell";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function LeaveCalendarTable({
  currentDate,
  departments,
  employees,
  leaveRecords,
  leaveTypes,
  holidays,
  selectedLeaveTypeId,
  rangeMode = false,
  dateRange = { from: undefined, to: undefined },
  selectedEmployeeId,
  currentEmployeeId,
  onUpdateLeave,
  onDeleteLeave,
  onDeleteRangeLeave,
  onCellClickInRangeMode
}) {
  const [highlightedEmployeeId, setHighlightedEmployeeId] = React.useState(null);
  const [highlightedDate, setHighlightedDate] = React.useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const days = month === -1 
    ? Array.from({ length: 365 }, (_, i) => {
        const date = new Date(year, 0, i + 1);
        const dayOfWeek = getDay(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        const isHoliday = holidays?.some(h => h.date === dateStr);
        return {
          day: date.getDate(),
          month: date.getMonth() + 1,
          date: dateStr,
          weekday: WEEKDAY_NAMES[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isHoliday
        };
      })
    : Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
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
    if (rangeMode && onCellClickInRangeMode) {
      onCellClickInRangeMode(employeeId, date);
    } else {
      onUpdateLeave(employeeId, date, leaveTypeId);
    }
  };

  const handleClearLeave = (recordId) => {
    if (!rangeMode) {
      onDeleteLeave(recordId);
    }
  };

  const handleDoubleClickLeave = (record) => {
    if (!rangeMode && onDeleteRangeLeave) {
      onDeleteRangeLeave(record);
    }
  };



  return (
    <div className="relative bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-auto max-h-[calc(100vh-280px)]" style={{ overflowX: 'auto', overflowY: 'auto' }}>
        <table className="w-[2000px]">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-40 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 min-w-[70px]">
                姓名
              </th>
            {days.map((d, idx) => (
              <th 
                key={idx} 
                onDoubleClick={() => {
                  setHighlightedDate(highlightedDate === d.date ? null : d.date);
                  setHighlightedEmployeeId(null);
                }}
                className={`px-0.5 py-0.5 text-center text-xs font-semibold border-r border-b border-gray-200 min-w-[28px] h-8 cursor-pointer select-none ${
                  d.isHoliday || d.isWeekend ? 'bg-gray-300 text-red-500' : 
                  highlightedDate === d.date ? 'bg-yellow-200' : 'text-gray-600'
                }`}
              >
                <div>{d.month ? `${d.month}/${d.day}` : d.day}</div>
                <div className="text-[10px] font-normal">{d.weekday}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(() => {
            // 收集所有應顯示的員工（來自被選中的部門）
            const employeesToShow = [];
            const seenEmployeeIds = new Set();

            departments.forEach((dept) => {
              const deptEmployees = employees
                .filter(e => e.department_ids?.includes(dept.id))
                .sort((a, b) => {
                  const orderA = a.sort_order_by_dept?.[dept.id] || 999999;
                  const orderB = b.sort_order_by_dept?.[dept.id] || 999999;
                  return orderA - orderB;
                });
              deptEmployees.forEach(emp => {
                if (!seenEmployeeIds.has(emp.id)) {
                  seenEmployeeIds.add(emp.id);
                  employeesToShow.push(emp);
                }
              });
            });
            
            return employeesToShow.map((emp) => {
              const isCurrentUser = currentEmployeeId && emp.id === currentEmployeeId;
              return (
                <tr key={emp.id} className={highlightedEmployeeId === emp.id ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                        <td 
                          onDoubleClick={() => {
                            setHighlightedEmployeeId(highlightedEmployeeId === emp.id ? null : emp.id);
                            setHighlightedDate(null);
                          }}
                          className={`sticky left-0 z-10 px-1 py-1 text-xs text-gray-800 border-r border-b border-gray-200 cursor-pointer select-none ${
                            highlightedEmployeeId === emp.id ? 'bg-yellow-200' :
                            isCurrentUser ? 'bg-yellow-100' : 'bg-white'
                          }`}
                        >
                          <div>{emp.name}</div>
                          <div className="text-[10px] text-gray-500">{emp.english_name || ''}</div>
                        </td>
                  {days.map((d, idx) => {
                    const record = getLeaveRecord(emp.id, d.date);
                    const isInRangeSelection = rangeMode && selectedEmployeeId === emp.id && 
                      dateRange.from && dateRange.to && 
                      d.date >= dateRange.from && d.date <= dateRange.to;
                    return (
                      <td key={idx} className="p-0 border-r border-b border-gray-200 h-9">
                        <LeaveCell
                          record={record}
                          leaveTypes={leaveTypes}
                          selectedLeaveTypeId={selectedLeaveTypeId}
                          isWeekend={d.isWeekend}
                          isHoliday={d.isHoliday}
                          isCurrentUser={isCurrentUser}
                          rangeMode={rangeMode && selectedEmployeeId === emp.id}
                          dateRange={dateRange}
                          currentDate={d.date}
                          isHighlighted={highlightedEmployeeId === emp.id || highlightedDate === d.date}
                          onSelectLeave={(leaveTypeId) => handleSelectLeave(emp.id, d.date, leaveTypeId)}
                          onClearLeave={() => record && handleClearLeave(record.id)}
                          onDoubleClickLeave={() => record && handleDoubleClickLeave(record)}
                          onRangeCellClick={() => rangeMode && onCellClickInRangeMode && onCellClickInRangeMode(emp.id, d.date)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            });
          })()}
        </tbody>
        </table>
        </div>
        </div>
        );
        }