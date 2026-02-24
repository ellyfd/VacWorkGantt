import React, { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MonthPicker from './MonthPicker';

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

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      {/* 月份導航 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevMonth}
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
        className="text-xs"
      >
        今天
      </Button>


    </div>
  );
}