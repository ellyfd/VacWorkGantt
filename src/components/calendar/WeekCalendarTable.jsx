import React from 'react';
import { format, startOfWeek, addDays, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";
import LeaveCell from "./LeaveCell";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function WeekCalendarTable({
  currentDate,
  currentEmployee,
  currentDepartment,
  leaveRecords,
  leaveTypes,
  holidays,
  onUpdateLeave,
  onDeleteLeave,
  onOpenRangeDialog
}) {
  if (!currentEmployee || !currentDepartment) {
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

  // Group days by week
  const weeks = [];
  let currentWeek = [];
  let weekStart = null;

  allDays.forEach((day, index) => {
    if (currentWeek.length === 0) {
      weekStart = startOfWeek(day.fullDate, { weekStartsOn: 0 });
    }
    
    currentWeek.push(day);
    
    if (getDay(day.fullDate) === 6 || index === allDays.length - 1) {
      weeks.push({
        days: [...currentWeek],
        weekStart: weekStart
      });
      currentWeek = [];
    }
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
    <div className="space-y-4">
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700">
              第 {weekIdx + 1} 週
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 w-24">
                    部門
                  </th>
                  <th className="sticky left-24 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 w-20">
                    姓名
                  </th>
                  {week.days.map((d, idx) => (
                    <th 
                      key={idx} 
                      className={`px-1 py-2 text-center text-xs font-semibold border-r border-b border-gray-200 min-w-[48px] ${
                        d.isHoliday || d.isWeekend ? 'bg-red-50 text-red-600' : 'text-gray-600'
                      }`}
                    >
                      <div className="text-[10px]">{d.month}/{d.day}</div>
                      <div className="text-xs font-medium">{d.weekday}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50/50">
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 text-xs font-medium text-gray-700 border-r border-b border-gray-200">
                    {currentDepartment.name}
                  </td>
                  <td className="sticky left-24 z-10 bg-white px-2 py-2 text-xs text-gray-800 border-r border-b border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>{currentEmployee.name}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 shrink-0 bg-blue-50 hover:bg-blue-100 border-blue-200"
                        onClick={() => onOpenRangeDialog(currentEmployee)}
                        title="區間請假"
                      >
                        <CalendarRange className="h-2.5 w-2.5 text-blue-600" />
                      </Button>
                    </div>
                  </td>
                  {week.days.map((d, idx) => {
                    const record = getLeaveRecord(currentEmployee.id, d.date);
                    return (
                      <td key={idx} className="p-0 border-r border-b border-gray-200">
                        <LeaveCell
                          record={record}
                          leaveTypes={leaveTypes}
                          isWeekend={d.isWeekend}
                          isHoliday={d.isHoliday}
                          onSelectLeave={(leaveTypeId) => handleSelectLeave(currentEmployee.id, d.date, leaveTypeId)}
                          onClearLeave={() => record && handleClearLeave(record.id)}
                        />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}