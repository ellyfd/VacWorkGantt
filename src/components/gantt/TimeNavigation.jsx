import React, { useState } from 'react';
import { format, addMonths, subMonths, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import MonthPicker from './MonthPicker';

const CELL_WIDTH = 40;

export default function TimeNavigation({
  centerDate,
  onCenterDateChange,
  onScrollToToday,
}) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const handlePrevMonth = () => {
    onCenterDateChange(subMonths(centerDate, 1));
  };

  const handleNextMonth = () => {
    onCenterDateChange(addMonths(centerDate, 1));
  };

  const handleMonthSelect = (date) => {
    onCenterDateChange(date);
    setShowMonthPicker(false);
  };

  // 週跳：前後各 7 天，同時補償 scrollLeft
  const handleJumpWeek = (direction) => {
    const newDate = addDays(centerDate, direction * 7);
    onCenterDateChange(newDate);
    
    // 補償水平捲動位置，讓畫面跟著跳
    setTimeout(() => {
      const el = document.querySelector('[data-gantt-scroll]');
      if (el) {
        el.scrollLeft += direction * 7 * CELL_WIDTH;
      }
    }, 50);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      {/* 月份導航 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevMonth}
          title="上個月"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="font-semibold text-lg min-w-[140px]"
          >
            {format(centerDate, 'yyyy年MM月')}
          </Button>
          {showMonthPicker && (
            <div className="absolute top-full left-0 z-50 mt-1">
              <MonthPicker
                currentDate={centerDate}
                onSelectDate={handleMonthSelect}
              />
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          title="下個月"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 今天按鈕 */}
      <Button
        variant="outline"
        size="sm"
        onClick={onScrollToToday}
        title="回到今天"
        className="text-xs"
      >
        今天
      </Button>
    </div>
  );
}