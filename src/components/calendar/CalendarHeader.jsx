import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths } from "date-fns";

export default function CalendarHeader({ currentDate, onDateChange }) {
  const handlePrevMonth = () => {
    const currentMonth = currentDate.getMonth();
    if (currentMonth === -1) {
      onDateChange(new Date(currentDate.getFullYear() - 1, -1, 1));
    } else {
      onDateChange(subMonths(currentDate, 1));
    }
  };

  const handleNextMonth = () => {
    const currentMonth = currentDate.getMonth();
    if (currentMonth === -1) {
      onDateChange(new Date(currentDate.getFullYear() + 1, -1, 1));
    } else {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handleYearChange = (year) => {
    const newDate = new Date(parseInt(year), currentMonth === -1 ? -1 : currentMonth, 1);
    onDateChange(newDate);
  };

  const handleMonthChange = (month) => {
    const newDate = new Date(currentYear, parseInt(month), 1);
    onDateChange(newDate);
  };

  const years = [2025, 2026, 2027];
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevMonth}
          className="h-7 w-7"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Select value={currentYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[70px] h-7 text-xs">
            <SelectValue>{currentYear}年</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[65px] h-7 text-xs">
            <SelectValue>{currentMonth === -1 ? '全年' : `${currentMonth + 1}月`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-1">全年</SelectItem>
            {months.map((month) => (
              <SelectItem key={month} value={month.toString()}>{month + 1}月</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-7 w-7"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
  );
  }