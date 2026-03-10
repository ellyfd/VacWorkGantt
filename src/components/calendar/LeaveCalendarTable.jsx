import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format, getDaysInMonth, getDay } from "date-fns";
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

  const selectedLeaveTypeIdRef = useRef(selectedLeaveTypeId);
  useEffect(() => {
    selectedLeaveTypeIdRef.current = selectedLeaveTypeId;
  }, [selectedLeaveTypeId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const holidaySet = useMemo(() => new Set(holidays?.map(h => h.date) || []), [holidays]);

  const days = useMemo(() => month === -1
    ? Array.from({ length: 365 }, (_, i) => {
        const date = new Date(year, 0, i + 1);
        const dayOfWeek = getDay(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
          day: date.getDate(),
          month: date.getMonth() + 1,
          date: dateStr,
          weekday: WEEKDAY_NAMES[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isHoliday: holidaySet.has(dateStr)
        };
      })
    : Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
        const date = new Date(year, month, i + 1);
        const dayOfWeek = getDay(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
          day: i + 1,
          date: dateStr,
          weekday: WEEKDAY_NAMES[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isHoliday: holidaySet.has(dateStr)
        };
      }),
  [year, month, currentDate, holidaySet]);

  // 一個 key 可存多筆（full / AM / PM）
  const leaveRecordMap = useMemo(() => {
    const map = new Map();
    leaveRecords.forEach(r => {
      console.log('record from API:', r.date, r.period);
      const key = `${r.employee_id}_${r.date}`;
      if (!map.has(key)) map.set(key, { full: null, AM: null, PM: null });
      const period = r.period || 'full';
      map.get(key)[period] = r;
    });
    return map;
  }, [leaveRecords]);

  const getLeaveRecords = useCallback((employeeId, date) => {
    return leaveRecordMap.get(`${employeeId}_${date}`) || { full: null, AM: null, PM: null };
  }, [leaveRecordMap]);

  const employeesToShow = useMemo(() => {
    const result = [];
    const seenIds = new Set();
    departments.forEach((dept) => {
      const deptEmployees = employees
        .filter(e => e.department_ids?.includes(dept.id))
        .sort((a, b) => (a.sort_order_by_dept?.[dept.id] || 999999) - (b.sort_order_by_dept?.[dept.id] || 999999));
      deptEmployees.forEach(emp => {
        if (!seenIds.has(emp.id)) {
          seenIds.add(emp.id);
          result.push(emp);
        }
      });
    });
    return result;
  }, [departments, employees]);

  const clickTimerRef = useRef(null);

  const handleCellClick = useCallback((employeeId, date, records) => {
    const targetRecord = records.full || records.AM || records.PM;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (targetRecord && !rangeMode) onDeleteRangeLeave(targetRecord);
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (rangeMode && onCellClickInRangeMode) {
        onCellClickInRangeMode(employeeId, date);
      } else if (selectedLeaveTypeIdRef.current) {
        onUpdateLeave(employeeId, date, selectedLeaveTypeIdRef.current);
      }
    }, 250);
  }, [rangeMode, onCellClickInRangeMode, onUpdateLeave, onDeleteRangeLeave]);

  const handleClearLeave = useCallback((recordId) => {
    if (!rangeMode) onDeleteLeave(recordId);
  }, [rangeMode, onDeleteLeave]);

  return (
    <div className="bg-white w-full">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
        <table className="border-collapse w-full" style={{ minWidth: `${Math.max(days.length * 28 + 70, 600)}px` }}>
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-40 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 w-auto min-w-[90px] max-w-[140px] whitespace-nowrap">
                姓名
              </th>
              {days.map((d, idx) => (
                <th
                  key={idx}
                  onDoubleClick={() => {
                    setHighlightedDate(highlightedDate === d.date ? null : d.date);
                    setHighlightedEmployeeId(null);
                  }}
                  className={`px-0.5 py-0.5 text-center border-r border-b border-gray-200 min-w-[28px] md:min-w-[42px] h-8 cursor-pointer select-none ${
                    d.isHoliday || d.isWeekend ? 'bg-gray-100 text-red-500' :
                    highlightedDate === d.date ? 'bg-amber-100' : 'text-gray-600'
                  }`}
                >
                  <div className="text-[13px] font-medium text-gray-800">{d.month ? `${d.month}/${d.day}` : d.day}</div>
                  <div className="text-[10px] text-gray-400">{d.weekday}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employeesToShow.map((emp) => {
              const isCurrentUser = currentEmployeeId && emp.id === currentEmployeeId;
              return (
                <tr key={emp.id} className={highlightedEmployeeId === emp.id ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                  <td
                    onDoubleClick={() => {
                      setHighlightedEmployeeId(highlightedEmployeeId === emp.id ? null : emp.id);
                      setHighlightedDate(null);
                    }}
                    className={`sticky left-0 z-10 px-2 py-1 w-auto min-w-[90px] max-w-[140px] whitespace-nowrap border-r border-b border-gray-200 cursor-pointer select-none ${
                      highlightedEmployeeId === emp.id ? 'bg-amber-100' :
                      isCurrentUser ? 'bg-amber-50' : 'bg-white'
                    }`}
                  >
                    <div className="leading-[1.1]">
                      <div className="text-[12px] sm:text-[13px] font-semibold text-gray-800 truncate">{emp.name}</div>
                      {emp.english_name && (
                        <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">{emp.english_name}</div>
                      )}
                    </div>
                  </td>
                  {days.map((d, idx) => {
                    const records = getLeaveRecords(emp.id, d.date);
                    return (
                      <td key={idx} className="p-0 border-r border-b border-gray-200 h-10 min-w-[28px] md:min-w-[42px]">
                        <LeaveCell
                          fullRecord={records.full}
                          amRecord={records.AM}
                          pmRecord={records.PM}
                          leaveTypes={leaveTypes}
                          isWeekend={d.isWeekend}
                          isHoliday={d.isHoliday}
                          isCurrentUser={isCurrentUser}
                          rangeMode={rangeMode && selectedEmployeeId === emp.id}
                          dateRange={dateRange}
                          currentDate={d.date}
                          isHighlighted={highlightedEmployeeId === emp.id || highlightedDate === d.date}
                          onSelectLeave={() => handleCellClick(emp.id, d.date, records)}
                          onClearLeave={handleClearLeave}
                          onDoubleClickLeave={(record) => !rangeMode && onDeleteRangeLeave(record)}
                          onRangeCellClick={() => rangeMode && onCellClickInRangeMode && onCellClickInRangeMode(emp.id, d.date)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}