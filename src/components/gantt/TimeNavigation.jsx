import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function TimeNavigation({ centerDate, onCenterDateChange, scrollToToday, viewMode, onViewModeChange }) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const handlePrevMonth = () => onCenterDateChange(subMonths(centerDate, 1));
  const handleNextMonth = () => onCenterDateChange(addMonths(centerDate, 1));

  const handleSelectMonth = (month) => {
    const newDate = new Date(centerDate.getFullYear(), month, 1);
    onCenterDateChange(newDate);
    setShowMonthPicker(false);
  };

  const currentMonth = centerDate.getMonth();
  const currentYear = centerDate.getFullYear();
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-3">
      {/* 左側：月份快速導航 + 今天按鈕 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handlePrevMonth}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Popover open={showMonthPicker} onOpenChange={setShowMonthPicker}>
          <PopoverTrigger asChild>
            <button className="font-semibold text-base min-w-[120px] text-center px-3 py-1.5 hover:bg-gray-100 rounded transition-colors">
              {format(centerDate, 'yyyy年MM月')}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" align="start">
            <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center justify-between">
              <span>{currentYear} 年</span>
              <div className="flex gap-1">
                <button
                  onClick={() => onCenterDateChange(new Date(currentYear - 1, currentMonth, 1))}
                  className="px-1.5 py-0.5 hover:bg-gray-200 rounded text-xs"
                >
                  ←
                </button>
                <button
                  onClick={() => onCenterDateChange(new Date(currentYear + 1, currentMonth, 1))}
                  className="px-1.5 py-0.5 hover:bg-gray-200 rounded text-xs"
                >
                  →
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {months.map((month, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectMonth(idx)}
                  className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                    idx === currentMonth
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleNextMonth}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={scrollToToday}
        >
          <Calendar className="w-3.5 h-3.5" />
          今天
        </Button>
      </div>

      {/* 右側：月/季切換 */}
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        {[
          { value: 'month', label: '月' },
          { value: 'quarter', label: '季' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onViewModeChange(value)}
            className={`px-3 py-1.5 text-xs font-medium border-r border-gray-200 last:border-0 transition-colors ${
              viewMode === value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}