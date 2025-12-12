import React, { useState } from 'react';
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";
import LeaveCell from "./LeaveCell";
import RangeLeaveDialog from "./RangeLeaveDialog";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function LeaveCalendarTable({
  selectedYears,
  selectedMonths,
  departments,
  employees,
  leaveRecords,
  leaveTypes,
  holidays,
  onUpdateLeave,
  onDeleteLeave,
  onRangeLeave
}) {
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const days = [];
  selectedYears.forEach(year => {
    if (selectedMonths.length === 0) {
      for (let i = 0; i < 365; i++) {
        const date = new Date(year, 0, i + 1);
        if (date.getFullYear() !== year) break;
        const dayOfWeek = getDay(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        const isHoliday = holidays?.some(h => h.date === dateStr);
        days.push({
          day: date.getDate(),
          month: date.getMonth() + 1,
          date: dateStr,
          weekday: WEEKDAY_NAMES[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isHoliday
        });
      }
    } else {
      selectedMonths.forEach(month => {
        const daysInMonth = getDaysInMonth(new Date(year, month));
        for (let i = 0; i < daysInMonth; i++) {
          const date = new Date(year, month, i + 1);
          const dayOfWeek = getDay(date);
          const dateStr = format(date, 'yyyy-MM-dd');
          const isHoliday = holidays?.some(h => h.date === dateStr);
          days.push({
            day: i + 1,
            month: month + 1,
            date: dateStr,
            weekday: WEEKDAY_NAMES[dayOfWeek],
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            isHoliday
          });
        }
      });
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

  const handleOpenRangeDialog = (employee) => {
    setSelectedEmployee(employee);
    setRangeDialogOpen(true);
  };

  const handleRangeSubmit = async (employeeId, startDate, endDate, leaveTypeId) => {
    setIsSubmitting(true);
    await onRangeLeave(employeeId, startDate, endDate, leaveTypeId);
    setIsSubmitting(false);
    setRangeDialogOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <>
      <RangeLeaveDialog
        isOpen={rangeDialogOpen}
        onClose={() => {
          setRangeDialogOpen(false);
          setSelectedEmployee(null);
        }}
        onSubmit={handleRangeSubmit}
        leaveTypes={leaveTypes}
        employeeId={selectedEmployee?.id}
        employeeName={selectedEmployee?.name}
        isSubmitting={isSubmitting}
      />
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
            {days.map((d, idx) => (
              <th 
                key={idx} 
                className={`px-1 py-2 text-center text-xs font-semibold border-r border-b border-gray-200 min-w-[32px] ${
                  d.isHoliday || d.isWeekend ? 'bg-gray-300 text-red-500' : 'text-gray-600'
                }`}
              >
                <div>{d.month ? `${d.month}/${d.day}` : d.day}</div>
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
                  <div className="flex items-center justify-between gap-1">
                    <span>{emp.name}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 bg-blue-50 hover:bg-blue-100 border-blue-200"
                      onClick={() => handleOpenRangeDialog(emp)}
                      title="區間請假"
                    >
                      <CalendarRange className="h-3 w-3 text-blue-600" />
                    </Button>
                  </div>
                </td>
                <td className="sticky left-[160px] z-10 bg-white px-3 py-1 text-xs text-gray-500 border-r border-b border-gray-200">
                  {emp.code || '-'}
                </td>
                {days.map((d, idx) => {
                  const record = getLeaveRecord(emp.id, d.date);
                  return (
                    <td key={idx} className="p-0">
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
    </>
  );
}