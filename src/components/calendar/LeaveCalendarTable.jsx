import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { format, getDaysInMonth, getDay } from "date-fns";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { buildHolidaySet, buildLeaveRecordMap } from '@/lib/leaveUtils';
import { useCellClickHandler } from '@/components/hooks/useCellClickHandler';

import LeaveCell from "./LeaveCell";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

/* ── Column widths ── */
const NAME_COL_W = 110;
const DAY_COL_W = 42;

/*
 * Layout strategy (robust — no position:sticky):
 *
 * ┌──────────────────────────────────────────────┐
 * │ Header table (non-scrolling, overflow:hidden) │  ← synced horizontally
 * ├──────────────────────────────────────────────┤
 * │ Body table   (overflow-x:auto, overflow-y:auto)│  ← user scrolls here
 * └──────────────────────────────────────────────┘
 *
 * - Name column in both header & body uses translateX(var(--sl)) to freeze.
 * - Scrolling the body sets --sl on the wrapper AND scrolls the header div.
 */

const frozenHeaderCellStyle = {
  position: 'relative',
  zIndex: 10,
  background: '#f9fafb',
  width: NAME_COL_W,
  minWidth: NAME_COL_W,
  transform: 'translateX(var(--sl, 0px))',
};

const frozenBodyCellStyle = (bg) => ({
  position: 'relative',
  zIndex: 10,
  background: bg,
  width: NAME_COL_W,
  minWidth: NAME_COL_W,
  transform: 'translateX(var(--sl, 0px))',
});

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
        style={frozenBodyCellStyle(bg)}
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
          <td key={idx} className={`p-0 border-r border-b border-gray-200 h-10 ${isToday ? 'bg-amber-50' : ''}`} style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}>
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

const tableStyle = {
  borderCollapse: 'separate',
  borderSpacing: 0,
  tableLayout: 'fixed',
};

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

  const bodyRef = useRef(null);

  const tableWidth = days.length * DAY_COL_W + NAME_COL_W;

  // Auto-scroll to today's column on mount / month change
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const todayIdx = days.findIndex(d => d.date === today);
    if (todayIdx === -1) return;
    const scrollTarget = Math.max(0, todayIdx * DAY_COL_W - 16);
    body.scrollLeft = scrollTarget;
    // Set --sl on wrapper (programmatic scrollLeft doesn't fire onScroll)
    const wrapper = body.closest('[data-table-wrapper]');
    if (wrapper) wrapper.style.setProperty('--sl', `${scrollTarget}px`);
  }, [days, today]);

  // Scroll handler: set --sl on the wrapper so BOTH header and body pick it up
  const handleBodyScroll = useCallback((e) => {
    const el = e.target;
    const sl = el.scrollLeft;
    // Set --sl on the shared wrapper — both header and body inherit it
    const wrapper = el.closest('[data-table-wrapper]');
    if (wrapper) wrapper.style.setProperty('--sl', `${sl}px`);
    // Update fade indicator
    const atEnd = sl + el.clientWidth >= el.scrollWidth - 8;
    const fade = wrapper?.querySelector('.scroll-fade');
    if (fade) fade.style.opacity = atEnd ? '0' : '1';
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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="relative w-full flex-1 min-h-0 flex flex-col" data-table-wrapper style={{ '--sl': '0px' }}>
        {/* ── Fixed header (never scrolls vertically) ── */}
        <div
          className="flex-shrink-0 overflow-hidden"
        >
          {/* Table uses translateX(-sl) to simulate horizontal scroll;
              name cell uses translateX(+sl) to cancel and stay frozen. */}
          <table style={{ ...tableStyle, width: tableWidth, transform: 'translateX(calc(-1 * var(--sl, 0px)))' }}>
            <thead>
              <tr>
                <th
                  className="px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r border-b border-gray-200 whitespace-nowrap shadow-[2px_1px_3px_rgba(0,0,0,0.08)]"
                  style={frozenHeaderCellStyle}
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
                        width: DAY_COL_W,
                        minWidth: DAY_COL_W,
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
          </table>
        </div>

        {/* ── Scrollable body ── */}
        <div
          ref={bodyRef}
          className="flex-1 min-h-0 overflow-auto"
          onScroll={handleBodyScroll}
        >
          <table style={{ ...tableStyle, width: tableWidth }}>
            <tbody>
              {/* Invisible colgroup-like first row to lock column widths */}
              <tr className="h-0" aria-hidden="true" style={{ visibility: 'collapse' }}>
                <td style={{ width: NAME_COL_W, minWidth: NAME_COL_W, padding: 0, border: 'none' }} />
                {days.map((_, idx) => (
                  <td key={idx} style={{ width: DAY_COL_W, minWidth: DAY_COL_W, padding: 0, border: 'none' }} />
                ))}
              </tr>
            </tbody>
            <Droppable droppableId="employee-rows" type="EMPLOYEE">
              {(droppableProvided) => (
                <tbody ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                  {employeesToShow.map((emp, index) => (
                    <Draggable key={emp.id} draggableId={emp.id} index={index}>
                      {(draggableProvided, snapshot) => {
                        const draggableStyle = snapshot.isDragging
                          ? draggableProvided.draggableProps.style
                          : { ...draggableProvided.draggableProps.style, transform: 'none' };
                        return (
                        <tr
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          style={draggableStyle}
                          className={`${highlightedEmployeeId === emp.id ? 'bg-blue-50' : 'hover:bg-gray-50/50'} ${snapshot.isDragging ? '!bg-blue-50 shadow-lg' : ''}`}
                        >
                          <EmployeeRow
                            emp={emp}
                            {...rowProps}
                            dragHandleProps={draggableProvided.dragHandleProps}
                          />
                        </tr>
                        );
                      }}
                    </Draggable>
                  ))}
                  {droppableProvided.placeholder}
                </tbody>
              )}
            </Droppable>
          </table>
        </div>

        {/* Right-edge fade overlay */}
        <div className="absolute top-0 right-0 bottom-0 w-6 pointer-events-none bg-gradient-to-r from-transparent to-black/[0.06] z-10 transition-opacity scroll-fade" />
      </div>
    </DragDropContext>
  );
}
