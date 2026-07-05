import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { format, getDaysInMonth, getDay } from "date-fns";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, ArrowUpDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { buildHolidaySet, buildLeaveRecordMap } from '@/lib/leaveUtils';
import { useCellClickHandler } from '@/components/hooks/useCellClickHandler';
import LeaveCell from "./LeaveCell";

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

/* ── Dimensions ── */
const NAME_COL_W = 70;
const HEADER_H = 44;
const ROW_H = 40;
// 年檢視欄位收窄以塞進最多資料，月檢視維持較寬易讀
const DAY_COL_W_MONTH = 42;
const DAY_COL_W_YEAR = 28;

export default function LeaveCalendarTable({
  currentDate,
  viewMode = 'month',
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
  const [reorderOpen, setReorderOpen] = useState(false);

  const selectedLeaveTypeIdRef = useRef(selectedLeaveTypeId);
  useEffect(() => {
    selectedLeaveTypeIdRef.current = selectedLeaveTypeId;
  }, [selectedLeaveTypeId]);

  const isYear = viewMode === 'year';
  const DAY_COL_W = isYear ? DAY_COL_W_YEAR : DAY_COL_W_MONTH;

  const today = format(new Date(), 'yyyy-MM-dd');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const holidaySet = useMemo(() => buildHolidaySet(holidays), [holidays]);

  const days = useMemo(() => {
    if (isYear) {
      // 整年：從 1/1 到 12/31（自動處理平閏年）
      const result = [];
      const cursor = new Date(year, 0, 1);
      while (cursor.getFullYear() === year) {
        const dayOfWeek = getDay(cursor);
        const dateStr = format(cursor, 'yyyy-MM-dd');
        result.push({
          day: cursor.getDate(),
          month: cursor.getMonth() + 1,
          date: dateStr,
          weekday: WEEKDAY_NAMES[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isHoliday: holidaySet.has(dateStr),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return result;
    }
    return Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dayOfWeek = getDay(date);
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        day: i + 1,
        date: dateStr,
        weekday: WEEKDAY_NAMES[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isHoliday: holidaySet.has(dateStr),
      };
    });
  }, [isYear, year, month, currentDate, holidaySet]);

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

  // 排序改由獨立底部面板處理（純垂直清單，無 sticky／無橫向捲動），
  // 徹底避免「拖曳 + sticky + 捲動」三者在觸控下互相干擾造成的撕裂。
  const handleDragEnd = useCallback((result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    if (onReorderEmployees) {
      onReorderEmployees(employeesToShow, result.source.index, result.destination.index);
    }
  }, [onReorderEmployees, employeesToShow]);

  /* ── 單一捲動容器（姓名格 sticky 固定於左，資料橫向捲動；表格本身不含任何 dnd）── */
  const scrollRef = useRef(null);

  // Auto-scroll to today（水平置中）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const todayIdx = days.findIndex(d => d.date === today);
    if (todayIdx === -1) return;
    const target = NAME_COL_W + todayIdx * DAY_COL_W - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }, [days, today, DAY_COL_W]);

  const dataWidth = days.length * DAY_COL_W;
  const totalWidth = NAME_COL_W + dataWidth;

  const renderDateHeaders = () => days.map((d, idx) => {
    const isToday = d.date === today;
    return (
      <div
        key={idx}
        onDoubleClick={() => {
          setHighlightedDate(highlightedDate === d.date ? null : d.date);
          setHighlightedEmployeeId(null);
        }}
        className="flex flex-col items-center justify-center border-r border-gray-200 cursor-pointer select-none"
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
        <div className={`text-[11px] md:text-[13px] font-medium leading-tight ${isToday ? 'text-amber-700' : (d.isHoliday || d.isWeekend) ? 'text-red-500' : 'text-gray-800'}`}>
          {d.month ? `${d.month}/${d.day}` : d.day}
        </div>
        <div className={`text-[10px] leading-tight ${isToday ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>
          {isToday ? '今' : d.weekday}
        </div>
      </div>
    );
  });

  return (
    <>
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto bg-white"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <div style={{ width: totalWidth, position: 'relative' }}>
          {/* ═══ Header row (sticky top) ═══ */}
          <div className="flex sticky top-0" style={{ height: HEADER_H, zIndex: 20 }}>
            {/* corner: 姓名 + 排序按鈕 (sticky left) */}
            <div
              className="sticky left-0 bg-gray-50 border-r border-b border-gray-200 flex items-center gap-1 px-2"
              style={{
                width: NAME_COL_W,
                minWidth: NAME_COL_W,
                height: HEADER_H,
                zIndex: 30,
                boxShadow: '2px 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <span className="text-xs font-semibold text-gray-600">姓名</span>
              <button
                type="button"
                onClick={() => setReorderOpen(true)}
                className="ml-auto text-gray-400 hover:text-blue-600 active:text-blue-700 flex-shrink-0"
                aria-label="調整姓名順序"
                title="調整姓名順序"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex border-b border-gray-200">
              {renderDateHeaders()}
            </div>
          </div>

          {/* ═══ Employee rows（純資料列，無 dnd） ═══ */}
          <div>
            {employeesToShow.map((emp) => {
              const isCurrentUser = currentEmployeeId && emp.id === currentEmployeeId;
              const rowHighlighted = highlightedEmployeeId === emp.id;
              const nameBg = rowHighlighted ? '#fef3c7' : isCurrentUser ? '#fffbeb' : '#ffffff';

              return (
                <div key={emp.id} className="flex" style={{ height: ROW_H }}>
                  {/* 姓名格 (sticky left) */}
                  <div
                    className="sticky left-0 flex items-center px-2 border-r border-b border-gray-200"
                    style={{
                      width: NAME_COL_W,
                      minWidth: NAME_COL_W,
                      height: ROW_H,
                      zIndex: 10,
                      background: nameBg,
                      boxShadow: '2px 0 3px rgba(0,0,0,0.06)',
                    }}
                    onDoubleClick={() => {
                      setHighlightedEmployeeId(rowHighlighted ? null : emp.id);
                      setHighlightedDate(null);
                    }}
                  >
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

                  {/* 資料格 */}
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
                          compact={isYear}
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

      {/* ═══ 排序面板：純垂直拖曳清單，不會撕裂 ═══ */}
      <Sheet open={reorderOpen} onOpenChange={setReorderOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left">調整姓名順序</SheetTitle>
          </SheetHeader>
          <p className="text-xs text-gray-500 mb-3">長按並拖曳左側握把即可調整順序，變更會立即套用。</p>
          <div className="overflow-y-auto pb-6" style={{ maxHeight: '60vh' }}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="reorder-list" type="EMPLOYEE">
                {(droppableProvided) => (
                  <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                    {employeesToShow.map((emp, index) => (
                      <Draggable key={emp.id} draggableId={emp.id} index={index}>
                        {(draggableProvided, snapshot) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            className={`flex items-center gap-2 px-3 py-2.5 mb-1.5 rounded-lg border ${
                              snapshot.isDragging ? 'bg-blue-50 border-blue-300 shadow-lg' : 'bg-white border-gray-200'
                            }`}
                            style={{ ...draggableProvided.draggableProps.style }}
                          >
                            <span
                              {...draggableProvided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0 touch-none"
                            >
                              <GripVertical className="w-5 h-5" />
                            </span>
                            <span className="text-sm font-semibold text-gray-800">{emp.name}</span>
                            {emp.english_name && (
                              <span className="text-xs text-gray-400">{emp.english_name.split(' ')[0]}</span>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {droppableProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
