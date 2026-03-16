import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { format, getDaysInMonth, getDay } from "date-fns";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { buildHolidaySet, buildLeaveRecordMap } from '@/lib/leaveUtils';
import { useCellClickHandler } from '@/components/hooks/useCellClickHandler';
import LeaveCell from "./LeaveCell";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

/* ── Dimensions ── */
const NAME_COL_W = 70;
const DAY_COL_W = 42;
const HEADER_H = 44;
const ROW_H = 40;

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

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    if (onReorderEmployees) {
      onReorderEmployees(employeesToShow, result.source.index, result.destination.index);
    }
  }, [onReorderEmployees, employeesToShow]);

  /* ── Scroll sync refs ── */
  const headerScrollRef = useRef(null);
  const namesScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const isSyncing = useRef(false);

  const syncFromBody = useCallback(() => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const body = bodyScrollRef.current;
    if (body) {
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = body.scrollLeft;
      if (namesScrollRef.current) namesScrollRef.current.scrollTop = body.scrollTop;
    }
    isSyncing.current = false;
  }, []);

  // Auto-scroll to today
  useEffect(() => {
    const body = bodyScrollRef.current;
    if (!body) return;
    const todayIdx = days.findIndex(d => d.date === today);
    if (todayIdx === -1) return;
    body.scrollLeft = Math.max(0, todayIdx * DAY_COL_W - 16);
    syncFromBody();
  }, [days, today, syncFromBody]);

  const dataWidth = days.length * DAY_COL_W;

  return (
    <div
      className="absolute inset-0"
      style={{
        display: 'grid',
        gridTemplateColumns: `${NAME_COL_W}px 1fr`,
        gridTemplateRows: `${HEADER_H}px 1fr`,
      }}
    >
      {/* ═══ Top-left corner: 姓名 ═══ */}
      <div
        className="bg-gray-50 border-r border-b border-gray-200 flex items-center px-2 shadow-[2px_1px_3px_rgba(0,0,0,0.08)]"
        style={{ zIndex: 30 }}
      >
        <span className="text-xs font-semibold text-gray-600">姓名</span>
      </div>

      {/* ═══ Top-right: date headers (synced horizontal scroll) ═══ */}
      <div
        ref={headerScrollRef}
        className="overflow-hidden border-b border-gray-200 bg-gray-50"
        style={{ zIndex: 20 }}
      >
        <div className="flex" style={{ width: dataWidth }}>
          {days.map((d, idx) => {
            const isToday = d.date === today;
            return (
              <div
                key={idx}
                onDoubleClick={() => {
                  setHighlightedDate(highlightedDate === d.date ? null : d.date);
                  setHighlightedEmployeeId(null);
                }}
                className={`flex flex-col items-center justify-center border-r border-gray-200 cursor-pointer select-none ${
                  isToday ? 'bg-amber-100' :
                  d.isHoliday || d.isWeekend ? 'bg-red-50 text-red-500' :
                  highlightedDate === d.date ? 'bg-amber-100' : 'text-gray-600'
                }`}
                style={{
                  width: DAY_COL_W,
                  minWidth: DAY_COL_W,
                  height: HEADER_H,
                  background: isToday ? '#fef3c7'
                    : (d.isHoliday || d.isWeekend) ? '#fef2f2'
                    : highlightedDate === d.date ? '#fef3c7'
                    : '#f9fafb',
                }}
              >
                <div className={`text-[13px] font-medium ${isToday ? 'text-amber-700' : 'text-gray-800'}`}>
                  {d.month ? `${d.month}/${d.day}` : d.day}
                </div>
                <div className={`text-[10px] ${isToday ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>
                  {isToday ? '今' : d.weekday}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Bottom-left: name column with drag-and-drop (synced vertical scroll) ═══ */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="employee-rows" type="EMPLOYEE">
          {(droppableProvided) => (
            <div
              ref={(el) => {
                namesScrollRef.current = el;
                droppableProvided.innerRef(el);
              }}
              className="overflow-hidden border-r border-gray-200 bg-white shadow-[2px_0_3px_rgba(0,0,0,0.06)]"
              style={{ zIndex: 10 }}
              {...droppableProvided.droppableProps}
            >
              {employeesToShow.map((emp, index) => {
                const isCurrentUser = currentEmployeeId && emp.id === currentEmployeeId;
                const bg = highlightedEmployeeId === emp.id ? '#fef3c7'
                  : isCurrentUser ? '#fffbeb'
                  : '#ffffff';

                return (
                  <Draggable key={emp.id} draggableId={emp.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        style={{
                          height: ROW_H,
                          background: snapshot.isDragging ? '#eff6ff' : bg,
                          ...draggableProvided.draggableProps.style,
                        }}
                        className={`flex items-center gap-0.5 px-1 border-b border-gray-200 ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        }`}
                        onDoubleClick={() => {
                          setHighlightedEmployeeId(highlightedEmployeeId === emp.id ? null : emp.id);
                          setHighlightedDate(null);
                        }}
                      >
                        <span
                          {...draggableProvided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        <div className="leading-[1.1] min-w-0">
                          <div className="text-[12px] sm:text-[13px] font-semibold text-gray-800 truncate">
                            {emp.name}
                          </div>
                          {emp.english_name && (
                            <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">
                              {emp.english_name.split(' ')[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* ═══ Bottom-right: data cells (scrollable both axes) ═══ */}
      <div
        ref={bodyScrollRef}
        className="overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={syncFromBody}
      >
        <div style={{ width: dataWidth }}>
          {employeesToShow.map((emp) => {
            const isCurrentUser = currentEmployeeId && emp.id === currentEmployeeId;
            const rowHighlighted = highlightedEmployeeId === emp.id;

            return (
              <div
                key={emp.id}
                className="flex"
                style={{
                  height: ROW_H,
                  background: rowHighlighted ? '#fef3c7' : isCurrentUser ? '#fffbeb' : undefined,
                }}
              >
                {days.map((d, idx) => {
                  const records = getLeaveRecords(emp.id, d.date);
                  const isToday = d.date === today;
                  return (
                    <div
                      key={idx}
                      className={`border-r border-b border-gray-200 ${isToday ? 'bg-amber-50' : ''}`}
                      style={{ width: DAY_COL_W, minWidth: DAY_COL_W, height: ROW_H }}
                    >
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
                        isHighlighted={rowHighlighted || highlightedDate === d.date}
                        onSelectLeave={() => handleCellClick(records, emp.id, d.date)}
                        onClearLeave={handleClearLeave}
                        onDoubleClickLeave={(record) => !rangeMode && onDeleteRangeLeave(record)}
                        onRangeCellClick={() => rangeMode && onCellClickInRangeMode && onCellClickInRangeMode(emp.id, d.date)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
