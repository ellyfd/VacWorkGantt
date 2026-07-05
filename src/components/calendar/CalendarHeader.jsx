import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths } from "date-fns";

// 兩種使用模式：
// 1. 受控 viewMode（傳入 onViewModeChange）：'month' | 'year'，日期永遠是真實 Date。
//    「全部排休」使用此模式，年檢視才能正確運作。
// 2. 傳統模式（未傳 onViewModeChange）：沿用舊行為，以 currentDate.getMonth() === -1 代表全年，
//    維持其他頁面（我的排休、報表）既有行為不變。
export default function CalendarHeader({ currentDate, viewMode, onDateChange, onViewModeChange }) {
  const controlled = typeof onViewModeChange === 'function';
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const isYear = controlled ? viewMode === 'year' : currentMonth === -1;

  const handlePrev = () => {
    if (isYear) {
      onDateChange(controlled ? new Date(currentYear - 1, 0, 1) : new Date(currentYear - 1, -1, 1));
    } else {
      onDateChange(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (isYear) {
      onDateChange(controlled ? new Date(currentYear + 1, 0, 1) : new Date(currentYear + 1, -1, 1));
    } else {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const handleYearChange = (year) => {
    const y = parseInt(year);
    onDateChange(new Date(y, isYear ? (controlled ? 0 : -1) : currentMonth, 1));
  };

  const handleMonthChange = (value) => {
    if (controlled) {
      if (value === 'year') {
        onViewModeChange('year');
      } else {
        onViewModeChange('month');
        onDateChange(new Date(currentYear, parseInt(value), 1));
      }
    } else {
      // 傳統模式：'-1' 即全年 sentinel
      onDateChange(new Date(currentYear, parseInt(value), 1));
    }
  };

  const yearOptionValue = controlled ? 'year' : '-1';
  const monthSelectValue = isYear ? yearOptionValue : currentMonth.toString();

  const years = [2025, 2026, 2027];
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrev}
        className="h-10 w-10 md:h-8 md:w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Select value={currentYear.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[80px] md:w-[85px] h-10 md:h-8 text-sm">
          <SelectValue>
            <span className="md:hidden">{currentYear}</span>
            <span className="hidden md:inline">{currentYear}年</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              <span className="md:hidden">{year}</span>
              <span className="hidden md:inline">{year}年</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={monthSelectValue} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[64px] md:w-[80px] h-10 md:h-8 text-sm">
          <SelectValue>
            <span className="md:hidden">{isYear ? '全年' : currentMonth + 1}</span>
            <span className="hidden md:inline">{isYear ? '全年' : `${currentMonth + 1}月`}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={yearOptionValue}>全年</SelectItem>
          {months.map((month) => (
            <SelectItem key={month} value={month.toString()}>
              <span className="md:hidden">{month + 1}</span>
              <span className="hidden md:inline">{month + 1}月</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        className="h-10 w-10 md:h-8 md:w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
