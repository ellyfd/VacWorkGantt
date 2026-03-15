import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { format, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Loader2, CalendarRange } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildHolidaySet, buildLeaveRecordMap } from '@/lib/leaveUtils';

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
  onLeaveTypeChange,
  rangeMode = false,
  dateRange = { from: undefined, to: undefined },
  onUpdateLeave,
  onDeleteLeave,
  onDeleteRangeLeave,
  onCellClickInRangeMode,
  onRangeModeToggle,
  onRangeModeCancel,
  onRangeSubmit,
  rangeLeavePending = false,
}) {
  const selectedLeaveTypeIdRef = useRef(selectedLeaveTypeId);
  useEffect(() => {
    selectedLeaveTypeIdRef.current = selectedLeaveTypeId;
  }, [selectedLeaveTypeId]);

  if (!currentEmployee || !currentDepartments || currentDepartments.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500">請先設定您的個人資料</p>
      </div>
    );
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const holidaySet = useMemo(() => buildHolidaySet(holidays), [holidays]);

  const allDays = useMemo(() => month === -1
    ? Array.from({ length: 365 }, (_, i) => {
        const date = new Date(year, 0, i + 1);
        const dayOfWeek = getDay(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        return { day: date.getDate(), month: date.getMonth() + 1, date: dateStr, weekday: WEEKDAY_NAMES[dayOfWeek], isWeekend: dayOfWeek === 0 || dayOfWeek === 6, isHoliday: holidaySet.has(dateStr), fullDate: date };
      })
    : Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => {
        const date = new Date(year, month, i + 1);
        const dayOfWeek = getDay(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        return { day: i + 1, month: month + 1, date: dateStr, weekday: WEEKDAY_NAMES[dayOfWeek], isWeekend: dayOfWeek === 0 || dayOfWeek === 6, isHoliday: holidaySet.has(dateStr), fullDate: date };
      }),
  [year, month, holidaySet]);

  const leaveRecordMap = useMemo(() => buildLeaveRecordMap(leaveRecords), [leaveRecords]);

  const getLeaveRecords = useCallback((employeeId, date) => {
    return leaveRecordMap.get(`${employeeId}_${date}`) || { full: null, AM: null, PM: null };
  }, [leaveRecordMap]);

  const clickTimerRef = useRef(null);

  const handleCellClick = useCallback((date, records) => {
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
        onCellClickInRangeMode(date);
      } else if (selectedLeaveTypeIdRef.current) {
        onUpdateLeave(currentEmployee.id, date, selectedLeaveTypeIdRef.current);
      }
    }, 250);
  }, [rangeMode, onCellClickInRangeMode, onUpdateLeave, onDeleteRangeLeave, currentEmployee?.id]);

  const handleClearLeave = useCallback((recordId) => {
    onDeleteLeave(recordId);
  }, [onDeleteLeave]);

  // 月份休假統計
  const leaveTypeMap = useMemo(() => new Map(leaveTypes.map(lt => [lt.id, lt])), [leaveTypes]);

  const monthlyLeaveStats = useMemo(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const statsMap = new Map();
    leaveRecords.forEach(record => {
      const recordDate = new Date(record.date);
      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        const leaveType = leaveTypeMap.get(record.leave_type_id);
        if (leaveType) {
          const existing = statsMap.get(leaveType.id);
          const increment = (record.period === 'AM' || record.period === 'PM') ? 0.5 : 1;
          if (existing) existing.count += increment;
          else statsMap.set(leaveType.id, { leaveTypeId: leaveType.id, name: leaveType.name, color: leaveType.color, count: increment });
        }
      }
    });
    return Array.from(statsMap.values());
  }, [leaveRecords, leaveTypeMap, currentDate]);

  // 按周分組
  const weeks = useMemo(() => {
    if (allDays.length === 0) return [];
    const result = [];
    const startDayOfWeek = getDay(allDays[0].fullDate);
    let currentWeek = Array(startDayOfWeek).fill(null);
    allDays.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push([...currentWeek]);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      result.push(currentWeek);
    }
    return result;
  }, [allDays]);

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        {/* 三區 Header */}
         <div className="hidden md:flex items-start justify-between gap-4 mb-3">
           {/* 左：姓名 */}
           <div>
             <h3 className="text-lg font-bold text-gray-800 leading-tight">
               {currentEmployee.name}
             </h3>
             {currentEmployee.english_name && (
               <div className="text-xs text-gray-500">
                 {currentEmployee.english_name}
               </div>
             )}
           </div>

           {/* 右：控制區（上下階梯） */}
           <div className="flex flex-col items-end gap-2">
             {/* 第一排：年月 */}
             <CalendarHeader currentDate={currentDate} onDateChange={onDateChange} />


           </div>
         </div>

        {/* 行動版姓名 + 控制 */}
        <div className="md:hidden flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-800">
            {currentEmployee.name}
            {currentEmployee.english_name && (
              <span className="ml-2 text-sm font-normal text-gray-600">{currentEmployee.english_name}</span>
            )}
          </h3>
          {onLeaveTypeChange && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Select
                value={selectedLeaveTypeId || ''}
                onValueChange={(value) => onLeaveTypeChange(value || null)}
                disabled={rangeMode}
              >
                <SelectTrigger className="h-7 text-xs w-[100px]">
                  <SelectValue placeholder="選擇假別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>不選擇</SelectItem>
                  {leaveTypes?.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)).map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!rangeMode ? (
                <Button
                  onClick={onRangeModeToggle}
                  className="bg-blue-600 hover:bg-blue-700 h-7 w-7"
                  size="icon"
                >
                  <CalendarRange className="h-4 w-4" />
                </Button>
              ) : (
                <Popover open={dateRange.from && dateRange.to}>
                  <PopoverTrigger asChild>
                    <Button
                      onClick={() => { if (!dateRange.from || !dateRange.to) onRangeModeCancel(); }}
                      variant="outline"
                      size="icon"
                      className={`h-7 w-7 ${dateRange.from && dateRange.to ? 'bg-green-50 border-green-500' : ''}`}
                    >
                      {dateRange.from && dateRange.to ? '✓' : '✕'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm">確認區間請假</h3>
                        <p className="text-sm text-gray-600 mt-1">{dateRange.from} 至 {dateRange.to}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={onRangeModeCancel} variant="outline" size="sm" className="flex-1">取消</Button>
                        <Button onClick={onRangeSubmit} disabled={rangeLeavePending} className="bg-blue-600 hover:bg-blue-700 flex-1" size="sm">
                          {rangeLeavePending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />處理中</> : '確定'}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>

        {/* 統計列 (手機) */}
        <div className="flex md:hidden flex-wrap gap-2 mb-3">
          {monthlyLeaveStats.length > 0 ? (
            monthlyLeaveStats.map((stat) => (
              <div key={stat.leaveTypeId} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                <span className="text-xs text-gray-600">{stat.name} {stat.count}天</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-gray-400">本月無休假</span>
          )}
        </div>

        {/* 統計 + 假別列 (桌機) */}
        <div className="hidden md:flex items-center justify-between gap-4 mb-3">
          {/* 左：統計 */}
          <div className="flex items-center gap-3 flex-wrap">
            {monthlyLeaveStats.length > 0 ? (
              monthlyLeaveStats.map((stat) => (
                <div key={stat.leaveTypeId} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {stat.name} {stat.count}天
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-gray-400">本月無休假</span>
            )}
          </div>

          {/* 右：假別 + 區間 */}
          {onLeaveTypeChange && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select
                value={selectedLeaveTypeId || ''}
                onValueChange={(value) => onLeaveTypeChange(value || null)}
                disabled={rangeMode}
              >
                <SelectTrigger className="h-9 text-sm w-[150px]">
                  <SelectValue placeholder="選擇假別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>不選擇</SelectItem>
                  {leaveTypes?.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)).map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!rangeMode ? (
                <Button
                  onClick={onRangeModeToggle}
                  className="bg-blue-600 hover:bg-blue-700 h-9 w-9"
                  size="icon"
                >
                  <CalendarRange className="h-4 w-4" />
                </Button>
              ) : (
                <Popover open={dateRange.from && dateRange.to}>
                  <PopoverTrigger asChild>
                    <Button
                      onClick={() => { if (!dateRange.from || !dateRange.to) onRangeModeCancel(); }}
                      variant="outline"
                      size="icon"
                      className={`h-9 w-9 ${dateRange.from && dateRange.to ? 'bg-green-50 border-green-500' : ''}`}
                    >
                      {dateRange.from && dateRange.to ? '✓' : '✕'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm">確認區間請假</h3>
                        <p className="text-sm text-gray-600 mt-1">{dateRange.from} 至 {dateRange.to}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={onRangeModeCancel} variant="outline" size="sm" className="flex-1">取消</Button>
                        <Button onClick={onRangeSubmit} disabled={rangeLeavePending} className="bg-blue-600 hover:bg-blue-700 flex-1" size="sm">
                          {rangeLeavePending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />處理中</> : '確定'}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>

        {/* Range 模式提示 */}
        {rangeMode && (
          <p className="text-xs text-blue-600 mb-3">
            {!dateRange.from && "📍 請在下方日曆點擊選擇起始日期"}
            {dateRange.from && !dateRange.to && `📍 已選開始：${dateRange.from} - 請選擇結束日期`}
            {dateRange.from && dateRange.to && `✓ 已選區間：${dateRange.from} 至 ${dateRange.to} - 點擊左側按鈕確認`}
          </p>
        )}
      </div>
      <div className="p-4 md:pt-0 md:px-4 md:pb-4">
        <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
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

          {weeks.map((week, weekIdx) =>
            week.map((day, dayIdx) => {
              if (!day) {
                return <div key={`${weekIdx}-${dayIdx}`} className="h-12 border-r border-b border-gray-200 bg-gray-50" />;
              }
              const records = getLeaveRecords(currentEmployee.id, day.date);
              const isToday = day.date === today;
              return (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className={`h-12 border-r border-b border-gray-200 relative ${isToday ? 'bg-blue-50/50' : ''}`}
                >
                  {isToday && <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none z-10" />}
                  <div className={`absolute top-1.5 left-1 text-[10px] font-semibold leading-none z-20 ${
                    isToday ? 'text-blue-600' : day.isHoliday || day.isWeekend ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    {day.day}
                  </div>
                  {isToday && <div className="absolute top-1.5 right-1 text-[8px] font-bold text-blue-600 leading-none z-20">今</div>}
                  <div className="w-full h-full flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-md overflow-hidden">
                      <LeaveCell
                        fullRecord={records.full}
                        amRecord={records.AM}
                        pmRecord={records.PM}
                        leaveTypes={leaveTypes}
                        isWeekend={day.isWeekend}
                        isHoliday={day.isHoliday}
                        rangeMode={rangeMode}
                        dateRange={dateRange}
                        currentDate={day.date}
                        onSelectLeave={() => handleCellClick(day.date, records)}
                        onClearLeave={(recordId) => handleClearLeave(recordId)}
                        onDoubleClickLeave={(rec) => !rangeMode && onDeleteRangeLeave(rec)}
                        onRangeCellClick={() => rangeMode && onCellClickInRangeMode && onCellClickInRangeMode(day.date)}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}