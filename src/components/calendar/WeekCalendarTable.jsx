import React from 'react';
import { format, startOfWeek, addDays, getDay, endOfWeek } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
              viewMode = 'month',
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

  // Generate all days based on view mode
  let allDays = [];

  if (viewMode === 'week') {
    // Week view: show only one week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    allDays = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
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
    });
  } else {
    // Month view: show whole month/year
    allDays = month === -1 
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
  }



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

  if (viewMode === 'week') {
    // Week view: single row of 7 days
    weeks.push(allDays);
  } else {
    // Month view: multiple weeks
    const firstDayOfMonth = allDays[0];
    const startDayOfWeek = getDay(firstDayOfMonth.fullDate);

    let currentWeek = Array(startDayOfWeek).fill(null);

    allDays.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
  }

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">{currentEmployee.name}</h3>
        {viewMode === 'week' ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy年MM月dd日')} - {format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'MM月dd日')}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <CalendarHeader 
            currentDate={currentDate} 
            onDateChange={onDateChange}
          />
        )}
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
          {/* 星期標題 */}
          {WEEKDAY_NAMES.map((day, idx) => (
            <div 
              key={idx} 
              className={`py-1 text-center text-sm font-semibold border-b border-gray-200 ${
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
                   className="h-12 border-r border-b border-gray-200 bg-gray-50"
                 />
                );
                }

                const record = getLeaveRecord(currentEmployee.id, day.date);
                const today = format(new Date(), 'yyyy-MM-dd');
                const isToday = day.date === today;
                return (
                  <div 
                    key={`${weekIdx}-${dayIdx}`} 
                    className={`h-12 border-r border-b border-gray-200 relative ${
                      isToday ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    {isToday && (
                      <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none z-10"></div>
                    )}
                    <div className={`absolute top-0.5 left-1 text-[10px] font-semibold leading-none z-20 ${
                      isToday ? 'text-blue-600' : day.isHoliday || day.isWeekend ? 'text-red-600' : 'text-gray-700'
                    }`}>
                      {day.day}
                    </div>
                    {isToday && (
                      <div className="absolute top-0.5 right-1 text-[8px] font-bold text-blue-600 leading-none z-20">今</div>
                    )}
                    <div className="w-full h-full flex items-center justify-center">
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