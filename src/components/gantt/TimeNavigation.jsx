import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['01月','02月','03月','04月','05月','06月','07月','08月','09月','10月','11月','12月'];

export default function TimeNavigation({ centerDate, onCenterDateChange, onScrollToToday }) {
  const [open, setOpen] = useState(false);
  // 選取器內部顯示的年份（與 centerDate 同步，但可獨立切換）
  const [pickerYear, setPickerYear] = useState(centerDate.getFullYear());

  const handleOpen = (isOpen) => {
    if (isOpen) setPickerYear(centerDate.getFullYear());
    setOpen(isOpen);
  };

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    onCenterDateChange(newDate);
    setOpen(false);
  };

  const selectedYear = centerDate.getFullYear();
  const selectedMonth = centerDate.getMonth();

  return (
    <div className="flex items-center gap-2">
      {/* 上一個月 */}
      <button
        onClick={() => onCenterDateChange(subMonths(centerDate, 1))}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* 年月顯示 → 點開選取器 */}
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button className="min-w-[110px] text-center font-semibold text-gray-800 px-3 py-1.5 rounded hover:bg-gray-100 transition-colors">
            {format(centerDate, 'yyyy年MM月')}
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-3" align="start">
          {/* 年份列 */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPickerYear(y => y - 1)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-gray-800">{pickerYear}年</span>
            <button
              onClick={() => setPickerYear(y => y + 1)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 月份格 */}
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((label, idx) => {
              const isSelected = pickerYear === selectedYear && idx === selectedMonth;
              return (
                <button
                  key={idx}
                  onClick={() => handleMonthSelect(idx)}
                  className={`py-1.5 rounded text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* 下一個月 */}
      <button
        onClick={() => onCenterDateChange(addMonths(centerDate, 1))}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* 今天 */}
      <Button variant="outline" size="sm" onClick={onScrollToToday}>
        今天
      </Button>
    </div>
  );
}