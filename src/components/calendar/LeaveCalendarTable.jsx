import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { format, getDaysInMonth, getDay } from "date-fns";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { buildHolidaySet, buildLeaveRecordMap } from '@/lib/leaveUtils';
import { useCellClickHandler } from '@/components/hooks/useCellClickHandler';

import LeaveCell from "./LeaveCell";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

/* ── 固定姓名欄的 inline style（不用 Tailwind sticky） ── */
const NAME_COL_W = 110;

const frozenHeaderStyle = {
  position: 'sticky',
  left: 0,
  zIndex: 40,          // 最高：header + 凍結
  background: '#f9fafb',
  width: NAME_COL_W,
  minWidth: NAME_COL_W,
};

const frozenCellStyle = (bg) => ({
  position: 'sticky',
  left: 0,
  zIndex: 20,          // 高於一般 body cell
  background: bg,
  width: NAME_COL_W,
  minWidth: NAME_COL_W,
});

const dateHeaderStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 30,          // header 行，高於 body frozen
  width: 42,
  minWidth: 42,
};

function EmployeeRow({
  emp, days, getLeaveRecords, leaveTypes,
  highlightedEmployeeId, highlightedDate,
  setHighlightedEmployeeId, setHighlightedDate,
  currentEmployeeId, rangeMode, selectedEmployeeId, dateRange,
  handleCellClick, handleClearLeave, onDeleteRangeLeave, onCellClickInRangeMode,
  dragHandleProps, today,
}) {
  const isCurrentUser = currentEmployeeId && emp.id === currentEmployeeId;
  const bg = highlightedEmployeeId === emp.id ? '#fef3c7'  // amber-100
    : isCurrentUser ? '#fffbeb'  // amber-50
    : '#ffffff';

  return (
    <>
      <td
        onDoubleClick={() => {
          setHighlightedEmployeeId(highlightedEmployeeId === emp.id ? null : emp.id);
          setHighlightedDate(null);
        }}
        className="px-1 py-1 whitespace-nowrap border-r border-b border-gray-200 cursor-pointer select-none"
        style={frozenCellStyle(bg)}
      >
        <div className="flex items-center gap-0.5">
          {dragHandleProps && (
            <span {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none">
              <GripVertical className="w-3.5 h-3.5" />
            </span>
          )}
          <div className="leading-[1.1] min-w-0">
            <div className="text-[12px] sm:text-[13px] font-semibold text-gray-800 truncate">{emp.name}</div>
            {emp.english_name && (
              <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">{emp.english_name}</div>
            )}
          </div>
        </div>
      </td>
      {days.map((d, idx) => {
        const records = getLeaveRecords(emp.id, d.date);
        const isToday = d.date === today;
        return (
          <td key={idx} className={`p-0 border-r border-b border-gray-200 h-10 ${isToday ? 'bg-amber-50' : ''}`} style={{ width: 42, minWidth: 42 }}>
            <LeaveCell
              fullRecord={records.full}
              amRecord={records.AM}
              pmRecord={records.PM}
              leaveTypes={leaveTypes}
              isWeekend={d.isWeekend}
              isHoliday={d.isHoliday}
              isCurrentUser={isCurrentUser}
              isToday={isToday}
              rangeMode={rangeMode && selectedEmployeeId === emp.id}
              dateRange={dateRange}
              currentDate={d.date}
              isHighlighted={highlightedEmployeeId === emp.id || highlightedDate === d.date}
              onSelectLeave={() => handleCellClick(records, emp.id, d.date)}
              onClearLeave={handleClearLeave}
              onDoubleClickLeave={(record) => !rangeMode && onDeleteRangeLeave(record)}
              onRangeCellClick={() => rangeMode && onCellClickInRangeMode && onCellClickInRangeMode(emp.id, d.date)}
            />
          </td>
        );
      })}
    </>
  );
}

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
  onCellClickInRangeMode,
  onReorderEmployees,
}) {
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState(null);
  const [highlightedDate, setHighlightedDate] = useState(null);

  const selectedLeaveTypeIdRef = useRef(selectedLeaveTypeId);
  useEffect(() => {
    selectedLeaveTypeIdRef.current = selectedLeaveTypeId;
  }, [selectedLeaveTypeId]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const holidaySet = useMemo(() => buildHolidaySet(holidays), [holidays]);

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

  const leaveRecordMap = useMemo(() => buildLeaveRecordMap(leaveRecords), [leaveRecords]);

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

  const handleCellClick = useCellClickHandler({
    rangeMode,
    selectedLeaveTypeIdRef,
    onSingleClick: onUpdateLeave,
    onDoubleClick: onDeleteRangeLeave,
    onRangeClick: onCellClickInRangeMode,
  });

  const handleClearLeave = useCallback((recordId) => {
    if (!rangeMode) onDeleteLeave(recordId);
  }, [rangeMode, onDeleteLeave]);

  const scrollContainerRef = useRef(null);

  // Auto-scroll to today's column on mount / month change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const todayIdx = days.findIndex(d => d.date === today);
    if (todayIdx === -1) return;
    const ths = container.querySelectorAll('thead th');
    const todayTh = ths[todayIdx + 1];
    if (todayTh) {
      const scrollTarget = todayTh.offsetLeft - NAME_COL_W - 16;
      container.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [days, today]);

  const handleScroll = useCallback((e) => {
    const el = e.target;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    el.classList.toggle('scrolled-end', atEnd);
  }, []);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    if (onReorderEmployees) {
      onReorderEmployees(employeesToShow, result.source.index, result.destination.index);
    }
  }, [onReorderEmployees, employeesToShow]);

  const rowProps = {
    days, getLeaveRecords, leaveTypes,
    highlightedEmployeeId, highlightedDate,
    setHighlightedEmployeeId, setHighlightedDate,
    currentEmployeeId, rangeMode, selectedEmployeeId, dateRange,
    handleCellClick, handleClearLeave, onDeleteRangeLeave, onCellClickInRangeMode,
    today,
  };

  const tableWidth = days.length * 42 + NAME_COL_W;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
        <div
          className="w-full h-full overflow-auto scroll-hint"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <table
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              width: tableWidth,
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr>
                <th
                  className="px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  style={{ ...frozenHeaderStyle, top: 0 }}
                >
                  姓名
                </th>
                {days.map((d, idx) => {
                  const isToday = d.date === today;
                  return (
                    <th
                      key={idx}
                      onDoubleClick={() => {
                        setHighlightedDate(highlightedDate === d.date ? null : d.date);
                        setHighlightedEmployeeId(null);
                      }}
                      className={`px-0.5 py-0.5 text-center border-r border-b border-gray-200 h-9 cursor-pointer select-none shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${
                        isToday ? 'bg-amber-100' :
                        d.isHoliday || d.isWeekend ? 'bg-red-50 text-red-500' :
                        highlightedDate === d.date ? 'bg-amber-100' : 'text-gray-600'
                      }`}
                      style={{
                        ...dateHeaderStyle,
                        background: isToday ? '#fef3c7'
                          : (d.isHoliday || d.isWeekend) ? '#fef2f2'
                          : highlightedDate === d.date ? '#fef3c7'
                          : '#f9fafb',
                      }}
                    >
                      <div className={`text-[13px] font-medium ${isToday ? 'text-amber-700' : 'text-gray-800'}`}>{d.month ? `${d.month}/${d.day}` : d.day}</div>
                      <div className={`text-[10px] ${isToday ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>{isToday ? '今' : d.weekday}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <Droppable droppableId="employee-rows" type="EMPLOYEE">
              {(droppableProvided) => (
                <tbody ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                  {employeesToShow.map((emp, index) => (
                    <Draggable key={emp.id} draggableId={emp.id} index={index}>
                      {(draggableProvided, snapshot) => (
                        <tr
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className={`${highlightedEmployeeId === emp.id ? 'bg-blue-50' : 'hover:bg-gray-50/50'} ${snapshot.isDragging ? '!bg-blue-50 shadow-lg' : ''}`}
                        >
                          <EmployeeRow
                            emp={emp}
                            {...rowProps}
                            dragHandleProps={draggableProvided.dragHandleProps}
                          />
                        </tr>
                      )}
                    </Draggable>
                  ))}
                  <tr style={{ display: 'none' }}><td>{droppableProvided.placeholder}</td></tr>
                </tbody>
              )}
            </Droppable>
          </table>
        </div>
    </DragDropContext>
  );
}
