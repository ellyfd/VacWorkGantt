import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import MonthPicker from './MonthPicker';

export default function TimeNavigation({
  centerDate,
  onCenterDateChange,
  viewMode,
  onViewModeChange,
  onScrollToToday,
}) {
  const goToPrevMonth = () => onCenterDateChange(subMonths(centerDate, 1));
  const goToNextMonth = () => onCenterDateChange(addMonths(centerDate, 1));

  const VIEW_CONFIG = {
    month:   { label: '月' },
    quarter: { label: '季' },
  };

  return (
    <div className="flex items-center justify-between gap-4 pb-3 border-b border-gray-200">
      {/* 左側：月份導航 */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="上一月"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        
        <MonthPicker centerDate={centerDate} onDateChange={onCenterDateChange} />
        
        <button
          onClick={goToNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="下一月"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={onScrollToToday}
          className="ml-2 text-xs"
        >
          今天
        </Button>
      </div>

      {/* 右側：月/季切換 */}
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        {Object.entries(VIEW_CONFIG).map(([mode, cfg]) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-3 py-1.5 text-xs font-medium border-r border-gray-200 last:border-0 transition-colors ${
              viewMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>
    </div>
  );
}