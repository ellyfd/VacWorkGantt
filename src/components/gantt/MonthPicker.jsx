import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function MonthPicker({ centerDate, onDateChange }) {
  const [year, setYear] = React.useState(centerDate.getFullYear());

  const handleMonthSelect = (monthIdx) => {
    const newDate = new Date(year, monthIdx, 1);
    onDateChange(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="min-w-[140px] px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-100 rounded transition-colors">
          {format(centerDate, 'yyyy年MM月')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          {/* Year Selector */}
          <div className="flex items-center justify-between">
            <button onClick={() => setYear(y => y - 1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">{year}年</span>
            <button onClick={() => setYear(y => y + 1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((monthLabel, idx) => (
              <button
                key={idx}
                onClick={() => handleMonthSelect(idx)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  centerDate.getFullYear() === year && centerDate.getMonth() === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {monthLabel}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}