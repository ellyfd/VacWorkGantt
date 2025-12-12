import React from 'react';
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CalendarRange, GripVertical } from "lucide-react";
import LeaveCell from "./LeaveCell";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function LeaveCalendarTable({
  currentDate,
  departments,
  employees,
  leaveRecords,
  leaveTypes,
  holidays,
  onUpdateLeave,
  onDeleteLeave,
  onOpenRangeDialog,
  onReorderEmployees
}) {
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
    onUpdateLeave(employeeId, date, leaveTypeId);
  };

  const handleClearLeave = (recordId) => {
    onDeleteLeave(recordId);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const departmentId = result.source.droppableId;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    onReorderEmployees(departmentId, sourceIndex, destinationIndex);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 min-w-[80px]">
                部門
              </th>
              <th className="sticky left-[80px] z-20 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 min-w-[100px]">
                姓名
              </th>
              <th className="sticky left-[180px] z-20 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 min-w-[60px]">
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
            return (
              <Droppable key={dept.id} droppableId={dept.id}>
                {(provided) => (
                  <React.Fragment>
                    <tr ref={provided.innerRef} style={{ display: 'none' }}>
                      <td></td>
                    </tr>
                    {deptEmployees.map((emp, empIdx) => (
                      <Draggable key={emp.id} draggableId={emp.id} index={empIdx}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`hover:bg-gray-50/50 ${snapshot.isDragging ? 'bg-blue-50' : ''}`}
                          >
                            {empIdx === 0 && (
                              <td 
                                className="sticky left-0 z-10 bg-white px-3 py-1 text-sm font-medium text-gray-700 border-r border-b border-gray-200"
                                rowSpan={deptEmployees.length}
                              >
                                {dept.name}
                              </td>
                            )}
                            <td className="sticky left-[80px] z-10 bg-white px-2 py-1 text-sm text-gray-800 border-r border-b border-gray-200">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1">
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <span>{emp.name}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                  onClick={() => onOpenRangeDialog(emp)}
                                  title="區間請假/取消"
                                >
                                  <CalendarRange className="h-3 w-3 text-blue-600" />
                                </Button>
                              </div>
                            </td>
                            <td className="sticky left-[180px] z-10 bg-white px-3 py-1 text-xs text-gray-500 border-r border-b border-gray-200">
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
                        )}
                      </Draggable>
                    ))}
                    <tr style={{ display: 'none' }}>
                      <td>{provided.placeholder}</td>
                    </tr>
                  </React.Fragment>
                )}
              </Droppable>
            );
          })}
        </tbody>
      </table>
      </div>
    </DragDropContext>
      );
      }