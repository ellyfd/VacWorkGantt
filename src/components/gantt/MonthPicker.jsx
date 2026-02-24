import React from 'react';
import { format, setMonth, setYear } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function MonthPicker({ currentDate, onSelectDate }) {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const months = [
    '01月', '02月', '03月', '04月', '05月', '06月',
    '07月', '08月', '09月', '10月', '11月', '12月',
  ];

  const handleMonthClick = (monthIndex) => {
    const newDate = setMonth(setYear(currentDate, currentYear), monthIndex);
    onSelectDate(newDate);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-56">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 text-center">{currentYear}年</h3>
      <div className="grid grid-cols-3 gap-2">
        {months.map((month, idx) => (
          <Button
            key={idx}
            variant={idx === currentMonth ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleMonthClick(idx)}
            className={`text-xs h-8 ${
              idx === currentMonth ? 'bg-blue-600 text-white' : ''
            }`}
          >
            {month}
          </Button>
        ))}
      </div>
    </div>
  );
}