import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths } from "date-fns";

export default function CalendarHeader({ currentDate, onDateChange, departments, selectedDepartment, onDepartmentChange }) {
  const handlePrevMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handleYearChange = (year) => {
    const newDate = new Date(parseInt(year), currentMonth, 1);
    onDateChange(newDate);
  };

  const handleMonthChange = (month) => {
    const newDate = new Date(currentYear, parseInt(month), 1);
    onDateChange(newDate);
  };

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      <h1 className="text-2xl font-bold text-gray-800">
        排休登記表
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="選擇單位" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有單位</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={currentYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
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
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}