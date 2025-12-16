import React from 'react';
import { format, startOfWeek, addDays, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";

import LeaveCell from "./LeaveCell";
import CalendarHeader from "./CalendarHeader";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function WeekCalendarTable({
              currentDate,
              onDateChange,
              currentEmployee,
              currentDepartments,
              leaveRecords,
              leaveTypes,
              holidays,
              selectedLeaveTypeId,
              rangeMode = false,
              dateRange = { from: undefined, to: undefined },
              onUpdateLeave,
              onDeleteLeave,
              onDeleteRangeLeave,
              onCellClickInRangeMode
            }) {
  if (!currentEmployee || !currentDepartments || currentDepartments.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500">請先設定您的個人資料</p>
      </div>
    );
  }
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Generate all days in the selected period
  const allDays = month === -1 
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
          isHoliday,
          fullDate: date
        };
      })
    : Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => {
        const date = new Date(year, month, i + 1);
        const dayOfWeek = getDay(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        const isHoliday = holidays?.some(h => h.date === dateStr);
        return {
          day: i + 1,
          month: month + 1,
          date: dateStr,
          weekday: WEEKDAY_NAMES[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isHoliday,
          fullDate: date
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

  const handleDoubleClickLeave = (record) => {
    if (onDeleteRangeLeave) {
      onDeleteRangeLeave(record);
    }
  };

  // 将日期按周分组，每周从周日开始
  const weeks = [];
  const firstDayOfMonth = allDays[0];
  const startDayOfWeek = getDay(firstDayOfMonth.fullDate); // 0=周日, 1=周一, ...
  
  // 填充第一周前面的空格
  let currentWeek = Array(startDayOfWeek).fill(null);
  
  allDays.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });
  
  // 填充最后一周后面的空格
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">{currentEmployee.name}</h3>
        <CalendarHeader 
          currentDate={currentDate} 
          onDateChange={onDateChange}
        />
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
          {/* 星期標題 */}
          {WEEKDAY_NAMES.map((day, idx) => (
            <div 
              key={idx} 
              className={`py-2 text-center text-sm font-semibold border-b border-gray-200 ${
                idx === 0 || idx === 6 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}
          
          {/* 日期格子 */}
          {weeks.map((week, weekIdx) => (
            week.map((day, dayIdx) => {
              if (!day) {
                return (
                  <div 
                    key={`${weekIdx}-${dayIdx}`} 
                    className="h-16 border-r border-b border-gray-200 bg-gray-50"
                  />
                );
              }
              
              const record = getLeaveRecord(currentEmployee.id, day.date);
              const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
              return (
                <div 
                  key={`${weekIdx}-${dayIdx}`} 
                  className={`h-16 border-r border-b flex flex-col ${isToday ? 'border-2 border-red-500' : 'border-gray-200'}`}
                >
                  <div className={`px-1 py-0.5 text-xs font-semibold ${
                    day.isHoliday || day.isWeekend ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    {day.day}
                  </div>
                  <div className="flex-1 flex items-center justify-center p-0.5">
                    <LeaveCell
                      record={record}
                      leaveTypes={leaveTypes}
                      selectedLeaveTypeId={selectedLeaveTypeId}
                      isWeekend={day.isWeekend}
                      isHoliday={day.isHoliday}
                      rangeMode={rangeMode}
                      dateRange={dateRange}
                      currentDate={day.date}
                      onSelectLeave={(leaveTypeId) => handleSelectLeave(currentEmployee.id, day.date, leaveTypeId)}
                      onClearLeave={() => record && handleClearLeave(record.id)}
                      onDoubleClickLeave={() => record && handleDoubleClickLeave(record)}
                      onRangeCellClick={() => rangeMode && onCellClickInRangeMode(day.date)}
                    />
                  </div>
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
}