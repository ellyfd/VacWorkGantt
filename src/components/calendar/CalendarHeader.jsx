import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths } from "date-fns";

export default function CalendarHeader({ currentDate, onDateChange }) {
  const formatValue = (year, month) => {
    if (month === -1) {
      return `${year}`;
    }
    return `${year}/${month + 1}`;
  };

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
    <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={currentYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[80px] md:w-[85px] h-8 text-sm">
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
        <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[60px] md:w-[75px] h-8 text-sm">
            <SelectValue>
              <span className="md:hidden">{currentMonth + 1}</span>
              <span className="hidden md:inline">{currentMonth + 1}月</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
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
          onClick={handleNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
  );
  }