import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths, addDays, subDays } from "date-fns";

export default function CalendarHeader({ currentDate, onDateChange, showDaySelector = false }) {
  const formatValue = (year, month) => {
    if (month === -1) {
      return `${year}`;
    }
    return `${year}/${month + 1}`;
  };

  const handlePrev = () => {
    if (showDaySelector) {
      onDateChange(subDays(currentDate, 1));
    } else {
      const currentMonth = currentDate.getMonth();
      if (currentMonth === -1) {
        onDateChange(new Date(currentDate.getFullYear() - 1, -1, 1));
      } else {
        onDateChange(subMonths(currentDate, 1));
      }
    }
  };

  const handleNext = () => {
    if (showDaySelector) {
      onDateChange(addDays(currentDate, 1));
    } else {
      const currentMonth = currentDate.getMonth();
      if (currentMonth === -1) {
        onDateChange(new Date(currentDate.getFullYear() + 1, -1, 1));
      } else {
        onDateChange(addMonths(currentDate, 1));
      }
    }
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  const handleYearChange = (year) => {
    const newDate = new Date(parseInt(year), currentMonth === -1 ? -1 : currentMonth, showDaySelector ? currentDay : 1);
    onDateChange(newDate);
  };

  const handleMonthChange = (month) => {
    const newDate = new Date(currentYear, parseInt(month), showDaySelector ? currentDay : 1);
    onDateChange(newDate);
  };

  const handleDayChange = (day) => {
    const newDate = new Date(currentYear, currentMonth, parseInt(day));
    onDateChange(newDate);
  };

  const years = [2025, 2026, 2027];
  const months = Array.from({ length: 12 }, (_, i) => i);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
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
              <span className="md:hidden">{currentMonth === -1 ? '全年' : currentMonth + 1}</span>
              <span className="hidden md:inline">{currentMonth === -1 ? '全年' : `${currentMonth + 1}月`}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {!showDaySelector && <SelectItem value="-1">全年</SelectItem>}
            {months.map((month) => (
              <SelectItem key={month} value={month.toString()}>
                <span className="md:hidden">{month + 1}</span>
                <span className="hidden md:inline">{month + 1}月</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showDaySelector && (
          <Select value={currentDay.toString()} onValueChange={handleDayChange}>
            <SelectTrigger className="w-[60px] md:w-[70px] h-8 text-sm">
              <SelectValue>
                <span className="md:hidden">{currentDay}</span>
                <span className="hidden md:inline">{currentDay}日</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  <span className="md:hidden">{day}</span>
                  <span className="hidden md:inline">{day}日</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
  );
  }